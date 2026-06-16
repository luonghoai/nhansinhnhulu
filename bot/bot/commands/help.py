"""/help — list all available bot commands (Vietnamese)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import discord

if TYPE_CHECKING:
    from ..client import NSNLBot

log = logging.getLogger("nsnl.bot")

# (name, mô tả tiếng Việt) — giữ đồng bộ với các lệnh đã đăng ký trong setup_hook.
COMMANDS: list[tuple[str, str]] = [
    ("raids", "Xem danh sách raid sắp diễn ra và đăng ký tham gia."),
    ("myplan", "Xem các raid bạn đã được xếp lịch trong tuần này."),
    ("help", "Hiển thị danh sách tất cả các lệnh của bot."),
]


def setup(bot: NSNLBot) -> None:
    @bot.tree.command(name="help", description="Hiển thị tất cả các lệnh hiện có")
    async def help_command(interaction: discord.Interaction) -> None:
        embed = discord.Embed(
            title="Danh sách lệnh — Nhân Sinh Như Lữ",
            description="Dưới đây là tất cả các lệnh bạn có thể sử dụng:",
            colour=discord.Colour.from_str("#34D399"),
        )
        for name, summary in COMMANDS:
            embed.add_field(name=f"/{name}", value=summary, inline=False)
        embed.set_footer(text="Gõ / để xem gợi ý lệnh trong Discord.")
        await interaction.response.send_message(embed=embed, ephemeral=True)
