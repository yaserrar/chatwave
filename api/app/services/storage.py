"""
Everything that touches S3 lives here. The rest of the app calls these functions and never imports boto3,
so switching provider later (MinIO, R2...) only changes this file.

boto3 is blocking code: from async code, call these through a thread, e.g.
    await asyncio.to_thread(storage.upload_file, key, content, content_type)
"""
import uuid
from functools import lru_cache
from urllib.parse import quote

import boto3
from botocore.config import Config

from app.core.config import get_settings

# Markdown and text are served as plain UTF-8 text, so browsers show them (instead of downloading .md files)
# and accents are decoded correctly
TEXT_CONTENT_TYPE = "text/plain; charset=utf-8"
TEXT_EXTENSIONS = {".md", ".txt"}


@lru_cache
def _client():
    settings = get_settings()
    if not settings.s3_bucket:
        raise ValueError("S3 is not configured. Set S3_BUCKET in api/.env.")
    if bool(settings.aws_access_key_id) != bool(settings.aws_secret_access_key):
        raise ValueError("Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or neither to use an IAM role.")
    # Without keys, boto3 falls back to its default chain (the EC2 instance's IAM role).
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
        # Presigned links must point at the bucket's own region (bucket.s3.eu-west-3.amazonaws.com).
        # The global address (bucket.s3.amazonaws.com) is treated as us-east-1 and rejects the signature.
        endpoint_url=f"https://s3.{settings.aws_region}.amazonaws.com",
        # eu-west-3 only accepts signature v4; "virtual" puts the bucket in the host name
        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
    )


def _bucket() -> str:
    return get_settings().s3_bucket  # type: ignore[return-value]  (checked in _client)


def document_key(project_id: uuid.UUID, document_id: uuid.UUID, ext: str) -> str:
    """Where a document lives in the bucket. One "folder" per project, so a project is deleted in one go."""
    return f"projects/{project_id}/{document_id}{ext}"


def project_prefix(project_id: uuid.UUID) -> str:
    return f"projects/{project_id}/"


def content_type_for(ext: str, mime_type: str | None) -> str:
    """The Content-Type to store and serve a file with."""
    if ext.lower() in TEXT_EXTENSIONS:
        return TEXT_CONTENT_TYPE
    return mime_type or "application/octet-stream"


def upload_file(key: str, content: bytes, content_type: str) -> None:
    _client().put_object(Bucket=_bucket(), Key=key, Body=content, ContentType=content_type)


def download_file(key: str) -> bytes:
    response = _client().get_object(Bucket=_bucket(), Key=key)
    return response["Body"].read()


def delete_file(key: str) -> None:
    # S3 does not complain if the key does not exist, so deleting twice is fine
    _client().delete_object(Bucket=_bucket(), Key=key)


def delete_folder(prefix: str) -> int:
    """Deletes every file whose key starts with `prefix` (e.g. a whole project). Returns how many were deleted."""
    client = _client()
    deleted = 0
    # list_objects_v2 returns at most 1000 keys per page, and delete_objects accepts at most 1000 keys per call
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=_bucket(), Prefix=prefix):
        keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
        if keys:
            client.delete_objects(Bucket=_bucket(), Delete={"Objects": keys, "Quiet": True})
            deleted += len(keys)
    return deleted


def presigned_url(key: str, filename: str, *, download: bool, content_type: str) -> str:
    """
    A temporary link to a private file. S3 applies the two Response* overrides when the link is opened:
    `download=True` sends it as an attachment with the original name, otherwise it is shown inline (preview).
    """
    if download:
        # filename*=UTF-8''... keeps accents and spaces in the downloaded file's name
        disposition = f"attachment; filename*=UTF-8''{quote(filename)}"
    else:
        disposition = "inline"

    return _client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": _bucket(),
            "Key": key,
            "ResponseContentDisposition": disposition,
            "ResponseContentType": content_type,
        },
        ExpiresIn=get_settings().presigned_url_expires,
    )
