"""Async HTTP client wrapping the web app's `/api/bot/*` endpoints.

Pattern B: the bot has no database access. Every read/write goes through the
Next.js API, authenticated with the shared `X-Bot-Secret` header. Discord IDs are
always strings (snowflakes lose precision as JS/JSON numbers above 2^53).
"""

from __future__ import annotations

from typing import Any

import httpx

# ---- Typed-ish aliases (the API returns the DTOs from 06-api-contract.md) ----
Member = dict[str, Any]
RaidWithDungeon = dict[str, Any]
JoinRequest = dict[str, Any]


class ApiError(Exception):
    """A non-2xx response from the web API.

    `status` is the HTTP code and `message` is the API's `error` field when
    present. The join-request endpoint uses 404/409 with a human-readable
    `error` to signal guard failures (not synced / rostered / full / pending).
    """

    def __init__(self, status: int, message: str) -> None:
        super().__init__(f"API {status}: {message}")
        self.status = status
        self.message = message


class WebApi:
    def __init__(self, base_url: str, secret: str, *, timeout: float = 10.0) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"X-Bot-Secret": secret},
            timeout=timeout,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> WebApi:
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self.aclose()

    @staticmethod
    def _unwrap(response: httpx.Response) -> Any:
        if response.is_success:
            return response.json()
        try:
            message = response.json().get("error", response.text)
        except ValueError:
            message = response.text
        raise ApiError(response.status_code, message or "Unknown error")

    # ---- Endpoints ----

    async def ensure_member(
        self, discord_id: str, discord_name: str, discord_avatar: str
    ) -> Member:
        """POST /api/bot/members/ensure — upserts a minimal member, returns it."""
        res = await self._client.post(
            "/api/bot/members/ensure",
            json={
                "discordId": discord_id,
                "discordName": discord_name,
                "discordAvatar": discord_avatar,
            },
        )
        return self._unwrap(res)["member"]

    async def upcoming_raids(self) -> list[RaidWithDungeon]:
        """GET /api/bot/raids/upcoming — scheduled raids now → end of week."""
        res = await self._client.get("/api/bot/raids/upcoming")
        return self._unwrap(res)["raids"]

    async def member_plan(self, discord_id: str) -> list[RaidWithDungeon]:
        """GET /api/bot/members/:discordId/plan — member's raids now → end of week."""
        res = await self._client.get(f"/api/bot/members/{discord_id}/plan")
        return self._unwrap(res)["raids"]

    async def create_join_request(self, raid_id: str, discord_id: str) -> JoinRequest:
        """POST /api/bot/requests — creates a pending request.

        Raises ApiError(404|409, ...) on guard failures (not synced / raid not
        found / already rostered / full / already pending).
        """
        res = await self._client.post(
            "/api/bot/requests",
            json={"raidId": raid_id, "discordId": discord_id},
        )
        return self._unwrap(res)["request"]
