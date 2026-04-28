function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function calculateSafetyScore(token) {
  const liquidity = toNumber(token?.liquidity ?? token?.security?.liquidity);
  const holders = toNumber(token?.security?.holders);
  const isHoneypot = Boolean(token?.security?.isHoneypot);

  let score = 50;
  const breakdown = [
    { label: "Base model", value: 50, passed: true }
  ];

  if (liquidity > 100_000) {
    score += 20;
    breakdown.push({ label: "Liquidity > $100k", value: 20, passed: true });
  } else {
    breakdown.push({ label: "Liquidity > $100k", value: 20, passed: false });
  }

  if (holders > 1_000) {
    score += 15;
    breakdown.push({ label: "Holders > 1k", value: 15, passed: true });
  } else {
    breakdown.push({ label: "Holders > 1k", value: 15, passed: false });
  }

  if (!isHoneypot) {
    score += 15;
    breakdown.push({ label: "Not honeypot", value: 15, passed: true });
  } else {
    breakdown.push({ label: "Not honeypot", value: 15, passed: false });
  }

  return {
    score: Math.min(score, 100),
    breakdown,
    inputs: {
      liquidity,
      holders,
      isHoneypot
    }
  };
}
