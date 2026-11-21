import pytest

from app.services.retrieval import (
    MAX_QUERY_TERMS,
    keyword_query,
    keyword_terms,
    reciprocal_rank_fusion,
    search_stem,
    term_coverage,
)


class TestKeywordTerms:
    def test_drops_stop_words_in_english_and_french(self):
        assert keyword_terms("What is the refund policy?") == ["refund", "policy"]
        assert keyword_terms("Quel est le plafond pour une nuit d'hôtel ?") == ["plafond", "nuit", "hotel"]

    def test_lowercases_removes_accents_and_duplicates(self):
        assert keyword_terms("Résumé RÉSUMÉ résume") == ["resume"]

    def test_keeps_codes_and_numbers(self):
        assert keyword_terms("What does ORB-4471 mean in 2026?") == ["orb", "4471", "mean", "2026"]

    def test_keeps_single_digits_but_not_single_letters(self):
        assert keyword_terms("plan b or plan 3") == ["plan", "3"]

    def test_underscores_split_words(self):
        assert keyword_terms("orb_live_ keys") == ["orb", "live", "keys"]

    def test_caps_the_number_of_terms(self):
        question = " ".join(f"word{i}" for i in range(MAX_QUERY_TERMS + 5))
        assert len(keyword_terms(question)) == MAX_QUERY_TERMS


class TestKeywordQuery:
    def test_joins_terms_with_or_and_prefixes_long_words(self):
        assert keyword_query("refund API keys") == "refund:* | api | key:*"

    def test_words_with_the_same_stem_appear_once(self):
        assert keyword_query("refunds refunded refund") == "refund:*"

    def test_none_when_only_stop_words(self):
        assert keyword_query("What is it?") is None
        assert keyword_query("   ") is None

    @pytest.mark.parametrize("question", ["a & b | !c", "x:* <-> (y)", "it's 'quoted' \\ back"])
    def test_tsquery_syntax_never_reaches_the_query(self, question):
        query = keyword_query(question) or ""
        terms = [term.removesuffix(":*") for term in query.split(" | ")] if query else []
        assert all(term.isalnum() for term in terms)


class TestSearchStem:
    @pytest.mark.parametrize(
        "term, stem",
        [
            ("chargebacks", "chargeback"),
            ("policies", "polic"),
            ("policy", "polic"),
            ("taxes", "tax"),
            ("fees", "fee"),
            ("keys", "key"),
            ("refunded", "refund"),
            ("parking", "park"),
            ("kilometrique", "kilometr"),
            ("kilometre", "kilometr"),
            ("remboursement", "rembours"),
            ("reservations", "reserv"),
            ("animaux", "anim"),
            ("helvia", "helvia"),
            ("4471", "4471"),
        ],
    )
    def test_long_words_lose_one_common_ending_and_match_as_prefixes(self, term, stem):
        assert search_stem(term) == (stem, True)

    def test_endings_never_leave_a_stem_too_short_to_mean_anything(self):
        assert search_stem("speed") == ("speed", True)  # not "spe"
        assert search_stem("taux") == ("taux", True)
        assert search_stem("core") == ("core", True)

    def test_short_words_stay_exact(self):
        assert search_stem("api") == ("api", False)
        assert search_stem("day") == ("day", False)


class TestTermCoverage:
    def test_share_of_terms_found(self):
        assert term_coverage(["refund", "window", "bitcoin"], "Refunds have a 180-day window.") == pytest.approx(2 / 3)

    def test_long_terms_match_as_prefixes_short_ones_exactly(self):
        assert term_coverage(["refund"], "refunded") == 1
        assert term_coverage(["api"], "apiculture") == 0

    @pytest.mark.parametrize(
        "question, text",
        [
            ("chargebacks", "When a customer opens a chargeback"),
            ("policies", "The travel policy"),
            ("refund fees", "The fee is not refunded"),
            ("kilometrique", "0,45 euro par kilomètre"),
            ("animaux", "un animal de compagnie"),
            ("hours", "core hour"),
        ],
    )
    def test_a_plural_or_derived_question_word_finds_the_singular_text(self, question, text):
        assert term_coverage(keyword_terms(question), text) == 1

    def test_accents_are_ignored(self):
        assert term_coverage(["hotel"], "Une nuit d'hôtel") == 1

    def test_no_terms_means_no_coverage(self):
        assert term_coverage([], "anything") == 0


class TestReciprocalRankFusion:
    def test_scores_add_up_across_rankings(self):
        fused = dict(reciprocal_rank_fusion([["a", "b"], ["b", "c"]], k=60))
        assert fused["a"] == pytest.approx(1 / 61)
        assert fused["b"] == pytest.approx(1 / 62 + 1 / 61)
        assert fused["c"] == pytest.approx(1 / 62)

    def test_being_in_both_lists_beats_being_first_in_one(self):
        ranked = [item for item, _ in reciprocal_rank_fusion([["a", "b", "x"], ["y", "b", "z"]])]
        assert ranked[0] == "b"

    def test_ties_keep_first_seen_order(self):
        ranked = [item for item, _ in reciprocal_rank_fusion([["x", "y"], ["y", "x"]])]
        assert ranked == ["x", "y"]

    def test_k_controls_how_much_the_top_rank_counts(self):
        sharp = dict(reciprocal_rank_fusion([["a", "b"]], k=1))
        assert sharp["a"] / sharp["b"] == pytest.approx(1.5)

    def test_empty_or_single_ranking(self):
        assert reciprocal_rank_fusion([]) == []
        assert reciprocal_rank_fusion([[], []]) == []
        assert [item for item, _ in reciprocal_rank_fusion([[3, 1, 2]])] == [3, 1, 2]
