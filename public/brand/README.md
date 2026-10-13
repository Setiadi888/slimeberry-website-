# Brand artwork

Drop the three supplied PNGs in here, with exactly these names:

| file                       | what it is                          |
| -------------------------- | ----------------------------------- |
| `slimeberry-wordmark.png`  | the stacked logo with the leaf crown |
| `sb-flower-green.png`      | the green SB flower                  |
| `sb-flower-blue.png`       | the blue SB flower                   |

All three want a transparent background. The wordmark is drawn at roughly 6:5,
the flowers square.

Then add each mark you dropped in to the `SUPPLIED` set in `lib/brand.ts`:

```ts
const SUPPLIED: ReadonlySet<BrandMark> = new Set<BrandMark>(['wordmark', 'flowerGreen', 'flowerBlue']);
```

That one line is the whole switch. Everything that shows a mark — the cup lids
and stickers, the series island's headers, the SB MART fascia and the header —
reads them through `lib/brand.ts`. A mark that is not listed hands back `null`
without a request and each caller draws its own stand-in, so the scene never
breaks over a missing asset and nobody's console fills with 404s while the real
files are on their way.
