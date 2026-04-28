import axios from "axios";

const DEX_SCREENER_BASE_URL = "https://api.dexscreener.com";
const HONEYPOT_BASE_URL = "https://api.honeypot.is";
const DISCOVERY_POOL_SIZE = 24;
const BATCH_SIZE = 30;

const SUPPORTED_CHAINS = {
  ethereum: {
    honeypotChainId: 1,
    label: "Ethereum"
  },
  bsc: {
    honeypotChainId: 56,
    label: "BNB Chain"
  },
  base: {
    honeypotChainId: 8453,
    label: "Base"
  }
};

const dexClient = axios.create({
  baseURL: DEX_SCREENER_BASE_URL,
  timeout: 20_000,
  headers: {
    Accept: "application/json"
  }
});

const honeypotClient = axios.create({
  baseURL: HONEYPOT_BASE_URL,
  timeout: 20_000,
  headers: {
    Accept: "application/json"
  }
});

function chunk(list, size) {
  const chunks = [];

  for (let index = 0; index < list.length; index += size) {
    chunks.push(list.slice(index, index + size));
  }

  return chunks;
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

function resolveChainLabel(chainId) {
  return SUPPORTED_CHAINS[chainId]?.label || chainId;
}

function normalizeImageUrl(value) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://cdn.dexscreener.com/cms/images/${value}?width=800&height=800&fit=crop&quality=95&format=auto`;
}

function normalizeLinks(links = []) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((link) => ({
      type: link?.type || "link",
      label: link?.label || link?.type || "Link",
      url: link?.url || ""
    }))
    .filter((link) => link.url);
}

function getTokenFromPair(pair, tokenAddress) {
  const baseAddress = pair?.baseToken?.address?.toLowerCase();
  const quoteAddress = pair?.quoteToken?.address?.toLowerCase();
  const requestedAddress = tokenAddress?.toLowerCase();

  if (requestedAddress && quoteAddress === requestedAddress && baseAddress !== requestedAddress) {
    return pair.quoteToken;
  }

  return pair.baseToken;
}

function scorePair(pair) {
  const liquidity = toNumber(pair?.liquidity?.usd) || 0;
  const volume24h = toNumber(pair?.volume?.h24) || 0;
  const transactions24h = (toNumber(pair?.txns?.h24?.buys) || 0) + (toNumber(pair?.txns?.h24?.sells) || 0);
  const boosts = toNumber(pair?.boosts?.active) || 0;

  return liquidity * 10 + volume24h + transactions24h * 100 + boosts * 1000;
}

function selectBestPairs(rawPairs, tokenLookup) {
  const grouped = new Map();

  for (const pair of rawPairs) {
    const chainId = pair?.chainId;
    const baseAddress = pair?.baseToken?.address?.toLowerCase();
    const quoteAddress = pair?.quoteToken?.address?.toLowerCase();
    const baseKey = chainId && baseAddress ? `${chainId}:${baseAddress}` : null;
    const quoteKey = chainId && quoteAddress ? `${chainId}:${quoteAddress}` : null;
    const matchedKey = baseKey && tokenLookup.has(baseKey) ? baseKey : quoteKey && tokenLookup.has(quoteKey) ? quoteKey : null;

    if (!matchedKey || !chainId) {
      continue;
    }

    const current = grouped.get(matchedKey);

    if (!current || scorePair(pair) > scorePair(current)) {
      grouped.set(matchedKey, pair);
    }
  }

  return grouped;
}

function normalizePairToken(pair, discovery = {}) {
  const token = getTokenFromPair(pair, discovery.tokenAddress);
  const chainId = pair?.chainId || discovery.chainId;

  return {
    address: token?.address || discovery.tokenAddress || "",
    chainId,
    chainLabel: resolveChainLabel(chainId),
    name: token?.name || discovery.name || "Unknown Token",
    symbol: token?.symbol || discovery.symbol || "UNKNOWN",
    logoURI: normalizeImageUrl(pair?.info?.imageUrl || discovery.logoURI),
    headerImage: normalizeImageUrl(pair?.info?.header || discovery.headerImage),
    dexUrl: pair?.url || discovery.url || "",
    pairAddress: pair?.pairAddress || "",
    dexId: pair?.dexId || "",
    price: toNumber(pair?.priceUsd),
    liquidity: toNumber(pair?.liquidity?.usd),
    volume24hUSD: toNumber(pair?.volume?.h24),
    priceChange24h: toNumber(pair?.priceChange?.h24),
    marketCap: toNumber(pair?.marketCap),
    fdv: toNumber(pair?.fdv),
    txns24h: (toNumber(pair?.txns?.h24?.buys) || 0) + (toNumber(pair?.txns?.h24?.sells) || 0),
    listedAt: toIsoTime(pair?.pairCreatedAt || discovery.updatedAt),
    links: [
      ...normalizeLinks(pair?.info?.websites),
      ...normalizeLinks(pair?.info?.socials),
      ...normalizeLinks(discovery.links)
    ],
    description: discovery.description || "",
    boosts: {
      active: toNumber(pair?.boosts?.active) || 0,
      totalAmount: toNumber(discovery.totalAmount) || 0
    },
    sources: Array.isArray(discovery.sources) ? discovery.sources : []
  };
}

async function dexGet(path) {
  const response = await dexClient.get(path);
  return response.data;
}

