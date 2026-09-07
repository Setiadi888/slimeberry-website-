'use client';

import type { CardContent } from '@/lib/describe';

export function Stars({ rating, color }: { rating: number; color: string }) {
  return (
    <span aria-label={`${rating} out of 5`} className="text-[11px] tracking-[0.12em]" style={{ color }}>
      {'★'.repeat(rating)}
      <span className="text-black/15">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-black/8">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

/** "CURRENT TASK · 🍓 Strawberry Cloud" */
export function TaskRow({ content }: { content: CardContent }) {
  if (!content.task) return null;
  return (
    <div className="mt-2.5">
      <p className="text-[9.5px] uppercase tracking-[0.13em] text-[#9aa0ad]">Current task</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium text-[#4a5262]">
        <span aria-hidden>{content.task.emoji}</span>
        {content.task.label}
      </p>
    </div>
  );
}

/** Inspection read-out bars — softness, stretch, gloss. */
export function MetricBars({ content }: { content: CardContent }) {
  if (!content.bars?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {content.bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex items-baseline justify-between">
            <span className="text-[9.5px] uppercase tracking-[0.12em] text-[#9aa0ad]">{bar.label}</span>
            <span className="text-[11px] font-medium text-[#4a5262]">
              {bar.value.toFixed(1)} / {bar.max}
            </span>
          </div>
          <div className="mt-1">
            <ProgressBar value={(bar.value / bar.max) * 100} color={content.accent} />
          </div>
        </div>
      ))}
    </div>
  );
}
