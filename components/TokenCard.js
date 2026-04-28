"use client";

import { motion } from "framer-motion";

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  const numeric = Number(value);
  if (Math.abs(numeric) < 1) {
    return `$${numeric.toFixed(4)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: numeric >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 2
  }).format(numeric);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  const numeric = Number(value);
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function formatShortDate(value) {
  if (!value) {
    return "Live";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Live" : date.toLocaleString();
}

function getPredictionTone(label) {
  if (label === "STRONG BUY") {
    return "text-emerald-300 border-emerald-400/20 bg-emerald-400/10";
  }

  if (label === "WATCH") {
    return "text-amber-200 border-amber-300/20 bg-amber-300/10";
  }

  return "text-rose-200 border-rose-300/20 bg-rose-300/10";
}

export default function TokenCard({ token, index = 0, variant = "default" }) {
  const predictionLabel = token?.prediction?.label || "WATCH";
  const sourceText = (token?.sources || []).map((source) => source.toUpperCase()).join(" • ");

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -5, scale: 1.01 }}
      className={`glass-card group relative overflow-hidden p-5 ${
        variant === "alpha" ? "border-accent/20 shadow-[0_0_0_1px_rgba(0,255,214,0.14),0_26px_70px_rgba(0,0,0,0.42)]" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,214,0.14),transparent_30%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {token.logoURI ? (
              <img
                src={token.logoURI}
                alt={`${token.symbol || token.name} logo`}
                className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-display text-lg font-bold text-accent">
                {(token.symbol || token.name || "?").slice(0, 1)}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold text-white">{token.symbol || "UNKNOWN"}</p>
              <p className="truncate text-sm text-slate-400">{token.name || "Unnamed token"}</p>
            </div>
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getPredictionTone(
              predictionLabel
            )}`}
          >
            {predictionLabel}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {token.chainLabel ? <span className="pill text-slate-200">{token.chainLabel}</span> : null}
          {sourceText ? <span className="pill text-slate-200">{sourceText}</span> : null}
          {token.rank ? <span className="pill text-slate-200">Rank #{token.rank}</span> : null}
          <span className="pill text-slate-200">{formatShortDate(token.listedAt)}</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatBlock label="Price" value={formatCurrency(token.price)} />
          <StatBlock
            label="24h Change"
            value={formatPercent(token.priceChange24h)}
            tone={Number(token.priceChange24h) >= 0 ? "text-emerald-300" : "text-rose-300"}
          />
          <StatBlock label="24h Volume" value={formatCurrency(token.volume24hUSD)} />
          <StatBlock label="Liquidity" value={formatCurrency(token.liquidity)} />
        </div>

        <div className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
          <MiniMetric label="Safety Score" value={`${token.score ?? 0}/100`} accent="text-accent" />
          <MiniMetric label="Confidence" value={`${token?.prediction?.confidence ?? 0}%`} accent="text-white" />
          <MiniMetric
            label="Holders"
            value={formatCompactNumber(token?.security?.holders || 0)}
            accent="text-slate-100"
          />
        </div>

        <div className="mt-4 text-xs leading-6 text-slate-400">
          {token?.rationale?.join(" • ") || "Monitoring liquidity, holders, and momentum alignment."}
        </div>
      </div>
    </motion.article>
  );
}

function StatBlock({ label, value, tone = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function MiniMetric({ label, value, accent }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function formatCompactNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value));
}
