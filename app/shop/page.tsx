import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BUCKET_PRODUCTS,
  FRUIT_PRODUCTS,
  MINI_PRODUCTS,
  SIGNATURE_PRODUCTS,
  STATION_PRODUCTS,
  type Product,
} from '@/lib/products';

export const metadata: Metadata = {
  title: 'Slimeberry — Shop',
  description:
    'Every jar Slimeberry makes, laid out plainly. The same batches you can watch being mixed in the Lab.',
};

const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

/**
 * A jar, drawn as inline SVG.
 *
 * The rooms are built out of procedural geometry and this page keeps the same
 * rule: nothing is fetched. The first pass stacked divs, which left a seam
 * where the lid met the body and could not taper the sides — a path can do
 * both, and it is still just markup.
 */
function Jar({ product, large = false }: { product: Product; large?: boolean }) {
  const width = large ? 108 : 82;
  return (
    <svg
      viewBox="0 0 100 120"
      width={width}
      height={width * 1.2}
      className="mx-auto block"
      aria-hidden
      focusable="false"
    >
      {/* the shadow it sits in */}
      <ellipse cx="50" cy="110" rx="30" ry="5" fill="rgba(80,60,40,0.09)" />

      {/* tapered body with a rounded foot */}
      <path
        d="M17 38 L83 38 L76 98 Q75 107 66 107 L34 107 Q25 107 24 98 Z"
        fill={product.color}
      />
      {/* the slime settling in the bottom third */}
      <path
        d="M20.5 71 L79.5 71 L76 98 Q75 107 66 107 L34 107 Q25 107 24 98 Z"
        fill="rgba(0,0,0,0.055)"
      />
      {/* a highlight down the left shoulder */}
      <path d="M25 42 L33 42 L30 74 L23 74 Z" fill="rgba(255,255,255,0.28)" />

      {/* lid, overlapping the body so there is no seam */}
      <rect x="7" y="20" width="86" height="26" rx="11" fill="#ffffff" />
      <rect x="7" y="20" width="86" height="26" rx="11" fill="rgba(0,0,0,0.03)" />
      <rect x="7" y="20" width="86" height="13" rx="6.5" fill="#ffffff" />
      {/* printed disc, in the flavour's accent */}
      <ellipse cx="50" cy="30" rx="17.5" ry="6" fill={product.accent} opacity="0.92" />
    </svg>
  );
}

/** Glitter for the bucket drawing — seeded, so the static page is identical build to build. */
const SPECKS = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 26 }, () => ({
    x: 26 + rand() * 48,
    y: 52 + rand() * 48,
    r: 0.5 + rand() * 0.9,
    o: 0.35 + rand() * 0.5,
  }));
})();

/** Where each bucket's pearls sit, matching the 3D buckets and the product shot. */
const BUCKET_PEARLS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[33, 52], [41, 50.5], [66, 51.5]],
  [[56, 101], [63.5, 100], [71, 99], [34, 101]],
  [[28, 52], [37, 50.5], [46, 52], [55, 50.5], [64, 52]],
  [[27, 52], [35, 50.5], [43, 52], [51, 50.5], [59, 52], [67, 50.5], [74, 52]],
];

/**
 * A boba bucket, drawn the same way as the jar: a clear tapered tub with the
 * slime showing through, the pearls against the wall, a tabbed lid with the
 * gingham label on top, the purple flower on the front, and the handle hanging
 * down behind.
 */
