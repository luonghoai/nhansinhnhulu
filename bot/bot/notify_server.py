"""Tiny aiohttp server exposing `POST /notify` for the web app to push decisions.

The web calls this on approve/reject (same shared `X-Bot-Secret`). We DM the
member the outcome and ALWAYS return 200 on a valid request — even if the DM is
blocked — so the web can mark the request `notifiedAt`. Runs on the bot's event
loop alongside the gateway connection (see main.py).
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import discord
from aiohttp import web

from .time_utils import format_raid_time

if TYPE_CHECKING:
    from .client import NSNLBot

log = logging.getLogger("nsnl.bot")

VALID_DECISIONS = {"approved", "rejected"}


def _message(decision: str, reason: str | None) -> str:
    if decision == "approved":
        text = "🎉 Your raid join request was **approved**! See it with `/myplan`."
    else:
        text = "Your raid join request was **rejected**."
    if reason:
        text += f"\n> {reason}"
    return text


def _build_raid_embed(payload: dict, tz_name: str) -> discord.Embed:
    """Compose the raid announcement embed from the web app's payload."""
    dungeon_name = str(payload.get("dungeonName") or "Raid")
    title = payload.get("title")
    heading = f"{title} — {dungeon_name}" if isinstance(title, str) and title else dungeon_name

    embed = discord.Embed(
        title=f"📅 Lịch raid mới: {heading}",
        color=discord.Color.blurple(),
    )

    start_at = payload.get("startAt")
    if isinstance(start_at, str):
        try:
            when = format_raid_time(start_at, tz_name)
            embed.add_field(name="Thời gian", value=when, inline=True)
        except ValueError:
            log.warning("announce-raid: bad startAt %r", start_at)

    size = payload.get("size")
    if isinstance(size, int):
        embed.add_field(name="Quy mô", value=f"{size} người", inline=True)

    landing_url = payload.get("landingUrl")
    if isinstance(landing_url, str) and landing_url:
        embed.add_field(name="Chi tiết", value=landing_url, inline=False)

    return embed


def build_notify_app(bot: NSNLBot) -> web.Application:
    async def handle_notify(request: web.Request) -> web.Response:
        if request.headers.get("X-Bot-Secret") != bot.config.bot_api_secret:
            return web.json_response({"error": "Unauthorized"}, status=401)

        try:
            payload = await request.json()
        except ValueError:
            return web.json_response({"error": "Invalid JSON"}, status=400)

        discord_id = payload.get("discordId")
        decision = payload.get("decision")
        if not isinstance(discord_id, str) or decision not in VALID_DECISIONS:
            return web.json_response({"error": "Invalid payload"}, status=400)

        reason = payload.get("reason")
        try:
            user = await bot.fetch_user(int(discord_id))
            await user.send(_message(decision, reason if isinstance(reason, str) else None))
            log.info("Notified %s of %s", discord_id, decision)
        except (discord.Forbidden, discord.HTTPException, ValueError) as exc:
            # DM blocked / user gone / bad id — log but still ack so web records it.
            log.warning("Could not DM %s: %s", discord_id, exc)

        return web.json_response({"ok": True})

    async def handle_announce_raid(request: web.Request) -> web.Response:
        if request.headers.get("X-Bot-Secret") != bot.config.bot_api_secret:
            return web.json_response({"error": "Unauthorized"}, status=401)

        try:
            payload = await request.json()
        except ValueError:
            return web.json_response({"error": "Invalid JSON"}, status=400)

        discord_ids = payload.get("discordIds")
        if not isinstance(discord_ids, list) or not all(isinstance(d, str) for d in discord_ids):
            return web.json_response({"error": "Invalid payload"}, status=400)

        channel_id = bot.config.raid_announce_channel_id
        if channel_id is None:
            log.warning("announce-raid received but RAID_ANNOUNCE_CHANNEL_ID is not set")
            return web.json_response({"ok": True, "skipped": "no channel configured"})

        mentions = " ".join(f"<@{did}>" for did in discord_ids)
        embed = _build_raid_embed(payload, bot.config.team_timezone)
        try:
            channel = bot.get_channel(channel_id) or await bot.fetch_channel(channel_id)
            await channel.send(  # type: ignore[union-attr]
                content=mentions or None,
                embed=embed,
                allowed_mentions=discord.AllowedMentions(users=True),
            )
            log.info("Announced raid %s in channel %s", payload.get("raidId"), channel_id)
        except (discord.Forbidden, discord.HTTPException, AttributeError) as exc:
            # Missing perms / channel gone / not a text channel — log but ack so web moves on.
            log.warning("Could not announce raid in channel %s: %s", channel_id, exc)

        return web.json_response({"ok": True})

    async def handle_health(_request: web.Request) -> web.Response:
        return web.json_response({"status": "ok"})

    app = web.Application()
    app.router.add_post("/notify", handle_notify)
    app.router.add_post("/announce-raid", handle_announce_raid)
    app.router.add_get("/health", handle_health)
    return app


async def start_notify_server(bot: NSNLBot, port: int) -> web.AppRunner:
    """Start the notify server on the current event loop; returns the runner."""
    runner = web.AppRunner(build_notify_app(bot))
    await runner.setup()
    site = web.TCPSite(runner, host="0.0.0.0", port=port)
    await site.start()
    log.info("Notify server listening on :%s", port)
    return runner
