# Brand artwork

Drop the three supplied PNGs in here, with exactly these names:

| file                       | what it is                          |
| -------------------------- | ----------------------------------- |
| `slimeberry-wordmark.png`  | the stacked logo with the leaf crown |
| `sb-flower-green.png`      | the green SB flower                  |
| `sb-flower-blue.png`       | the blue SB flower                   |

All three want a transparent background. The wordmark is drawn at roughly 6:5,
the flowers square.

Everything that shows a mark — the cup lids and stickers, the Gachapon topper,
the SB MART fascia, the rug in the shop and the header — reads them through
`lib/brand.ts`. Until a file is present that module hands back `null` and each
caller draws its own stand-in, so the scene never breaks over a missing asset
and picks up the real artwork the moment one appears. No code change needed.