function Bucket({ product, large = false }: { product: Product; large?: boolean }) {
  const width = large ? 108 : 82;
  const pearls = BUCKET_PEARLS[product.slot % BUCKET_PEARLS.length];
  return (
    <svg
      viewBox="0 0 100 120"
      width={width}
      height={width * 1.2}
      className="mx-auto block"
      aria-hidden
      focusable="false"
    >
      <ellipse cx="50" cy="113" rx="32" ry="5" fill="rgba(80,60,40,0.09)" />

      {/* the handle, hanging down behind on the right */}
      <path
        d="M89 46 C101 62 99 86 80 97"
        fill="none"
        stroke="rgba(120,130,150,0.38)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* the clear tub, then the slime inside it */}
      <path
        d="M13 42 L87 42 L81 105 Q80 112 72 112 L28 112 Q20 112 19 105 Z"
        fill="rgba(255,255,255,0.55)"
        stroke="rgba(63,71,86,0.10)"
        strokeWidth="0.8"
      />
      <path d="M17 46 L83 46 L77.6 103 Q77 108 71 108 L29 108 Q23 108 22.4 103 Z" fill={product.color} />
      <path d="M17 46 L83 46 L81.3 64 L18.7 64 Z" fill="rgba(255,255,255,0.10)" />
      {SPECKS.map((speck, index) => (
        <circle key={index} cx={speck.x} cy={speck.y} r={speck.r} fill="#ffffff" opacity={speck.o} />
      ))}
      {pearls.map(([x, y], index) => (
        <g key={index}>
          <circle cx={x} cy={y} r="3.1" fill="#221a26" />
          <circle cx={x - 1} cy={y - 1} r="0.9" fill="rgba(255,255,255,0.45)" />
        </g>
      ))}
      <path d="M23 50 L30 50 L27 98 L21 98 Z" fill="rgba(255,255,255,0.22)" />

      {/* lid skirt with its tabs */}
      <rect x="9" y="30" width="82" height="18" rx="4" fill="rgba(245,248,252,0.82)" stroke="rgba(63,71,86,0.08)" strokeWidth="0.8" />
      {[16, 25, 34, 43, 57, 66, 75, 84].map((x) => (
        <rect key={x} x={x - 2} y="38" width="4" height="9" rx="1" fill="rgba(63,71,86,0.07)" />
      ))}

      {/* lid top and its gingham label */}
      <ellipse cx="50" cy="30" rx="41" ry="7" fill="rgba(250,252,254,0.96)" stroke="rgba(63,71,86,0.08)" strokeWidth="0.8" />
      <ellipse cx="50" cy="29.5" rx="24" ry="4.6" fill="#f6c7d6" />
      <path d="M30 31 Q42 27 52 30.5 T72 29 Q70 33.5 50 34 Q34 34 30 31 Z" fill="#bf93dc" opacity="0.9" />

      {/* the flower sticker — the same proportions the 3D sticker is drawn with */}
      <g transform="translate(50 78)">
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return <circle key={`w${i}`} cx={Math.cos(angle) * 7.8} cy={Math.sin(angle) * 7.8} r="8.4" fill="#ffffff" />;
        })}
        <circle r="9.9" fill="#ffffff" />
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return <circle key={`p${i}`} cx={Math.cos(angle) * 7.8} cy={Math.sin(angle) * 7.8} r="6.6" fill="#9a4fbb" />;
        })}
        <circle r="8.1" fill="#9a4fbb" />
        <text
          y="3.4"
          textAnchor="middle"
          fontSize="9.9"
          fontWeight="800"
          fill="#ffffff"
          fontFamily="ui-rounded, system-ui, sans-serif"
        >
          SB
        </text>
      </g>
    </svg>
  );
}

/**
 * A fruit series cup, drawn: the thick clear base, the slime above it, the SB
 * flower with its navy letters, and the chunky ribbed lid with the gingham label
 * in the flavour's colour. The holographic one gets a pastel rainbow for both.
 */
