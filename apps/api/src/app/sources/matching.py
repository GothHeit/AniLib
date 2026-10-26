"""Matching a MyAnimeList entry to a title on a scraped provider.

Provider-agnostic: the caller passes in how to search and how to fetch alternative names,
so this can be tested without the network.

It searches with the main title plus English, Japanese and synonyms, scores candidates
with token_sort_ratio, falls back to the provider's alternative names (stylised titles,
nicknames like "1P" for One Piece), and penalises sequel/special markers that aren't in
the MAL title so "X Specials" and recaps don't win.
"""

import unicodedata
from collections.abc import Callable, Iterable
from dataclasses import dataclass

from rapidfuzz import fuzz

MIN_RATIO = 70
EXACT_ENOUGH = 90
SEQUEL_PENALTY = 25
SEQUEL_MARKERS = (
    "√a",
    ":re",
    "2nd",
    "3rd",
    "season",
    "movie",
    "film",
    "ova",
    "ona",
    "special",
    "part",
    "final",
    "kanketsu",
    "recap",
)


@dataclass(frozen=True)
class Candidate:
    identifier: str
    name: str


def normalize(s: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", s).lower().split())


def mal_titles(detail: dict) -> set[str]:
    titles = {detail.get("title") or ""}
    alt = detail.get("alternative_titles") or {}
    for key in ("en", "ja"):
        if alt.get(key):
            titles.add(alt[key])
    titles |= set(alt.get("synonyms") or [])
    return {t for t in titles if t}


def penalty(name: str, mal_joined: str) -> int:
    name_n = normalize(name)
    return sum(SEQUEL_PENALTY for m in SEQUEL_MARKERS if m in name_n and m not in mal_joined)


def _best_ratio(names: Iterable[str], targets: set[str]) -> float:
    return max((fuzz.token_sort_ratio(t, normalize(n)) for n in names for t in targets), default=0)


def match(
    detail: dict,
    search: Callable[[str], list[Candidate]],
    alternative_names: Callable[[str], list[str]],
) -> Candidate | None:
    raw = mal_titles(detail)
    targets = {normalize(t) for t in raw}
    joined = " ".join(targets)

    candidates: dict[str, Candidate] = {}
    for query in raw:
        for c in search(query):
            candidates.setdefault(c.identifier, c)

    best, best_score, best_ratio = None, float("-inf"), 0.0
    for c in candidates.values():
        p = penalty(c.name, joined)
        ratio = _best_ratio([c.name], targets)
        if ratio < EXACT_ENOUGH and p == 0:
            ratio = max(ratio, _best_ratio(alternative_names(c.identifier), targets))
        score = ratio - p
        if score > best_score:
            best, best_score, best_ratio = c, score, ratio

    if best is None or best_ratio < MIN_RATIO:
        return None
    return best
