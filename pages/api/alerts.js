import { buildAlphaSnapshot } from "../../lib/ai";
import { sendHighAlphaAlert } from "../../bot/telegramBot";

const cacheStore = globalThis.__alphaPulseApiAlertCache || new Map();
globalThis.__alphaPulseApiAlertCache = cacheStore;

function isAuthorizedCron(req) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!secret) {
    return false;
  }

  return authHeader === `Bearer ${secret}`;
}

function pruneCache() {
  const now = Date.now();

  for (const [key, expiresAt] of cacheStore.entries()) {
    if (expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}

function markAlerted(token) {
  const cacheKey = `${token.address}:${token.prediction?.label}`;
  cacheStore.set(cacheKey, Date.now() + 6 * 60 * 60 * 1000);
}

function wasRecentlyAlerted(token) {
  const cacheKey = `${token.address}:${token.prediction?.label}`;
  return cacheStore.has(cacheKey);
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (process.env.CRON_SECRET && req.headers.authorization && !isAuthorizedCron(req)) {
    return res.status(401).json({ error: "Unauthorized cron invocation." });
  }

  try {
    pruneCache();

    const snapshot = await buildAlphaSnapshot();
    const shouldNotify = req.method === "POST" || isAuthorizedCron(req) || req.query.notify === "true";

    let alertsSent = 0;

    if (shouldNotify && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const alertCandidates = snapshot.highAlphaPicks.filter((token) => !wasRecentlyAlerted(token)).slice(0, 3);
      const results = await Promise.allSettled(alertCandidates.map((token) => sendHighAlphaAlert(token)));

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          alertsSent += 1;
          markAlerted(alertCandidates[index]);
        }
      });
    }

    return res.status(200).json({
      ...snapshot,
      alertsSent
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to build alpha snapshot."
    });
  }
}
