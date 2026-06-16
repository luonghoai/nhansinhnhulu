"""/raids — browse upcoming raids and request to join one."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import discord

from ..api import ApiError
from ..views.raid_select import RaidListView

if TYPE_CHECKING:
    from ..client import NSNLBot

log = logging.getLogger("nsnl.bot")


def setup(bot: NSNLBot) -> None:
    @bot.tree.command(name="raids", description="Browse upcoming raids and request to join")
    async def raids(interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True, thinking=True)
        try:
            # First touch also syncs the member so admins can assign a class later.
            await bot.ensure_member(interaction.user)
            upcoming = await bot.api.upcoming_raids()
        except ApiError as exc:
            log.warning("/raids API error: %s", exc)
            await interaction.followup.send(
                "Couldn't load the raid list right now. Please try again shortly.",
                ephemeral=True,
            )
            return

        if not upcoming:
            await interaction.followup.send(
                "There are no upcoming raids this week.", ephemeral=True
            )
            return

        await interaction.followup.send(
            "Pick a raid to see details and request to join:",
            view=RaidListView(bot, upcoming),
            ephemeral=True,
        )
