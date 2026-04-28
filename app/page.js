"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Loader from "../components/Loader";
import Navbar from "../components/Navbar";
import Section from "../components/Section";
import TokenCard from "../components/TokenCard";

const REFRESH_MS = 60_000;

const EMPTY_DATA = {
  highAlphaPicks: [],
  newListings: [],
  trendingTokens: [],
  summary: {
    alphaCount: 0,
    avgScore: 0,
    newListings: 0,
    trendingCount: 0
  },
  generatedAt: null
};

export default function HomePage() {
  const [dashboard, setDashboard] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/alerts?t=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to load market intelligence.");
      }

      const payload = await response.json();
      setDashboard(payload);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Something went wrong while fetching token data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(() => {
      fetchDashboard({ silent: true });
    }, REFRESH_MS);

    return () => clearInterval(interval);
  }, []);

  const status = error ? "DEGRADED" : loading || refreshing ? "SYNCING" : "LIVE";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="scanlines" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <Navbar
          generatedAt={dashboard.generatedAt}
          onRefresh={() => fetchDashboard({ silent: true })}
          refreshing={refreshing}
          status={status}
        />

        <section className="terminal-panel mt-8 overflow-hidden px-6 py-10 sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-terminal-grid bg-[size:24px_24px] opacity-20" />
          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="text-xs font-semibold uppercase tracking-[0.32em] text-accent/80"
              >
                AI-powered crypto alpha intelligence
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl"
              >
                Detect conviction before the crowd does.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base"
              >
                AlphaPulse Pro fuses Birdeye market data, token safety heuristics, and a fast rule-based prediction
                engine into a premium terminal for early listings, live trends, and actionable alpha picks.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <MetricCard label="High Alpha" value={dashboard.summary.alphaCount} helper="Signals cleared score + AI filters" />
              <MetricCard label="Avg Safety" value={`${dashboard.summary.avgScore}%`} helper="Across displayed opportunities" />
              <MetricCard label="New Listings" value={dashboard.summary.newListings} helper="Freshly surfaced by Birdeye" />
              <MetricCard label="Trending Radar" value={dashboard.summary.trendingCount} helper="Momentum names on watch" />
            </motion.div>
          </div>
        </section>

        {error ? (
          <div className="mt-6 rounded-3xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-rose-100 shadow-glow">
            {error}
          </div>
        ) : null}

        <div className="mt-8 space-y-8">
          <Section
            eyebrow="Premium Flow"
            title="High Alpha Picks"
            description="Tokens that pass the safety filter and trigger the strongest short-term conviction signal."
            actionLabel="Push alerts"
            actionHref="/api/alerts"
          >
            {loading ? (
              <Loader count={3} highlight />
            ) : dashboard.highAlphaPicks.length ? (
              <div className="grid gap-5 lg:grid-cols-3">
                {dashboard.highAlphaPicks.map((token, index) => (
                  <TokenCard key={token.address} token={token} index={index} variant="alpha" />
                ))}
              </div>
            ) : (
              <EmptyState message="No strong-buy candidates right now. The watchlist is still monitoring new rotations." />
            )}
          </Section>

          <Section
            eyebrow="Early Discovery"
            title="New Listings"
            description="Fresh pairs and just-listed names with live pricing, liquidity, and AI readiness."
          >
            {loading ? (
              <Loader count={6} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.newListings.map((token, index) => (
                  <TokenCard key={token.address} token={token} index={index} />
                ))}
              </div>
            )}
          </Section>

          <Section
            eyebrow="Momentum Map"
            title="Trending Tokens"
            description="Ranked momentum leaders with change data, liquidity context, and risk-aware predictions."
          >
            {loading ? (
              <Loader count={6} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.trendingTokens.map((token, index) => (
                  <TokenCard key={token.address} token={token} index={index} />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{label}</p>
      <p className="mt-4 font-display text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{helper}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-5 py-8 text-sm text-slate-300">
      {message}
    </div>
  );
}
