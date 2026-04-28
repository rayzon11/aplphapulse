"use client";

import { motion } from "framer-motion";

export default function Navbar({ generatedAt, onRefresh, refreshing, status }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="glass-card flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">AlphaPulse Pro</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-semibold text-white">AI Crypto Terminal</h2>
          <span className="pill text-slate-200">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "LIVE"
                  ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]"
                  : status === "SYNCING"
                    ? "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.7)]"
                    : "bg-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.7)]"
              }`}
            />
            {status}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Last sync</p>
          <p className="mt-1 text-sm font-medium text-slate-200">
            {generatedAt ? new Date(generatedAt).toLocaleString() : "Waiting for first fetch"}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {refreshing ? "Refreshing..." : "Refresh terminal"}
        </button>
      </div>
    </motion.header>
  );
}