function normalizeDiscoveryEntry(entry, source) {
  return {
    chainId: entry?.chainId,
    tokenAddress: entry?.tokenAddress,
    updatedAt: entry?.updatedAt,
    url: entry?.url,
    logoURI: normalizeImageUrl(entry?.icon),
    headerImage: normalizeImageUrl(entry?.header),
    description: entry?.description || "",
    links: normalizeLinks(entry?.links),
    totalAmount: toNumber(entry?.totalAmount) || toNumber(entry?.amount) || 0,
    sources: [source]
  };
}

async function fetchDiscoveryEntries(kind) {
  const path = kind === "trending" ? "/token-boosts/top/v1" : "/token-profiles/latest/v1";
  const payload = await dexGet(path);

  return payload
    .map((entry) => normalizeDiscoveryEntry(entry, kind === "trending" ? "trending" : "new"))
    .filter((entry) => entry.tokenAddress && entry.chainId);
}

async function fetchTokenPairDetails(discoveryEntries) {
  const tokenLookup = new Set(discoveryEntries.map((entry) => `${entry.chainId}:${entry.tokenAddress.toLowerCase()}`));
  const groupedByChain = discoveryEntries.reduce((map, entry) => {
    const current = map.get(entry.chainId) || [];
    current.push(entry.tokenAddress);
    map.set(entry.chainId, Array.from(new Set(current)));
    return map;
  }, new Map());

  const requests = [];

  for (const [chainId, tokenAddresses] of groupedByChain.entries()) {
    for (const tokenBatch of chunk(tokenAddresses, BATCH_SIZE)) {
      requests.push(dexGet(`/tokens/v1/${chainId}/${tokenBatch.join(",")}`));
    }
  }

  const pairResponses = await Promise.all(requests);
  const rawPairs = pairResponses.flat().filter(Boolean);
  return selectBestPairs(rawPairs, tokenLookup);
}

async function hydrateDiscoveryEntries(discoveryEntries, limit) {
  const detailMap = await fetchTokenPairDetails(discoveryEntries.slice(0, DISCOVERY_POOL_SIZE));

  return discoveryEntries
    .map((entry) => {
      const key = `${entry.chainId}:${entry.tokenAddress.toLowerCase()}`;
      const pair = detailMap.get(key);

      if (!pair) {
        return null;
      }

      return normalizePairToken(pair, entry);
    })
    .filter(Boolean)
    .slice(0, limit);
}

export async function getNewTokens({ limit = 8 } = {}) {
  const discoveryEntries = await fetchDiscoveryEntries("new");
  const hydratedTokens = await hydrateDiscoveryEntries(discoveryEntries, Math.max(limit * 2, limit));

  return hydratedTokens
    .sort((left, right) => new Date(right.listedAt || 0).getTime() - new Date(left.listedAt || 0).getTime())
    .slice(0, limit);
}

export async function getTrendingTokens({ limit = 8 } = {}) {
  const discoveryEntries = await fetchDiscoveryEntries("trending");
  let hydratedTokens = await hydrateDiscoveryEntries(discoveryEntries, Math.max(limit * 2, limit));

  if (hydratedTokens.length < limit) {
    const discoveredKeys = new Set(discoveryEntries.map((entry) => `${entry.chainId}:${entry.tokenAddress.toLowerCase()}`));
    const fallbackEntries = (await fetchDiscoveryEntries("new"))
      .filter((entry) => !discoveredKeys.has(`${entry.chainId}:${entry.tokenAddress.toLowerCase()}`))
      .map((entry) => ({
        ...entry,
        sources: ["trending"]
      }));

    const fallbackTokens = await hydrateDiscoveryEntries(fallbackEntries, limit - hydratedTokens.length);
    hydratedTokens = [...hydratedTokens, ...fallbackTokens];
  }

  return hydratedTokens
    .sort((left, right) => {
      const boostGap = (right?.boosts?.totalAmount || 0) - (left?.boosts?.totalAmount || 0);
      if (boostGap !== 0) {
        return boostGap;
      }

      return (right.volume24hUSD || 0) - (left.volume24hUSD || 0);
    })
    .slice(0, limit)
    .map((token, index) => ({
      ...token,
      rank: index + 1
    }));
}

export async function getTokenSecurity(address, chainId, pairAddress) {
  const support = SUPPORTED_CHAINS[chainId];

  if (!address || !support) {
    return {
      chainId,
      supported: false,
      isHoneypot: false,
      holders: 0,
      risk: "unknown",
      riskLevel: null,
      openSource: null,
      liquidity: null,
      buyTax: null,
      sellTax: null
    };
  }

  const response = await honeypotClient.get("/v2/IsHoneypot", {
    params: {
      address,
      chainID: support.honeypotChainId,
      pair: pairAddress || undefined
    }
  });

  const payload = response.data || {};

  return {
    chainId,
    supported: true,
    isHoneypot: Boolean(payload?.honeypotResult?.isHoneypot),
    holders: toNumber(payload?.token?.totalHolders) || 0,
    risk: payload?.summary?.risk || "unknown",
    riskLevel: toNumber(payload?.summary?.riskLevel),
    openSource:
      payload?.contractCode?.openSource ??
      payload?.contractCode?.rootOpenSource ??
      null,
    liquidity: toNumber(payload?.pair?.liquidity),
    buyTax: toNumber(payload?.simulationResult?.buyTax),
    sellTax: toNumber(payload?.simulationResult?.sellTax),
    raw: payload
  };
}
