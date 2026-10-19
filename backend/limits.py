"""Per-client sliding-window limiter with bounded memory.

The previous limiter was one global queue: a single noisy client could lock every
other student out of login or chat. Each client now has its own window.
"""
from collections import deque
import time


class SlidingWindowLimiter:
    def __init__(self, limit: int, window: float = 60.0, max_keys: int = 20000):
        self.limit, self.window, self.max_keys = limit, window, max_keys
        self._hits: dict[str, deque] = {}
        self._sweep_at = 0.0

    def _sweep(self, now: float):
        # Drop idle clients so the table cannot grow without bound.
        if now < self._sweep_at and len(self._hits) < self.max_keys:
            return
        self._sweep_at = now + self.window
        for key in [k for k, q in self._hits.items() if not q or now - q[-1] >= self.window]:
            del self._hits[key]
        if len(self._hits) >= self.max_keys:
            # Still full of active keys: evict the oldest-seen half rather than refuse service.
            for key in sorted(self._hits, key=lambda k: self._hits[k][-1])[: self.max_keys // 2]:
                del self._hits[key]

    def hit(self, key: str, now: float | None = None) -> int:
        """Record an attempt. Returns 0 if allowed, else seconds until retry."""
        now = time.monotonic() if now is None else now
        self._sweep(now)
        q = self._hits.setdefault(key, deque())
        while q and now - q[0] >= self.window:
            q.popleft()
        if len(q) >= self.limit:
            return max(1, int(self.window - (now - q[0])) + 1)
        q.append(now)
        return 0


    def _live(self, key: str, now: float) -> deque:
        q = self._hits.get(key)
        if q is None:
            return deque()
        while q and now - q[0] >= self.window:
            q.popleft()
        return q

    def peek(self, key: str, now: float | None = None) -> int:
        """Seconds until retry if the key is at its limit, else 0. Records nothing."""
        now = time.monotonic() if now is None else now
        q = self._live(key, now)
        if len(q) >= self.limit:
            return max(1, int(self.window - (now - q[0])) + 1)
        return 0

    def remaining(self, key: str, now: float | None = None) -> int:
        now = time.monotonic() if now is None else now
        return max(0, self.limit - len(self._live(key, now)))

    def reset(self, key: str) -> None:
        self._hits.pop(key, None)


def client_key(request, hops: int = 0) -> str:
    """Client identity. Forwarded headers are trusted only when hops>0 is configured,
    and then only the entry the trusted proxy chain itself appended."""
    if hops > 0:
        parts = [p.strip() for p in request.headers.get('x-forwarded-for', '').split(',') if p.strip()]
        if len(parts) >= hops:
            return parts[-hops][:64]
    return request.client.host if request.client else 'unknown'
