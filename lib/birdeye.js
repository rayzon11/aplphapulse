import axios from "axios";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";
const DEFAULT_CHAIN = "solana";

function ensureApiKey() {
  if (!process.env.BIRDEYE_API_KEY) {
    throw new Error("Missing BIRDEYE_API_KEY environment variable.");
  }
}

function buildHeaders() {
  ensureApiKey();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-KEY": process.env.BIRDEYE_API_KEY,
    "x-chain": DEFAULT_CHAIN
  };
}

const birdeyeClient = axios.create({
  baseURL: BIRDEYE_BASE_URL,
  timeout: 20_000
});

function unwrapData(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if ("data" in payload) {
    return payload.data;
  }

  return payload;
}

function extractCollection(payload) {
  const data = unwrapData(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const candidates = ["tokens", "items", "list", "rows", "data", "result"];
  for (const key of candidates) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  return [];
}

function extractEntity(payload) {
  const data = unwrapData(payload);

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const candidates = ["item", "token", "result", "security"];
  for (const key of candidates) {
    if (data[key] && typeof data[key] === "object" && !Array.isArray(data[key])) {
      return data[key];
    }
  }

  return data;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toIsoTime(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    const milliseconds = value > 9_999_999_999 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeBaseToken(token) {
  return {
    address: token?.address || token?.mint || token?.tokenAddress || token?.token_address || "",
    name: token?.name || token?.tokenName || "Unknown Token",
    symbol: token?.symbol || token?.tokenSymbol || "UNKNOWN",
    logoURI: token?.logoURI || token?.logo_url || token?.logo || "",
    decimals: toNumber(token?.decimals) || 0,
    price: toNumber(token?.price) ?? toNumber(token?.value),
    liquidity: toNumber(token?.liquidity) ?? toNumber(token?.liquidityUSD),
    volume24hUSD:
      toNumber(token?.volume24hUSD) ??
      toNumber(token?.v24hUSD) ??
      toNumber(token?.volume24h) ??
      toNumber(token?.volume),
    priceChange24h:
      toNumber(token?.priceChange24hPercent) ??
      toNumber(token?.price_change_24h_percent) ??
      toNumber(token?.priceChange24h) ??
      toNumber(token?.change24h) ??
      toNumber(token?.priceChangePercent24h),
    rank: toNumber(token?.rank),
    listedAt: toIsoTime(
      token?.listedAt || token?.liquidityAddedAt || token?.createdAt || token?.listingTime || token?.launchTime
    )
  };
}

function normalizeSecurity(rawSecurity) {
  const security = extractEntity(rawSecurity);

  return {
    isHoneypot:
      security?.is_honeypot ??
      security?.isHoneypot ??
      security?.honeypot ??
      security?.honeypot_status ??
      false,
    holders:
      toNumber(security?.holder) ??
      toNumber(security?.holders) ??
      toNumber(security?.holderCount) ??
      toNumber(security?.totalHolders) ??
      0,
    liquidity:
      toNumber(security?.liquidity) ??
      toNumber(security?.liquidityUSD) ??
      toNumber(security?.liquidity_usd),
    creatorBalance: toNumber(security?.creatorBalance),
    ownerBalance: toNumber(security?.ownerBalance),
    top10HolderPercent:
      toNumber(security?.top10HolderPercent) ??
      toNumber(security?.top10_holder_percent) ??
      toNumber(security?.top10HolderPercentage),
    raw: security
  };
}

function buildAddressMap(payload) {
  const data = unwrapData(payload);

  if (!data || typeof data !== "object") {
    return new Map();
  }

  const candidates = [];

  if (Array.isArray(data)) {
    candidates.push(...data);
  }

  if (Array.isArray(data.items)) {
    candidates.push(...data.items);
  }

  if (Array.isArray(data.tokens)) {
    candidates.push(...data.tokens);
  }

  if (Array.isArray(data.data)) {
    candidates.push(...data.data);
  }

  const map = new Map();

  for (const item of candidates) {
    const address = item?.address || item?.tokenAddress || item?.token_address;
    if (address) {
      map.set(address, item);
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value) && (value.address || key.length > 20)) {
      map.set(value.address || key, { address: value.address || key, ...value });
    }
  }

  return map;
}

async function birdeyeGet(path, params = {}) {
  const response = await birdeyeClient.get(path, {
    headers: buildHeaders(),
    params
  });

  return response.data;
}

async function birdeyePost(path, params = {}, data = {}) {
  const response = await birdeyeClient.post(path, data, {
    headers: buildHeaders(),
    params
  });

  return response.data;
}

export async function getNewTokens({ limit = 8, memePlatformEnabled = true } = {}) {
  const payload = await birdeyeGet("/defi/v2/tokens/new_listing", {
    time_to: Math.floor(Date.now() / 1000),
    limit,
    meme_platform_enabled: memePlatformEnabled
  });

  return extractCollection(payload).map((token) => ({
    ...normalizeBaseToken(token),
    sources: ["new"]
  }));
}

export async function getTrendingTokens({ limit = 8, sortBy = "rank", sortType = "asc" } = {}) {
  const payload = await birdeyeGet("/defi/token_trending", {
    sort_by: sortBy,
    sort_type: sortType,
    offset: 0,
    limit
  });

  return extractCollection(payload).map((token) => ({
    ...normalizeBaseToken(token),
    sources: ["trending"]
  }));
}

export async function getTokenSecurity(address) {
  if (!address) {
    return normalizeSecurity({});
  }

  const payload = await birdeyeGet("/defi/token_security", { address });
  return normalizeSecurity(payload);
}

export async function getMultiPrice(addresses) {
  if (!addresses.length) {
    return new Map();
  }

  const payload = await birdeyeGet("/defi/multi_price", {
    list_address: addresses.join(","),
    include_liquidity: true
  });

  return buildAddressMap(payload);
}

export async function getPriceStats(addresses) {
  if (!addresses.length) {
    return new Map();
  }

  const payload = await birdeyePost(
    "/defi/v3/price/stats/multiple",
    { list_timeframe: "24h" },
    { list_address: addresses.join(",") }
  );

  return buildAddressMap(payload);
}

export async function getPriceVolume(addresses) {
  if (!addresses.length) {
    return new Map();
  }

  const payload = await birdeyePost("/defi/price_volume/multi", {}, { list_address: addresses.join(",") });
  return buildAddressMap(payload);
}

export function mergeLiveMetrics(tokens, priceMap, statsMap, volumeMap) {
  return tokens.map((token) => {
    const priceEntry = priceMap.get(token.address) || {};
    const statsEntry = statsMap.get(token.address) || {};
    const volumeEntry = volumeMap.get(token.address) || {};

    return {
      ...token,
      price:
        token.price ??
        toNumber(priceEntry?.value) ??
        toNumber(priceEntry?.price) ??
        toNumber(statsEntry?.price) ??
        toNumber(statsEntry?.current),
      liquidity:
        token.liquidity ??
        toNumber(priceEntry?.liquidity) ??
        toNumber(priceEntry?.liquidityUSD) ??
        toNumber(statsEntry?.liquidity),
      volume24hUSD:
        token.volume24hUSD ??
        toNumber(volumeEntry?.volume24hUSD) ??
        toNumber(volumeEntry?.v24hUSD) ??
        toNumber(volumeEntry?.volume24h) ??
        toNumber(volumeEntry?.volume) ??
        toNumber(statsEntry?.volume24hUSD),
      priceChange24h:
        token.priceChange24h ??
        toNumber(statsEntry?.priceChangePercent) ??
        toNumber(statsEntry?.priceChange24hPercent) ??
        toNumber(statsEntry?.changePercent24h) ??
        toNumber(statsEntry?.change24h)
    };
  });
}
