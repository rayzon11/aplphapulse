"use client";

import { motion } from "framer-motion";

export default function Section({ eyebrow, title, description, actionLabel, actionHref, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45 }}
      className="glass-card px-5 py-6 sm:px-6 sm:py-7"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent/80">{eyebrow}</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
        </div>

        {actionLabel && actionHref ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noreferrer"
            className="pill justify-center text-accent transition hover:border-accent/40 hover:bg-accent/10"
          >
            {actionLabel}
          </a>
        ) : null}
      </div>

      {children}
    </motion.section>
  );
}
