# Discord Bot

Bot básico em Node.js que responde `!ping`.

## Setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Add a Bot user and copy its token.
3. In the bot settings, enable the **Message Content Intent** under Privileged Gateway Intents.
4. Invite the bot to a server with the `View Channels`, `Send Messages`, and `Read Message History` permissions.
5. Save the token as the `DISCORD_BOT_TOKEN` project secret.

The token must be a **bot token**, not a Discord user OAuth token.

## Run

```bash
pnpm --filter @workspace/discord-bot run dev
```

For a compiled run:

```bash
pnpm --filter @workspace/discord-bot run build
pnpm --filter @workspace/discord-bot run start
```

## Commands

- `!ping` — verifica se o bot está online

Para adicionar comandos, edite o evento `MessageCreate` em `src/index.js`.