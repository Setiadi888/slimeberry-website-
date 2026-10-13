'use client';

import { useRoom } from '@/lib/world';
import { FactoryLife } from './FactoryLife';
import { FactoryStatus } from './FactoryStatus';
import { Hint } from './Hint';
import { LabCam } from './LabCam';
import { ProductionRail } from './ProductionRail';
import { MartHint } from './MartHint';
import { RadioPanel } from './RadioPanel';

/**
 * Overlays that belong to one room or the other.
 *
 * The Lab carries the whole readout — lab cam, dashboard, the stage rail —
 * because it is the environment built for a big screen. SB Mart shows
 * almost none of it on purpose: it is the phone experience, and every panel
 * kept off it is screen space given back to the products, plus a projection
 * loop and an interval timer not running.
 */
export function RoomOverlays() {
  const room = useRoom();

  if (room === 'mart') {
    return (
      <>
        {/* The keeper and the cat both think out loud, so the bubble runs here too. */}
        <FactoryLife />
        <RadioPanel />
        <MartHint />
      </>
    );
  }

  return (
    <>
      <LabCam />
      <FactoryLife />
      <FactoryStatus />
      <ProductionRail />
      <Hint />
    </>
  );
}