function FruitCupArt({ product, large = false }: { product: Product; large?: boolean }) {
  const width = large ? 108 : 82;
  const holo = product.finish === 'holo';
  const rainbow = `holo-${product.id}`;
  const fill = holo ? `url(#${rainbow})` : product.color;
  const petals = [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2 - Math.PI / 2);
  return (
    <svg
      viewBox="0 0 100 120"
      width={width}
      height={width * 1.2}
      className="mx-auto block"
      aria-hidden
      focusable="false"
    >
      {holo && (
        <defs>
          <linearGradient id={rainbow} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f7b6d8" />
            <stop offset="0.3" stopColor="#f9e2b0" />
            <stop offset="0.55" stopColor="#bdebd8" />
            <stop offset="0.8" stopColor="#c3d8fb" />
            <stop offset="1" stopColor="#dcbdf7" />
          </linearGradient>
        </defs>
      )}
      <ellipse cx="50" cy="112" rx="30" ry="4.5" fill="rgba(80,60,40,0.09)" />

      {/* the thick clear base, and the seam above it */}
      <path d="M22 86 L78 86 L77.5 104 Q77 109 71 109 L29 109 Q23 109 22.5 104 Z" fill="#cfd4da" />
      <rect x="26" y="89" width="6" height="16" rx="3" fill="rgba(255,255,255,0.45)" />
      <rect x="21.5" y="84.5" width="57" height="2.4" fill="#aab1bb" />

      {/* the slime */}
      <path d="M21 44 L79 44 L78.2 85 L21.8 85 Z" fill={fill} />
      <path d="M26 48 L32 48 L31 81 L25.4 81 Z" fill="rgba(255,255,255,0.28)" />

      {/* the flower */}
      <g transform="translate(50 66)">
        {petals.map((angle, i) => (
          <circle key={`w${i}`} cx={Math.cos(angle) * 5.7} cy={Math.sin(angle) * 5.7} r="6.2" fill="#ffffff" />
        ))}
        <circle r="7.3" fill="#ffffff" />
        {petals.map((angle, i) => (
          <circle key={`p${i}`} cx={Math.cos(angle) * 5.7} cy={Math.sin(angle) * 5.7} r="4.8" fill={product.accent} />
        ))}
        <circle r="5.9" fill={product.accent} />
        <text
          y="2.6"
          textAnchor="middle"
          fontSize="7.2"
          fontWeight="900"
          fill="#24348f"
          stroke="#ffffff"
          strokeWidth="1.2"
          paintOrder="stroke"
          fontFamily="ui-rounded, system-ui, sans-serif"
        >
          SB
        </text>
      </g>

      {/* the lid, its ribs, and the label */}
      <rect x="15" y="25" width="70" height="23" rx="6" fill="#fbfbfa" stroke="rgba(63,71,86,0.10)" strokeWidth="0.8" />
      {[21, 27, 33, 39, 45, 51, 57, 63, 69, 75, 79].map((x) => (
        <line key={x} x1={x} y1="33" x2={x} y2="46" stroke="rgba(63,71,86,0.07)" strokeWidth="1.2" />
      ))}
      <ellipse cx="50" cy="26" rx="35" ry="6.5" fill="#ffffff" stroke="rgba(63,71,86,0.08)" strokeWidth="0.8" />
      <ellipse cx="50" cy="26" rx="29" ry="5" fill={fill} opacity={holo ? 0.75 : 0.45} />
      <text
        x="50"
        y="27.4"
        textAnchor="middle"
        fontSize="4.6"
        fontWeight="900"
        fill="#3b4a9e"
        fontFamily="ui-rounded, system-ui, sans-serif"
      >
        SLIME BERRY
      </text>
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[11px] tracking-[0.12em] text-berry" aria-label={`${rating} out of 5`}>
      {'★'.repeat(rating)}
      <span className="text-ink/20">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function Card({ product, large = false }: { product: Product; large?: boolean }) {
  return (
    <article className="flex flex-col rounded-2xl bg-white/70 p-5 shadow-[0_1px_3px_rgba(80,60,40,0.06)] ring-1 ring-ink/5">
      <div className="rounded-xl bg-shell/70 py-6">
        {product.placement === 'bucket' ? (
          <Bucket product={product} large={large} />
        ) : product.placement === 'fruit' ? (
          <FruitCupArt product={product} large={large} />
        ) : (
          <Jar product={product} large={large} />
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[17px] leading-tight text-ink">{product.name}</h3>
        <Stars rating={product.rating} />
      </div>
      <p className="mt-1 text-[13px] leading-snug text-ink/60">{product.tagline}</p>
      <p className="mt-3 text-[13px] leading-relaxed text-ink/75">{product.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        <dt className="text-ink/45">Scent</dt>
        <dd className="text-right text-ink/80">{product.scent}</dd>
        <dt className="text-ink/45">Batch</dt>
        <dd className="text-right font-mono text-ink/80">{product.batch}</dd>
        <dt className="text-ink/45">Stretch</dt>
        <dd className="text-right text-ink/80">{product.metrics.stretch.toFixed(1)} / 10</dd>
      </dl>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {product.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full bg-shell px-2.5 py-1 text-[11px] tracking-wide text-ink/60"
          >
            {tag}
          </li>
        ))}
      </ul>

      <p className="mt-5 font-display text-lg text-ink">{rupiah(product.price)}</p>
    </article>
  );
}

function Section({
  eyebrow,
  title,
  blurb,
  products,
  large = false,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  products: Product[];
  large?: boolean;
}) {
  return (
    <section className="mt-16">
      <p className="text-[11px] uppercase tracking-[0.18em] text-berry">{eyebrow}</p>
      <h2 className="mt-1.5 font-display text-2xl text-ink sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink/65">{blurb}</p>

      <div
        className={`mt-7 grid gap-5 ${
          large ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {products.map((product) => (
          <Card key={product.id} product={product} large={large} />
        ))}
      </div>
    </section>
  );
}

/**
 * The catalogue.
 *
 * Deliberately an ordinary web page — no canvas, no camera, nothing to drag.
 * The Lab and SB Mart are for people who want to look around; this is for
 * people who came to read what the jars are and what they cost, and it loads
 * as static HTML with no client JavaScript at all.
 *
 * It shares the rooms' palette so it reads as the same company: the shell
 * background, the ink text and the berry accent are the exact tokens the 3D
 * scenes are built from.
 */
export default function Shop() {
  return (
    <main className="min-h-full bg-shell">
      <header className="sticky top-0 z-10 border-b border-ink/8 bg-shell/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#8cb63c] text-[12px] font-extrabold tracking-tight text-white">
              SB
            </span>
            <span className="font-display text-lg tracking-tight text-ink">Slimeberry</span>
            <span className="hidden text-[10px] uppercase tracking-[0.16em] text-ink/40 sm:inline">
              Shop
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-full bg-white/70 px-4 py-2 text-[13px] text-ink/70 ring-1 ring-ink/8 transition hover:bg-white hover:text-ink"
          >
            ← Back to the Lab
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <section className="pt-16 sm:pt-24">
          <p className="text-[11px] uppercase tracking-[0.18em] text-berry">The catalogue</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl leading-[1.1] text-ink sm:text-5xl">
            Every jar we make, written down plainly.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/70">
            No room to walk around, nothing to drag. Just the batches — what is in
            them, what they feel like, and what they cost. If you would rather
            watch them being mixed,{' '}
            <Link href="/" className="text-berry underline underline-offset-4 hover:text-ink">
              the Lab is through here
            </Link>
            .
          </p>
        </section>

        <Section
          eyebrow="Signatures"
          title="The four we always have"
          blurb="Full jars, mixed in the Lab and put straight on the cabinet. These are the ones that come back every week."
          products={SIGNATURE_PRODUCTS}
          large
        />

        <Section
          eyebrow="Boba Buckets"
          title="Glitter, pearls, and a handle"
          blurb="Clear buckets of glitter slime with squishy black boba pearls inside — four colours, sold as their own line. In SB Mart they have a table to themselves, away from the jars."
          products={BUCKET_PRODUCTS}
          large
        />

        <Section
          eyebrow="Fruit Series"
          title="Eight flavours, one holographic"
          blurb="Small cups with a chunky white lid and a gingham label printed in their own colour. In SB Mart they have a stepped stand to themselves, set out like a shelf of sweets."
          products={FRUIT_PRODUCTS}
          large
        />

        <Section
          eyebrow="Minis"
          title="Smaller, and cheaper in threes"
          blurb="The same slime in a smaller pot. Whoever is on the till will tell you the minis are better value, though not out loud."
          products={MINI_PRODUCTS}
        />

        <Section
          eyebrow="On the line"
          title="Not on the shelf yet"
          blurb="Batches still moving through the Lab — one on the QC bench, one queued at packing. Listed here because people ask."
          products={STATION_PRODUCTS}
        />
      </div>

      <footer className="border-t border-ink/8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-[12px] text-ink/45 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Slimeberry — mixed, cured and jarred by hand.</p>
          <p>
            Prices in rupiah. Every batch number on this page is a real one from the
            Lab floor.
          </p>
        </div>
      </footer>
    </main>
  );
}
