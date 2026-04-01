import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

export function BrandLockup({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-3 rounded-full px-2 py-1 text-sm font-medium tracking-[-0.02em] text-white/92 transition-opacity duration-200 hover:opacity-100",
        className
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <span className="size-2.5 rounded-full bg-[var(--app-accent)] shadow-[0_0_18px_rgba(217,195,154,0.45)]" />
      </span>
      <span className="text-[0.82rem] font-semibold uppercase tracking-[0.24em] text-white/78">
        Doppel
      </span>
    </Link>
  );
}

export function TopBar({
  left,
  right,
  className,
}: {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/8 bg-[rgba(10,12,16,0.82)] backdrop-blur-2xl",
        className
      )}
    >
      <div className="mx-auto grid h-[4.5rem] w-full max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:px-8 lg:px-10">
        <div className="min-w-0">{left}</div>
        <div className="flex justify-center">
          <BrandLockup />
        </div>
        <div className="flex min-w-0 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}

export function PageFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-10", className)}>
      {children}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: "neutral" | "live" | "warning" | "danger" | "accent";
  className?: string;
}) {
  const toneClassName = {
    neutral:
      "border-white/8 bg-white/[0.04] text-[var(--app-muted)]",
    live:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    warning:
      "border-amber-400/20 bg-amber-400/10 text-amber-100",
    danger:
      "border-rose-400/20 bg-rose-400/10 text-rose-100",
    accent:
      "border-[rgba(217,195,154,0.18)] bg-[rgba(217,195,154,0.10)] text-[var(--app-accent-strong)]",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.18em]",
        toneClassName,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
      <h1 className="font-display text-[clamp(2.7rem,6vw,5.75rem)] text-white">{title}</h1>
      {description ? (
        <p className="mt-5 max-w-[40rem] text-[0.98rem] leading-8 text-[var(--app-muted)] [text-wrap:pretty]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
