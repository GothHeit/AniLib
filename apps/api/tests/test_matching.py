from app.sources.matching import Candidate, match

DETAIL = {
    "id": 21,
    "title": "One Piece",
    "alternative_titles": {"en": "One Piece", "ja": "ONE PIECE", "synonyms": ["OP"]},
}


def fake_search(results):
    return lambda query: results


def test_prefers_main_series_over_specials():
    results = [
        Candidate("a", "One Piece Special: Adventure of Nebulandia"),
        Candidate("b", "One Piece"),
        Candidate("c", "One Piece Film: Red"),
    ]
    assert match(DETAIL, fake_search(results), lambda _: []).identifier == "b"


def test_uses_alternative_names_for_stylised_titles():
    results = [Candidate("x", "1P")]
    alt = {"x": ["One Piece"]}
    assert match(DETAIL, fake_search(results), lambda i: alt.get(i, [])).identifier == "x"


def test_returns_none_when_nothing_is_close():
    results = [Candidate("z", "Completely Different Show")]
    assert match(DETAIL, fake_search(results), lambda _: []) is None
