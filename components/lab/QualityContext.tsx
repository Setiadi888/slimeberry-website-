'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { QualitySettings } from '@/lib/quality';

const QualityContext = createContext<QualitySettings | null>(null);

/**
 * Provided *inside* the Canvas so every scene component can read quality flags.
 * React context works freely within the canvas subtree; it only fails to cross
 * the Canvas boundary itself, which is why the settings are computed in the DOM
 * tree and handed in as a prop.
 */
export function QualityProvider({
  value,
  children,
}: {
  value: QualitySettings;
  children: ReactNode;
}) {
  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}

export function useLabQuality(): QualitySettings {
  const value = useContext(QualityContext);
  if (!value) throw new Error('useLabQuality must be used inside <QualityProvider>');
  return value;
}
