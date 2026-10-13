import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Next hashes its own build output and serves it `immutable`, so a returning
   * visitor re-downloads none of it. Files in `public/` get `max-age=0`, which
   * means the character model is revalidated on every single page load — not a
   * re-download, but a blocking round trip per visit, and one a CDN in front
   * would also have to make.
   *
   * A day is the right cap for a hand-managed asset: it removes essentially all
   * of those round trips while keeping the worst-case staleness to something
   * you would not notice after replacing a model. `immutable` and a year would
   * be faster still, but only once the filename carries a content hash — until
   * then it would strand old visitors on an old character.
   */
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
