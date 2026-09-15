# Discord Bot

A Node.js Discord bot with a small, extensible command system and secure token configuration.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/discord-bot run dev` — run the Discord bot
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `bots/discord-bot/src/index.js` — Discord connection and the basic `!ping` command
- `bots/discord-bot/package.json` — bot scripts and runtime settings
- `DISCORD_BOT_TOKEN` — required secret; never commit or paste it into source

## Architecture decisions

- The bot uses the standard `discord.js` package so the starter remains easy to understand.
- The first version listens for guild messages and replies to `!ping`.
- Message Content intent must be enabled in the Discord Developer Portal for prefix commands to work.

## Product

- `!ping` checks that the bot is online.
- `!help` lists available commands.
- `!about` explains what the bot does.

## Gotchas

- A bot token is different from a Discord user OAuth token. The bot requires `DISCORD_BOT_TOKEN`.
- Discord's Message Content privileged intent must be enabled before prefix commands can read message text.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
