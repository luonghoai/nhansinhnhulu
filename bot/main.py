"""Entrypoint: load config, start the notify server, run the Discord bot.

Both the aiohttp `/notify` server and the discord.py gateway connection share a
single asyncio event loop. We start the server inside `setup_hook` (via the
bot's lifecycle) and run the bot with `bot.start()`.
"""

from __future__ import annotations

import asyncio
import logging

from bot.client import NSNLBot, on_app_command_error
from bot.config import ConfigError, load_config
from bot.notify_server import start_notify_server

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("nsnl.bot")


async def run() -> None:
    config = load_config()
    bot = NSNLBot(config)
    bot.tree.on_error = on_app_command_error

    runner = await start_notify_server(bot, config.notify_port)
    try:
        await bot.start(config.discord_bot_token)
    finally:
        await runner.cleanup()


def main() -> None:
    try:
        asyncio.run(run())
    except ConfigError as exc:
        raise SystemExit(f"Configuration error: {exc}") from exc
    except KeyboardInterrupt:
        log.info("Shutting down")


if __name__ == "__main__":
    main()
