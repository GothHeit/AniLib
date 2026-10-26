"""A small in-process sliding-window limiter.

State lives in this process only, which is fine for a single API instance. Running several
instances would need a shared store (e.g. Redis) instead.
"""

import time
from collections import deque
from collections.abc import Callable

from app.errors import ApiError


class RateLimiter:
    def __init__(
        self, limit: int, window_seconds: float, clock: Callable[[], float] = time.monotonic
    ):
        self._limit = limit
        self._window = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}

    def _recent(self, key: str) -> deque[float]:
        now = self._clock()
        hits = self._hits.setdefault(key, deque())
        while hits and hits[0] <= now - self._window:
            hits.popleft()
        if not hits:
            # Drop idle keys so the table doesn't grow with every address ever seen.
            del self._hits[key]
            return deque()
        return hits

    def retry_after(self, key: str) -> int | None:
        """Seconds until `key` may try again, or None when it is under the limit."""
        hits = self._recent(key)
        if len(hits) < self._limit:
            return None
        return max(1, int(hits[0] + self._window - self._clock()) + 1)

    def check(self, key: str) -> None:
        wait = self.retry_after(key)
        if wait is not None:
            raise ApiError(
                429,
                "rate_limited",
                "Too many attempts, try again later",
                headers={"Retry-After": str(wait)},
            )

    def record(self, key: str) -> None:
        self._recent(key)
        self._hits.setdefault(key, deque()).append(self._clock())

    def sweep(self) -> None:
        """Drop every key whose hits have all expired; `_recent` prunes each key it visits."""
        for key in list(self._hits):
            self._recent(key)

    def forgive(self, key: str) -> None:
        """Drop the most recent hit, e.g. when an attempt turned out to be fine."""
        hits = self._hits.get(key)
        if hits:
            hits.pop()

    def reset(self, key: str) -> None:
        self._hits.pop(key, None)


class AuthLimits:
    """The limiters guarding /auth/login and /auth/register."""

    def __init__(self, settings):
        window = settings.login_window_seconds
        self.login_ip = RateLimiter(settings.login_ip_limit, window)
        self.login_user = RateLimiter(settings.login_user_limit, window)
        self.register_ip = RateLimiter(settings.register_ip_limit, settings.register_window_seconds)
        self.register_user = RateLimiter(
            settings.register_user_limit, settings.register_window_seconds
        )
        # Wrong current passwords on /me/password, per user.
        self.password_user = RateLimiter(settings.login_user_limit, window)

    def sweep(self) -> None:
        for limiter in (self.login_ip, self.login_user, self.register_ip, self.register_user):
            limiter.sweep()
        self.password_user.sweep()
