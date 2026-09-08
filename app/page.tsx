import { LabCanvas } from '@/components/lab/LabCanvas';
import { LabLoader } from '@/components/ui/LabLoader';
import { AboutPanel } from '@/components/ui/AboutPanel';
import { CartPanel } from '@/components/ui/CartPanel';
import { DetailPanel } from '@/components/ui/DetailPanel';
import { HoverCard } from '@/components/ui/HoverCard';
import { Navigation } from '@/components/ui/Navigation';
import { OrderSequence } from '@/components/ui/OrderSequence';
import { RoomOverlays } from '@/components/ui/RoomOverlays';
import { RoomTransition } from '@/components/ui/RoomTransition';
import { SbCoinAward } from '@/components/ui/SbCoinAward';
import { GachaponPanel } from '@/components/ui/GachaponPanel';
import { Toast } from '@/components/ui/Toast';

export default function Home() {
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-shell">
      <LabCanvas />

      {/* Shared across both rooms: one cart, one wallet, one set of panels. */}
      <Navigation />
      <HoverCard />
      <DetailPanel />
      <CartPanel />
      <AboutPanel />
      <OrderSequence />
      <GachaponPanel />
      <SbCoinAward />
      <Toast />

      {/* Whichever room's chrome applies. */}
      <RoomOverlays />

      <RoomTransition />
      <LabLoader />
    </main>
  );
}
