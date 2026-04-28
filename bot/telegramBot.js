import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { buildAlphaSnapshot } from "../lib/ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const botAlertCache = globalThis.__alphaPulseBotAlertCache || new Map();
globalThis.__alphaPulseBotAlertCache = botAlertCache;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: numeric >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 2
  }).format(numeric);
}

export function formatHighAlphaMessage(token) {
  return [
    "🚀 <b>HIGH ALPHA ALERT</b>",
    `Token: <b>${escapeHtml(token.symbol || token.name || "UNKNOWN")}</b>`,
    `Score: <b>${token.score}</b>`,
    `Prediction: <b>${escapeHtml(token?.prediction?.label || "WATCH")}</b>`,
    `Confidence: <b>${token?.prediction?.confidence || 0}%</b>`,
    `Price: <b>${escapeHtml(formatCurrency(token.price))}</b>`,
    `Volume: <b>${escapeHtml(formatCurrency(token.volume24hUSD))}</b>`
  ].join("\n");
}

function createNonPollingBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  }

  return new TelegramBot(token, { polling: false });
}

function getTargetChatId(chatId) {
  const resolvedChatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!resolvedChatId) {
    throw new Error("Missing TELEGRAM_CHAT_ID environment variable.");
  }

  return resolvedChatId;
}

export async function sendHighAlphaAlert(token, options = {}) {
  const bot = options.bot || createNonPollingBot();
  const chatId = getTargetChatId(options.chatId);

  return bot.sendMessage(chatId, formatHighAlphaMessage(token), {
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
}

function cacheKey(token) {
  return `${token.address}:${token.prediction?.label}`;
}

function markSeen(token) {
  botAlertCache.set(cacheKey(token), Date.now() + 6 * 60 * 60 * 1000);
}

function isSeen(token) {
  return botAlertCache.has(cacheKey(token));
}

function pruneSeen() {
  const now = Date.now();

  for (const [key, expiresAt] of botAlertCache.entries()) {
    if (expiresAt <= now) {
      botAlertCache.delete(key);
    }
  }
}

async function scanAndBroadcast(bot, replyChatId) {
  pruneSeen();

  const snapshot = await buildAlphaSnapshot();
  const picks = snapshot.highAlphaPicks.filter((token) => !isSeen(token));

  for (const token of picks.slice(0, 5)) {
    await sendHighAlphaAlert(token, { bot, chatId: replyChatId || process.env.TELEGRAM_CHAT_ID });
    markSeen(token);
  }

  return snapshot;
}

export function startTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  }

  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  bot.onText(/\/start/, async (message) => {
    await bot.sendMessage(
      message.chat.id,
      [
        "AlphaPulse Pro is online.",
        "Use /scan to run an on-demand market sweep.",
        "Use /status to see the current alerting configuration."
      ].join("\n")
    );
  });

  bot.onText(/\/status/, async (message) => {
    await bot.sendMessage(
      message.chat.id,
      [
        "AlphaPulse Pro status",
        `Chat ID: ${process.env.TELEGRAM_CHAT_ID || "not configured"}`,
        `Birdeye key: ${process.env.BIRDEYE_API_KEY ? "loaded" : "missing"}`,
        `Polling: active`
      ].join("\n")
    );
  });

  bot.onText(/\/scan/, async (message) => {
    try {
      const snapshot = await scanAndBroadcast(bot, message.chat.id);
      await bot.sendMessage(
        message.chat.id,
        [
          "Scan completed.",
          `High alpha picks: ${snapshot.highAlphaPicks.length}`,
          `New listings tracked: ${snapshot.newListings.length}`,
          `Trending tokens tracked: ${snapshot.trendingTokens.length}`
        ].join("\n")
      );
    } catch (error) {
      await bot.sendMessage(message.chat.id, `Scan failed: ${error.message}`);
    }
  });

  setInterval(async () => {
    try {
      await scanAndBroadcast(bot);
    } catch (error) {
      console.error("Scheduled Telegram scan failed:", error.message);
    }
  }, 3 * 60 * 1000);

  console.log("AlphaPulse Pro Telegram bot is running.");
  return bot;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startTelegramBot();
}
