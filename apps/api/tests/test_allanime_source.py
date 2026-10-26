from app.sources import allanime
from app.sources.allanime import AllAnimeSource


class EmptyEpisodeProvider:
    calls = 0

    def get_video(self, identifier, episode, lang):
        self.calls += 1
        raise TypeError("'NoneType' object is not subscriptable")


def test_empty_episode_is_not_available_and_not_retried(monkeypatch):
    monkeypatch.setattr(allanime.time, "sleep", lambda _: None)
    source = AllAnimeSource()
    provider = EmptyEpisodeProvider()
    source._provider = provider  # type: ignore[assignment]
    monkeypatch.setattr(source, "_resolve", lambda anime: allanime.Candidate("abc", "Show"))

    assert source._stream_sync({"id": 9253}, 1, "sub") is None
    assert provider.calls == 1
