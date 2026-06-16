"""Environment configuration for the NSNL bot.

Loads `.env` (via python-dotenv) and exposes a validated, frozen `Config`.
Fail fast at startup if a required secret is missing — Pattern B means the bot
is useless without the web API base URL and the shared secret.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh"
DEFAULT_NOTIFY_PORT = 8080


class ConfigError(RuntimeError):
    """Raised when a required environment variable is missing or invalid."""


@dataclass(frozen=True)
class Config:
    discord_bot_token: str
    bot_api_secret: str
    web_api_base_url: str
    team_timezone: str
    guild_id: int | None
    notify_port: int
    raid_announce_channel_id: int | None


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


def load_config() -> Config:
    guild_raw = os.environ.get("GUILD_ID", "").strip()
    guild_id: int | None = None
    if guild_raw:
        try:
            guild_id = int(guild_raw)
        except ValueError as exc:
            raise ConfigError("GUILD_ID must be an integer if set") from exc

    port_raw = os.environ.get("BOT_NOTIFY_PORT", str(DEFAULT_NOTIFY_PORT)).strip()
    try:
        notify_port = int(port_raw)
    except ValueError as exc:
        raise ConfigError("BOT_NOTIFY_PORT must be an integer") from exc

    channel_raw = os.environ.get("RAID_ANNOUNCE_CHANNEL_ID", "").strip()
    raid_announce_channel_id: int | None = None
    if channel_raw:
        try:
            raid_announce_channel_id = int(channel_raw)
        except ValueError as exc:
            raise ConfigError("RAID_ANNOUNCE_CHANNEL_ID must be an integer if set") from exc

    return Config(
        discord_bot_token=_require("DISCORD_BOT_TOKEN"),
        bot_api_secret=_require("BOT_API_SECRET"),
        web_api_base_url=_require("WEB_API_BASE_URL").rstrip("/"),
        team_timezone=os.environ.get("TEAM_TIMEZONE", "").strip() or DEFAULT_TIMEZONE,
        guild_id=guild_id,
        notify_port=notify_port,
        raid_announce_channel_id=raid_announce_channel_id,
    )
