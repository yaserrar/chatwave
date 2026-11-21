import pytest

from evals.metrics import Expected, Passage, first_hit_rank, hit_rate, is_hit, mean_reciprocal_rank, normalize, share

PDF = Passage("guide.pdf", 2, "Each key may send up to 600 requests\nper minute.")


def test_normalize_folds_case_accents_and_whitespace():
    assert normalize("  Hôtel\n\tÀ  Paris ") == "hotel a paris"


@pytest.mark.parametrize(
    "expected, hit",
    [
        (Expected("guide.pdf"), True),
        (Expected("guide.pdf", page=2), True),
        (Expected("guide.pdf", page=3), False),
        (Expected("other.md"), False),
        (Expected("guide.pdf", phrase="600 requests per minute"), True),  # across a line break
        (Expected("guide.pdf", phrase="700 requests"), False),
    ],
)
def test_is_hit(expected, hit):
    assert is_hit(expected, PDF) is hit


def test_first_hit_rank():
    other = Passage("other.md", 1, "nothing")
    assert first_hit_rank(Expected("guide.pdf"), [other, PDF, PDF]) == 2
    assert first_hit_rank(Expected("guide.pdf"), [other]) is None


def test_hit_rate_and_mrr():
    ranks = [1, 2, None, 4]
    assert hit_rate(ranks, 1) == 0.25
    assert hit_rate(ranks, 3) == 0.5
    assert hit_rate(ranks, 5) == 0.75
    assert mean_reciprocal_rank(ranks) == pytest.approx((1 + 0.5 + 0 + 0.25) / 4)
    assert hit_rate([], 3) == 0 and mean_reciprocal_rank([]) == 0


def test_share():
    assert share(3, 4) == "3/4 (75%)"
    assert share(0, 0) == "–"
