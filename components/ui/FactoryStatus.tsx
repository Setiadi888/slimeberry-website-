'use client';

import { useCartCount } from '@/lib/cart';
import { useLabMetrics } from '@/lib/dashboard';
import { useProductionStage } from '@/lib/production';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[9px] uppercase tracking-[0.11em] text-[#9aa0ad]">{label}</span>
      <span className="tabular-nums text-[11px] font-semibold text-[#4a5262]">{value}</span>
    </div>
  );
}

/**
 * The lab readout. Deliberately a small corner panel rather than a dashboard —
 * it reports what the factory is doing without competing with it.
 */
export function FactoryStatus() {
  const cartCount = useCartCount();
  const stage = useProductionStage();
  const metrics = useLabMetrics();

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 select-none sm:bottom-6 sm:left-6">
      <div className="w-44 rounded-xl bg-white/74 px-3 py-2.5 shadow-[0_4px_18px_rgba(80,60,40,0.12)] backdrop-blur-md">
        <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-[#8b8f9c]">
          Slimeberry Lab
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7bbf6a] opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#5aa84c]" />
          </span>
        </p>

        <p className="mt-1 text-[11px] leading-tight text-[#5a6172]">🟢 {stage.label} in progress</p>

        <div className="mt-2 space-y-[3px] border-t border-black/8 pt-2">
          <Metric label="Batches today" value={String(metrics.batches)} />
          <Metric label="Slime produced" value={`${metrics.producedKg} kg`} />
          <Metric label="Strawberry" value={`${metrics.strawberryShare}%`} />
          <Metric label="QC passed" value={`${metrics.qcPassed}%`} />
          <Metric label="Orders ready" value={String(metrics.ordersReady + cartCount)} />
        </div>
      </div>
    </div>
  );
}
