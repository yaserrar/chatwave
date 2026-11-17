"""
Downloads a file from a link the user pasted, safely.

Our server makes this request, not the user's browser, so a link could point at things only the server
can reach: the EC2 metadata service (169.254.169.254, which hands out the server's AWS credentials),
the database, RabbitMQ... (an attack called SSRF). So every address is checked before connecting,
including after each redirect.
"""

import asyncio
import ipaddress
import socket
from dataclasses import dataclass
from email.message import Message
from pathlib import PurePosixPath
from urllib.parse import unquote, urljoin, urlparse

import httpx

from app.core.config import get_settings

TIMEOUT = httpx.Timeout(15.0)  # seconds, for connecting and for each read
MAX_REDIRECTS = 3

# When the link has no extension (e.g. https://site.com/download?id=3), the type the site announces decides
EXTENSION_FOR_TYPE = {
    "application/pdf": ".pdf",
    "text/markdown": ".md",
    "text/x-markdown": ".md",
    "text/plain": ".txt",
}


class LinkError(ValueError):
    """A problem with the link. The message is shown to the user, so it says what to do."""


@dataclass
class DownloadedFile:
    filename: str
    content_type: str | None
    content: bytes


async def _check_public(url: str) -> None:
    """Refuses anything that isn't a public internet address."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise LinkError("Use a link that starts with http:// or https://.")

    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        # The name can point to several addresses: all of them must be public
        addresses = await asyncio.get_running_loop().getaddrinfo(parsed.hostname, port)
    except socket.gaierror:
        raise LinkError("This address could not be found. Check the link.")

    for *_, sockaddr in addresses:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.version == 6 and ip.ipv4_mapped:  # ::ffff:127.0.0.1 is really 127.0.0.1
            ip = ip.ipv4_mapped
        # is_global is False for private networks, localhost, 169.254.x.x (EC2 metadata), etc.
        if not ip.is_global:
            raise LinkError("This link points to a private address and cannot be used.")


def _filename(response: httpx.Response, content_type: str | None) -> str:
    """The file's name: from the site's Content-Disposition header, else from the end of the URL."""
    header = Message()
    header["content-disposition"] = response.headers.get("content-disposition", "")
    name = header.get_filename() or unquote(urlparse(str(response.url)).path)
    name = PurePosixPath(name).name[:200] or "download"  # never a path, never empty

    if PurePosixPath(name).suffix.lower() not in get_settings().allowed_extensions:
        # No usable extension in the name: add the one matching the announced type, if we know it
        name += EXTENSION_FOR_TYPE.get(content_type or "", "")
    return name


async def download(url: str) -> DownloadedFile:
    """Downloads the file behind `url`. Raises LinkError with a message for the user if it can't."""
    max_size = get_settings().max_file_size
    too_big = f"This file is larger than {max_size // (1024 * 1024)} MB."

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False) as client:
            # Redirects are followed by hand, so each new address is checked too
            for _ in range(MAX_REDIRECTS + 1):
                await _check_public(url)
                async with client.stream("GET", url, headers={"User-Agent": "Chatwave"}) as response:
                    if response.is_redirect:
                        url = urljoin(url, response.headers["location"])
                        continue
                    if response.status_code != 200:
                        raise LinkError(
                            f"The site answered {response.status_code}. Check that the link opens the file."
                        )

                    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower() or None
                    if content_type == "text/html":
                        raise LinkError(
                            "This link opens a web page, not a file. Use a direct link to a PDF, Markdown or text file."
                        )

                    # Refuse early when the site announces the size, and stop reading anyway past the limit:
                    # the announced size can be missing or wrong
                    declared = response.headers.get("content-length", "")
                    if declared.isdigit() and int(declared) > max_size:
                        raise LinkError(too_big)
                    content = bytearray()
                    async for chunk in response.aiter_bytes():
                        content.extend(chunk)
                        if len(content) > max_size:
                            raise LinkError(too_big)

                    return DownloadedFile(_filename(response, content_type), content_type, bytes(content))

            raise LinkError("This link redirects too many times.")

    except httpx.TimeoutException:
        raise LinkError("The site took too long to answer.")
    except httpx.HTTPError:
        raise LinkError("The file could not be downloaded from this link.")
