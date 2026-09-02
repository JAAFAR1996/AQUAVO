# Wave 1 merge map

Why each redirect in `vercel.json` exists. **`vercel.json` cannot hold this
itself**: Vercel validates the redirect schema strictly — `source`,
`destination`, `permanent`, `statusCode`, `has`, `missing` and nothing else — so
a `"_comment"` key fails the whole deployment rather than being ignored. That
mistake cost one red build on PR #192; the rationale lives here instead.

Every merge follows the same shape: the loser is **unpublished** (so it leaves
`/api/blog/posts` and the sitemap and stops competing for the query) *and*
redirected permanently (so the URL and any external link still lands somewhere
useful). Doing only one of the two leaves either a dead URL or a live duplicate.

| Redirected from | To | Why this survivor |
| --- | --- | --- |
| `/blog/nitrogen-cycle-simple` | `nitrogen-cycle-simple-arabic-explained` | Nothing absorbed. The hub covers every section the loser had, and where they disagree the loser is wrong: "three stages", *Nitrobacter* for step two, and a 0.5 ppm ammonia threshold the dossier records as RESEARCH BLOCKED. Emoji in the title as well. |
| `/blog/cloudy-aquarium-water-causes-fix` | `cloudy-water-fix` | The survivor diagnoses by water colour, which is how a reader arrives at the question. The loser told readers to change 10-15% of the water **daily** — wrong for a bacterial bloom, where removing free-floating heterotrophs makes the rest reproduce faster. |
| `/blog/real-vs-fake-plants` | `real-vs-fake-plants-iraq` | The `-iraq` slug matches local intent and carries the differentiator: power cuts kill light-dependent plants, and a rotting plant raises ammonia. The species list and the silk-vs-hard-plastic fin warning were absorbed. |
| `/blog/iraqi-summer-aquarium-cooling` | `protect-fish-iraqi-summer-50-degrees` | Three-way merge. This one had the only real content of the three and it was absorbed; the survivor's slug is the stronger one because "50 degrees" is the query Iraqi readers type. |
| `/blog/كيف-تحافظ-…-1788055556978` | `protect-fish-iraqi-summer-50-degrees` | Same cluster. Machine-generated timestamp slug, unusable as a URL. |

## Non-ASCII sources must be percent-encoded

The Arabic timestamp slug was written into `vercel.json` as raw UTF-8 and did
not match — the URL 404'd while the other four redirected correctly. Vercel
matches `source` against the request path as sent, and a browser or crawler
sends Arabic percent-encoded, so the source has to be percent-encoded too. Only
live verification caught this; the JSON was valid and the deployment was green.

## Rules these follow

- **Permanent** (`"permanent": true`), never temporary — these merges are not
  provisional.
- **No chains.** A redirect never points at a slug that is itself a redirect
  source. Checked after every addition.
- **Never point at an unpublished target.** The destination has to be a live,
  published article or the reader lands on a 404 after a hop.
- **Percent-encode any non-ASCII source**, and verify the actual status code
  after deploy rather than trusting a green build.
- The rollback for each merge migration republishes the loser, but the redirect
  must be removed from `vercel.json` in the same change or the URL stays
  unreachable regardless of publication state.
