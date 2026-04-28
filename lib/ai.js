import { getNewTokens, getTokenSecurity, getTrendingTokens } from "./marketData";
import { calculateSafetyScore } from "./scoring";

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function mergeTokenData(existing, incoming) {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    ...incoming,
    sources: Array.from(new Set([...(existing.sources || []), ...(incoming.sources || [])])),
    listedAt: existing.listedAt || incoming.listedAt,
    logoURI: existing.logoURI || incoming.logoURI,
    name: existing.name !== "Unknown Token" ? existing.name : incoming.name,
    symbol: existing.symbol !== "UNKNOWN" ? existing.symbol : incoming.symbol,
    pairAddress: existing.pairAddress || incoming.pairAddress,
    chainId: existing.chainId || incoming.chainId,
    chainLabel: existing.chainLabel || incoming.chainLabel
  };
}

function computeSignalStrength(token) {
  const score = toNumber(token.score);
  const volume = toNumber(token.volume24hUSD);
  const priceChange = toNumber(token.priceChange24h);
  const liquidity = toNumber(token.liquidity);
  const rank = toNumber(token.rank, 999);
  const holders = toNumber(token?.security?.holders);
  const boostStrength = toNumber(token?.boosts?.totalAmount);

  const volumeSpike = volume > 250_000 || (volume > 100_000 && priceChange > 8);
  const trendingSignal = (token.sources || []).includes("trending") || rank <= 25 || boostStrength >= 100;
  const resilienceSignal = liquidity > 100_000 && holders > 1_000;

  if (volumeSpike && trendingSignal && score >= 75 && resilienceSignal) {
    const confidence = Math.min(
      97,
      Math.round(72 + Math.min(score, 100) * 0.18 + Math.min(priceChange, 30) * 0.25 + (volume > 750_000 ? 6 : 0))
    );

    return {
      label: "STRONG BUY",
      confidence,
      rationale: [
        "Volume expansion is elevated",
        "Momentum is confirmed by live trending signals",
        "Safety model cleared the premium threshold"
      ]
    };
  }

  if (score >= 60 && (trendingSignal || volume > 75_000 || priceChange > 5)) {
    const confidence = Math.min(
      84,
      Math.round(55 + Math.min(score, 100) * 0.12 + (trendingSignal ? 6 : 0) + (priceChange > 5 ? 4 : 0))
    );

    return {
      label: "WATCH",
      confidence,
      rationale: [
        "Some momentum conditions are present",
        "Token needs stronger confirmation before conviction",
        "Safety and liquidity are acceptable but not dominant"
      ]
    };
  }

  return {
    label: "AVOID",
    confidence: Math.max(40, Math.round(45 + score * 0.08)),
    rationale: [
      "Momentum is weak or liquidity is thin",
      "Short-term conviction is not strong enough",
      "Keep it on radar only if market structure improves"
    ]
  };
}

export function predictToken(token) {
  return computeSignalStrength(token);
}

function tokenKey(token) {
  return `${token.chainId}:${token.address}`;
}

async function settleSecurity(tokens) {
  const results = await Promise.allSettled(
    tokens.map((token) => getTokenSecurity(token.address, token.chainId, token.pairAddress))
  );

  return results.reduce((map, result, index) => {
    map.set(
      tokenKey(tokens[index]),
      result.status === "fulfilled"
        ? result.value
        : { supported: false, isHoneypot: false, holders: 0, risk: "unknown" }
    );
    return map;
  }, new Map());
}

function sortByPriority(tokens) {
  return [...tokens].sort((left, right) => {
    const rightConfidence = toNumber(right?.prediction?.confidence);
    const leftConfidence = toNumber(left?.prediction?.confidence);

    if (rightConfidence !== leftConfidence) {
      return rightConfidence - leftConfidence;
    }

    if (toNumber(right.score) !== toNumber(left.score)) {
      return toNumber(right.score) - toNumber(left.score);
    }

    return toNumber(right.volume24hUSD) - toNumber(left.volume24hUSD);
  });
}

export async function buildAlphaSnapshot({ newLimit = 8, trendingLimit = 8 } = {}) {
  const [rawNewListings, rawTrendingTokens] = await Promise.all([
    getNewTokens({ limit: newLimit }),
    getTrendingTokens({ limit: trendingLimit })
  ]);

  const uniqueTokens = new Map();

  for (const token of [...rawNewListings, ...rawTrendingTokens]) {
    uniqueTokens.set(tokenKey(token), mergeTokenData(uniqueTokens.get(tokenKey(token)), token));
  }

  const mergedTokens = Array.from(uniqueTokens.values()).filter((token) => token.address && token.chainId);
  const securityMap = await settleSecurity(mergedTokens);

  const enrichedTokens = mergedTokens.map((token) => {
    const security = securityMap.get(tokenKey(token)) || { isHoneypot: false, holders: 0, supported: false };
    const scoreCard = calculateSafetyScore({ ...token, security });
    const enrichedToken = {
      ...token,
      security,
      score: scoreCard.score,
      scoreBreakdown: scoreCard.breakdown
    };

    const prediction = predictToken(enrichedToken);

    return {
      ...enrichedToken,
      prediction,
      rationale: prediction.rationale
    };
  });

  const enrichedMap = new Map(enrichedTokens.map((token) => [tokenKey(token), token]));
  const newListings = rawNewListings.map((token) => enrichedMap.get(tokenKey(token)) || token);
  const trendingTokens = rawTrendingTokens.map((token) => enrichedMap.get(tokenKey(token)) || token);
  const highAlphaPicks = sortByPriority(
    enrichedTokens.filter((token) => token.score > 70 && token?.prediction?.label === "STRONG BUY")
  );

  return {
    generatedAt: new Date().toISOString(),
    highAlphaPicks,
    newListings,
    trendingTokens,
    summary: {
      alphaCount: highAlphaPicks.length,
      avgScore: enrichedTokens.length
        ? Math.round(enrichedTokens.reduce((total, token) => total + toNumber(token.score), 0) / enrichedTokens.length)
        : 0,
      newListings: newListings.length,
      trendingCount: trendingTokens.length
    }
  };
}
