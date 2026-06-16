"""Render UTC timestamps from the web API in the team's timezone.

The web stores everything in UTC and sends ISO-8601 strings. Members read times
in `TEAM_TIMEZONE` (default Asia/Ho_Chi_Minh), so all display formatting goes
through here.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo


def parse_iso_utc(value: str) -> datetime:
    """Parse an ISO string from the API into an aware UTC datetime.

    Handles the trailing `Z` that JS `toISOString()` produces.
    """
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def to_team_tz(value: str, tz_name: str) -> datetime:
    return parse_iso_utc(value).astimezone(ZoneInfo(tz_name))


def format_raid_time(value: str, tz_name: str) -> str:
    """e.g. 'Thu 19 Jun · 21:00'."""
    return to_team_tz(value, tz_name).strftime("%a %d %b · %H:%M")
