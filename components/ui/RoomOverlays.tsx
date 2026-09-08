'use client';

import { useRoom } from '@/lib/world';
import { FactoryDisclaimer } from './FactoryDisclaimer';
import { FactoryLife } from './FactoryLife';
import { FactoryStatus } from './FactoryStatus';
import { Hint } from './Hint';
import { LabCam } from './LabCam';
import { ProductionRail } from './ProductionRail';
import { WorldLabels } from './WorldLabels';
import { MartHint } from './MartHint';

/**
 * Overlays that belong to one room or the other.
 *
 * The Lab carries the whole readout — signage, lab cam, dashboard, the stage
 * rail — because it is the environment built for a big screen. SB Mart shows
 * almost none of it on purpose: it is the phone experience, and every panel
 * kept off it is screen space given back to the products, plus a projection
 * loop and an interval timer not running.
 */
export function RoomOverlays() {
  const room = useRoom();

  if (room === 'mart') {
    return (
      <>
        {/* Dilan thinks out loud too, so the bubble runs in both rooms. */}
        <FactoryLife />
        <MartHint />
      </>
    );
  }

  return (
    <>
      <WorldLabels />
      <LabCam />
      <FactoryLife />
      <FactoryStatus />
      <ProductionRail />
      <FactoryDisclaimer />
      <Hint />
    </>
  );
}
