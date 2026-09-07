import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Slimeberry — The Lab',
  description:
    'Look inside the Slimeberry laboratory: a miniature factory where small workers mix, cure and jar every batch of slime by hand.',
};

export const viewport: Viewport = {
  themeColor: '#f2e9de',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
