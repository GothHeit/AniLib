import pytest

from app.sources import load_sources
from app.sources.zoko import ZokoSource


def test_retired_source_is_skipped() -> None:
    sources = load_sources(["allanime", "zoko"])
    assert list(sources) == ["zoko"]
    assert isinstance(sources["zoko"], ZokoSource)


def test_unknown_source_fails() -> None:
    with pytest.raises(ValueError):
        load_sources(["nope"])
