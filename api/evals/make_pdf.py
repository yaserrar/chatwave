"""
Builds evals/fixtures/orbit-api-guide.pdf, the evaluation set's PDF, from the text below.

A tiny PDF writer (standard Helvetica font, one section per page) so the fixture needs no extra package
and can be rebuilt after editing the text:

    python -m evals.make_pdf
"""

import textwrap
from pathlib import Path

OUTPUT = Path(__file__).parent / "fixtures" / "orbit-api-guide.pdf"

TITLE = "Orbit Payments API Guide"
NOTE = "Orbit is a fictional payment service. This made-up guide is used to evaluate Chatwave."

PAGES = [
    (
        "1. Authentication",
        [
            "Every request to the Orbit API must carry an API key in the Orbit-Key header. Requests without a key, "
            "or with a revoked key, are answered with 401 Unauthorized.",
            "There are two kinds of keys. Live keys start with orb_live_ and move real money. Test keys start with "
            "orb_test_ and only work against the sandbox at sandbox.orbit.example. Never use a live key in a test "
            "environment or in client-side code.",
            "Keys must be rotated at least every 90 days. When you create a new key, the old one keeps working for "
            "a 24-hour grace period, so you can deploy the new key without downtime. A key that leaked must be "
            "revoked immediately from the dashboard.",
        ],
    ),
    (
        "2. Rate limits",
        [
            "Each API key may send up to 600 requests per minute. On top of that, short bursts of up to 50 "
            "requests in the same second are accepted.",
            "When a key goes over its limit, Orbit answers with HTTP status 429 Too Many Requests and a "
            "Retry-After header giving the number of seconds to wait. Clients should wait at least that long, then "
            "retry with exponential backoff and jitter.",
            "Limits are counted per key, not per account: splitting traffic between a reporting key and a "
            "checkout key keeps a slow report from blocking payments. Enterprise plans can ask for higher limits.",
        ],
    ),
    (
        "3. Webhooks",
        [
            "Orbit sends webhook events (payment.succeeded, payment.failed, refund.created) to the HTTPS endpoint "
            "you register. Each event is signed with HMAC-SHA256 using your webhook secret, and the signature is "
            "sent in the Orbit-Signature header. Always verify it before trusting the event.",
            "Your endpoint must answer with a 2xx status within 10 seconds. Otherwise the delivery counts as "
            "failed and Orbit retries it up to 8 times over 24 hours, with exponential backoff. After the last "
            "attempt the event is marked as undelivered and shown in the dashboard.",
            "Events can arrive more than once and out of order. Use the event id to ignore duplicates.",
        ],
    ),
    (
        "4. Errors and idempotency",
        [
            "Errors return a JSON body with a stable code. The most common codes are: ORB-4471, the card was "
            "declined for insufficient funds; ORB-4012, the card has expired; ORB-5003, the upstream card processor "
            "timed out. Codes starting with ORB-5 are temporary and can be retried.",
            "To retry a payment safely, send an Idempotency-Key header with a unique value. Orbit stores the result "
            "of the first request for 24 hours and returns the same result for every retry with the same key, so a "
            "customer is never charged twice.",
        ],
    ),
    (
        "5. Refunds",
        [
            "Payments can be refunded in full or in part, through the refunds endpoint or from the dashboard. "
            "Several partial refunds are allowed, as long as their total does not exceed the original amount.",
            "A refund can be issued up to 180 days after the payment. Customers usually see the money back on "
            "their statement within 5 to 10 business days, depending on their bank. Orbit fees on the original "
            "payment are not returned.",
        ],
    ),
    (
        "6. Payouts",
        [
            "Orbit pays out your available balance to your bank account every business day. Funds from a payment "
            "become available two business days after it succeeds, so a payment made on Monday is paid out on "
            "Wednesday.",
            "Payouts below 20 EUR are held and added to the next payout. You can pause payouts from the dashboard, "
            "for example while you change bank accounts; paused funds stay safe in your Orbit balance.",
        ],
    ),
    (
        "7. Disputes",
        [
            "When a customer disputes a payment with their bank (a chargeback), Orbit notifies you with a "
            "dispute.created event and immediately holds the disputed amount plus a 15 USD dispute fee.",
            "You have 7 days to respond with evidence such as receipts, delivery tracking or the customer's "
            "messages. The bank then decides, which can take up to 75 days. If you win, the amount and the fee "
            "are returned; if you lose or do not respond, both are kept.",
        ],
    ),
    (
        "8. Testing in the sandbox",
        [
            "The sandbox behaves like production but never moves money. Use the test card 4242 4242 4242 4242 "
            "with any future expiry date to simulate a successful payment.",
            "Special amounts trigger specific outcomes: a payment of 13.37 always fails with ORB-5003, and a "
            "payment of 40.04 is declined with ORB-4471. Sandbox data is wiped on the first day of every month.",
        ],
    ),
]


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _page_stream(page_number: int, heading: str, paragraphs: list[str]) -> bytes:
    lines = ["BT", "/F2 16 Tf", "72 760 Td", f"({_escape(TITLE)}) Tj", "/F1 9 Tf", "0 -18 Td", f"({_escape(NOTE)}) Tj"]
    lines += ["/F2 13 Tf", "0 -34 Td", f"({_escape(heading)}) Tj", "/F1 11 Tf", "15 TL", "0 -10 Td"]
    for paragraph in paragraphs:
        lines.append("T*")  # blank line between paragraphs
        for line in textwrap.wrap(paragraph, width=88):
            lines += ["T*", f"({_escape(line)}) Tj"]
    lines += ["ET", "BT", "/F1 9 Tf", "290 40 Td", f"(Page {page_number}) Tj", "ET"]
    return "\n".join(lines).encode("latin-1")


def build() -> bytes:
    objects: list[bytes] = []

    def add(body: bytes) -> int:
        objects.append(body)
        return len(objects)

    catalog = add(b"")  # filled once the pages object exists
    pages = add(b"")
    regular = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    bold = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

    kids = []
    for number, (heading, paragraphs) in enumerate(PAGES, start=1):
        stream = _page_stream(number, heading, paragraphs)
        content = add(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
        kids.append(
            add(
                b"<< /Type /Page /Parent %d 0 R /MediaBox [0 0 612 792] /Contents %d 0 R "
                b"/Resources << /Font << /F1 %d 0 R /F2 %d 0 R >> >> >>" % (pages, content, regular, bold)
            )
        )

    objects[catalog - 1] = b"<< /Type /Catalog /Pages %d 0 R >>" % pages
    objects[pages - 1] = b"<< /Type /Pages /Kids [%s] /Count %d >>" % (
        b" ".join(b"%d 0 R" % kid for kid in kids),
        len(kids),
    )

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + body + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % offset for offset in offsets)
    out += b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, catalog, xref)
    return bytes(out)


if __name__ == "__main__":
    OUTPUT.write_bytes(build())
    print(f"Wrote {OUTPUT}")
