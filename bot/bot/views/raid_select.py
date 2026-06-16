"""Select-menu + button flow for `/raids`: pick a raid → request to join.

All messages are ephemeral, so only the requesting member sees and drives the
components. Guards (already rostered / full / pending) are enforced server-side
by the web API; here we just surface them as friendly messages.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import discord

from ..api import ApiError
from ..time_utils import format_raid_time

if TYPE_CHECKING:
    from ..client import NSNLBot

log = logging.getLogger("nsnl.bot")

# Discord limits a select menu to 25 options.
MAX_OPTIONS = 25


def filled_count(raid: dict) -> int:
    return sum(1 for slot in raid.get("slots", []) if slot.get("memberId"))


def raid_summary(raid: dict, tz: str) -> str:
    dungeon = raid.get("dungeon", {})
    name = dungeon.get("name", "Raid")
    when = format_raid_time(raid["startAt"], tz)
    return f"{name} · {when} · {filled_count(raid)}/{raid['size']}"


def raid_detail_embed(raid: dict, tz: str) -> discord.Embed:
    dungeon = raid.get("dungeon", {})
    embed = discord.Embed(
        title=dungeon.get("name", "Raid"),
        description=dungeon.get("description") or None,
        colour=discord.Colour.from_str("#34D399"),
    )
    embed.add_field(name="When", value=format_raid_time(raid["startAt"], tz), inline=True)
    embed.add_field(name="Roster", value=f"{filled_count(raid)}/{raid['size']} filled", inline=True)
    if raid.get("notes"):
        embed.add_field(name="Notes", value=raid["notes"], inline=False)
    return embed


class JoinButton(discord.ui.Button):
    def __init__(self, bot: NSNLBot, raid: dict) -> None:
        full = filled_count(raid) >= raid["size"]
        super().__init__(
            label="Request to join",
            style=discord.ButtonStyle.success,
            emoji="🗡️",
            disabled=full,
        )
        self.bot = bot
        self.raid = raid

    async def callback(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True, thinking=True)
        try:
            await self.bot.ensure_member(interaction.user)
            await self.bot.api.create_join_request(self.raid["id"], str(interaction.user.id))
        except ApiError as exc:
            await interaction.followup.send(_friendly_error(exc), ephemeral=True)
            return

        self.disabled = True
        await interaction.followup.send(
            "✅ Request sent — waiting for admin approval.", ephemeral=True
        )


def _friendly_error(exc: ApiError) -> str:
    if exc.status == 409:
        # The web API returns a human-readable `error` for rostered/full/pending.
        return f"⚠️ {exc.message}."
    if exc.status == 404:
        return "That raid is no longer available."
    log.warning("Join request failed: %s", exc)
    return "Couldn't send your request right now. Please try again shortly."


class RaidDetailView(discord.ui.View):
    def __init__(self, bot: NSNLBot, raid: dict) -> None:
        super().__init__(timeout=180)
        self.add_item(JoinButton(bot, raid))


class RaidSelect(discord.ui.Select):
    def __init__(self, bot: NSNLBot, raids: list[dict]) -> None:
        self.bot = bot
        self.raids = {raid["id"]: raid for raid in raids[:MAX_OPTIONS]}
        tz = bot.config.team_timezone
        options = [
            discord.SelectOption(label=raid_summary(raid, tz)[:100], value=raid["id"])
            for raid in raids[:MAX_OPTIONS]
        ]
        super().__init__(placeholder="Choose a raid…", options=options, min_values=1, max_values=1)

    async def callback(self, interaction: discord.Interaction) -> None:
        raid = self.raids.get(self.values[0])
        if raid is None:
            await interaction.response.send_message(
                "That raid is no longer available.", ephemeral=True
            )
            return
        tz = self.bot.config.team_timezone
        await interaction.response.send_message(
            embed=raid_detail_embed(raid, tz),
            view=RaidDetailView(self.bot, raid),
            ephemeral=True,
        )


class RaidListView(discord.ui.View):
    def __init__(self, bot: NSNLBot, raids: list[dict]) -> None:
        super().__init__(timeout=180)
        self.add_item(RaidSelect(bot, raids))
