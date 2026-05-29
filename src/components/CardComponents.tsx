import React from "react";
import type { ToastProps } from "../types";
import { CheckIcon, HeartIcon } from "./Icons";

export function Toast({ message, type, visible }: ToastProps) {
  const styles: Record<ToastProps["type"], string> = {
    success: "bg-emerald-500 shadow-emerald-500/30",
    error: "bg-red-500 shadow-red-500/30",
    info: "bg-zinc-800 border border-white/10 shadow-black/40",
    heart: "shadow-[0_10px_30px_-8px_var(--accent-glow)]",
  };
  if (!visible) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-2xl ${styles[type]} toast-enter`}
      style={type === "heart" ? { background: "var(--accent)" } : undefined}
    >
      {type === "success" && <CheckIcon />}
      {type === "heart" && <HeartIcon filled />}
      {message}
    </div>
  );
}

export function SkeletonCard({ height }: { height: number }) {
  return <div className="masonry-item rounded-2xl overflow-hidden shimmer" style={{ height: `${height}px` }} />;
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <section className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]/70 backdrop-blur-sm p-5 shadow-2xl shadow-black/30 transition-colors duration-300 hover:border-[var(--border-strong)] fade-in-up">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-lg tracking-tight text-balance">{title}</h3>
          {subtitle && <p className="text-[var(--text-muted)] text-sm mt-1 leading-relaxed text-pretty">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
