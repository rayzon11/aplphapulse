# AlphaPulse Pro

AlphaPulse Pro is a production-ready, AI-powered crypto alpha intelligence platform built with Next.js 14, Tailwind CSS, Framer Motion, Birdeye market data, and a Telegram bot worker. It helps surface early token listings, track real-time trending tokens, score contract safety, estimate short-term conviction, and push high-alpha alerts into Telegram.

## Features

- Real-time Birdeye-powered dashboard for new listings and trending tokens
- Safety score engine with liquidity, holders, and honeypot heuristics
- Rule-based AI prediction labels: `STRONG BUY`, `WATCH`, `AVOID`
- High Alpha Picks section filtered by score and conviction
- Premium dark trading-terminal UI with glassmorphism and motion
- Next.js API route for aggregated analytics and alert dispatching
- Telegram bot with `/start`, `/status`, and `/scan` commands
- Vercel cron configuration for scheduled alert scans

## Project Structure

```text
/app
  layout.js
  page.js
  globals.css

/components
  Loader.js
  Navbar.js
  Section.js
  TokenCard.js

/lib
  ai.js
  birdeye.js
  scoring.js

/pages/api
  alerts.js

/bot
  telegramBot.js

.env.local
package.json
README.md
```

## Environment Variables

Copy [`.env.example`](C:/Users/admin/Documents/Codex/2026-04-28/you-are-an-expert-full-stack/.env.example) to `.env.local`, then fill in:

```env
BIRDEYE_API_KEY=your_birdeye_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
CRON_SECRET=your_optional_vercel_cron_secret
```

`CRON_SECRET` is optional locally, but recommended for Vercel cron security. Vercel automatically sends it as an `Authorization: Bearer ...` header when configured.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the web app:

```bash
npm run dev
```

3. Open the terminal UI:

```text
http://localhost:3000
```

4. Start the Telegram bot in a separate terminal:

```bash
npm run bot
```

## How It Works

### 1. New Token Radar

AlphaPulse Pro pulls fresh listings from Birdeye:

- `GET /defi/v2/tokens/new_listing`

The app enriches listings with live market metrics and shows:

- Token name
- Symbol
- Price
- Volume
- Liquidity

### 2. Trending Tokens

Trending discovery comes from:

- `GET /defi/token_trending`

The dashboard displays:

- Rank
- 24h price change
- Volume
- Liquidity

### 3. Safety Score

The safety engine starts every token at `50` and applies:

- `+20` if liquidity is greater than `$100,000`
- `+15` if holders are greater than `1,000`
- `+15` if the token is not flagged as a honeypot

The final score is capped at `100`.

### 4. AI Prediction Engine

The local AI layer is rule-based and fully offline:

- `STRONG BUY` for aligned momentum, trend, and high safety
- `WATCH` for medium-strength setups
- `AVOID` when liquidity, safety, or momentum are weak

### 5. Alpha Alerts

High Alpha Picks are tokens where:

- `score > 70`
- `prediction.label === "STRONG BUY"`

Alerts can be triggered in three ways:

- `POST /api/alerts`
- Vercel cron hitting `GET /api/alerts`
- Telegram `/scan` command or background polling loop

## API Route

The main backend endpoint is:

- [`pages/api/alerts.js`](C:/Users/admin/Documents/Codex/2026-04-28/you-are-an-expert-full-stack/pages/api/alerts.js)

### `GET /api/alerts`

Returns:

- `highAlphaPicks`
- `newListings`
- `trendingTokens`
- `summary`
- `generatedAt`

### `POST /api/alerts`

Builds a fresh snapshot and sends Telegram alerts for current high-alpha candidates.

## Telegram Bot

The Telegram worker lives in:

- [`bot/telegramBot.js`](C:/Users/admin/Documents/Codex/2026-04-28/you-are-an-expert-full-stack/bot/telegramBot.js)

Commands:

- `/start` shows basic help
- `/status` shows bot configuration status
- `/scan` runs a live scan and sends new high-alpha alerts

The bot also runs an internal scheduled sweep every 3 minutes while the process is alive.

## Deployment on Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add these environment variables in the Vercel dashboard:
   - `BIRDEYE_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `CRON_SECRET`
4. Deploy.

The included [`vercel.json`](C:/Users/admin/Documents/Codex/2026-04-28/you-are-an-expert-full-stack/vercel.json) schedules `/api/alerts` every 15 minutes.

Important:

- Vercel cron schedules use UTC.
- Vercel Hobby plans only support once-daily cron jobs. For 15-minute scans, use Vercel Pro or run the Telegram bot as a persistent worker on Railway, Render, Fly.io, or a VPS.

## Birdeye and Vercel References

- Birdeye new listings: [docs.birdeye.so/reference/get-defi-v2-tokens-new_listing](https://docs.birdeye.so/reference/get-defi-v2-tokens-new_listing)
- Birdeye trending: [docs.birdeye.so/docs/trending-tokens](https://docs.birdeye.so/docs/trending-tokens)
- Birdeye token security: [docs.birdeye.so/reference/get-defi-token_security](https://docs.birdeye.so/reference/get-defi-token_security)
- Vercel cron jobs: [vercel.com/docs/cron-jobs](https://vercel.com/docs/cron-jobs)
- Vercel cron auth with `CRON_SECRET`: [vercel.com/docs/cron-jobs/manage-cron-jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

## Notes

- The API layer uses defensive normalization because Birdeye response shapes can vary by endpoint and chain.
- Alert deduplication is in-memory for this starter build. For distributed multi-instance production environments, back it with Redis or another shared store.
- The frontend auto-refreshes every 60 seconds.

## Run Checklist

```bash
npm install
npm run dev
npm run bot
```

Then visit `http://localhost:3000`.
