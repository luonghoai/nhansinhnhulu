"""/myplan — show the member's rostered raids from now → end of week."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import discord

from ..api import ApiError
from ..time_utils import format_raid_time

if TYPE_CHECKING:
    from ..client import NSNLBot

log = logging.getLogger("nsnl.bot")


def _slot_label(raid: dict, member_id: str) -> str:
    for slot in raid.get("slots", []):
        if slot.get("memberId") == member_id:
            role = slot.get("roleLabel")
            return f"Slot {slot['index'] + 1}" + (f" · {role}" if role else "")
    return "—"


def setup(bot: NSNLBot) -> None:
    @bot.tree.command(name="myplan", description="Show your rostered raids this week")
    async def myplan(interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True, thinking=True)
        tz = bot.config.team_timezone
        try:
            member = await bot.ensure_member(interaction.user)
            raids = await bot.api.member_plan(str(interaction.user.id))
        except ApiError as exc:
            log.warning("/myplan API error: %s", exc)
            await interaction.followup.send(
                "Couldn't reach the schedule right now. Please try again shortly.",
                ephemeral=True,
            )
            return

        if not raids:
            await interaction.followup.send("You have no raids planned this week.", ephemeral=True)
            return

        embed = discord.Embed(
            title="Your raids this week",
            colour=discord.Colour.from_str("#34D399"),
        )
        for raid in raids:
            dungeon = raid.get("dungeon", {})
            name = dungeon.get("name", "Raid")
            when = format_raid_time(raid["startAt"], tz)
            embed.add_field(
                name=f"{name} — {when}",
                value=_slot_label(raid, member["id"]),
                inline=False,
            )
        await interaction.followup.send(embed=embed, ephemeral=True)
