import { LabCanvas } from '@/components/lab/LabCanvas';
import { Hint } from '@/components/ui/Hint';
import { LabLoader } from '@/components/ui/LabLoader';
import { AboutPanel } from '@/components/ui/AboutPanel';
import { CartPanel } from '@/components/ui/CartPanel';
import { DetailPanel } from '@/components/ui/DetailPanel';
import { FactoryLife } from '@/components/ui/FactoryLife';
import { FactoryStatus } from '@/components/ui/FactoryStatus';
import { FactoryDisclaimer } from '@/components/ui/FactoryDisclaimer';
import { HoverCard } from '@/components/ui/HoverCard';
import { LabCam } from '@/components/ui/LabCam';
import { ProductionRail } from '@/components/ui/ProductionRail';
import { WorldLabels } from '@/components/ui/WorldLabels';
import { Navigation } from '@/components/ui/Navigation';
import { OrderSequence } from '@/components/ui/OrderSequence';
import { Toast } from '@/components/ui/Toast';

export default function Home() {
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-shell">
      <LabCanvas />
      <Navigation />
      <HoverCard />
      <DetailPanel />
      <WorldLabels />
      <LabCam />
      <FactoryLife />
      <FactoryStatus />
      <ProductionRail />
      <FactoryDisclaimer />
      <CartPanel />
      <AboutPanel />
      <OrderSequence />
      <Toast />
      <Hint />
      <LabLoader />
    </main>
  );
}
