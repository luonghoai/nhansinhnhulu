"""The discord.py bot subclass: command tree, startup sync, shared API client."""

from __future__ import annotations

import logging

import discord
from discord import app_commands
from discord.ext import commands

from .api import WebApi
from .config import Config

log = logging.getLogger("nsnl.bot")


def avatar_url(user: discord.abc.User) -> str:
    return str(user.display_avatar.url)


def display_name(user: discord.abc.User) -> str:
    return user.global_name or user.name


class NSNLBot(commands.Bot):
    def __init__(self, config: Config) -> None:
        # Slash commands + DMs work with default intents; no privileged intents
        # are needed (we read global_name/avatar straight off the interaction).
        super().__init__(command_prefix=commands.when_mentioned, intents=discord.Intents.default())
        self.config = config
        self.api = WebApi(config.web_api_base_url, config.bot_api_secret)

    async def setup_hook(self) -> None:
        # Import here to avoid a circular import (commands reference the bot type).
        from .commands import help, myplan, raids

        help.setup(self)
        myplan.setup(self)
        raids.setup(self)

        if self.config.guild_id is not None:
            guild = discord.Object(id=self.config.guild_id)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            log.info("Synced slash commands to dev guild %s", self.config.guild_id)
        else:
            await self.tree.sync()
            log.info("Synced slash commands globally (may take up to 1h to appear)")

    async def on_ready(self) -> None:
        log.info("Logged in as %s (id=%s)", self.user, getattr(self.user, "id", "?"))

    async def close(self) -> None:
        await self.api.aclose()
        await super().close()

    async def ensure_member(self, user: discord.abc.User) -> dict:
        """Idempotently sync the interacting user into the web DB (first-touch)."""
        return await self.api.ensure_member(str(user.id), display_name(user), avatar_url(user))


async def on_app_command_error(
    interaction: discord.Interaction, error: app_commands.AppCommandError
) -> None:
    """Last-resort handler so one failed interaction never crashes the loop."""
    log.exception("Unhandled app command error", exc_info=error)
    msg = "Something went wrong. Please try again in a moment."
    try:
        if interaction.response.is_done():
            await interaction.followup.send(msg, ephemeral=True)
        else:
            await interaction.response.send_message(msg, ephemeral=True)
    except discord.HTTPException:
        pass
