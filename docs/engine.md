# How the engine works

For people changing the router itself. The README covers using it.

## The model
- **Every entry carries one engine record**, under the `__router` key of its history state (`src/core/record.ts`). App values stay top-level in `location.state`.
- **An area** is a run of entries with one owner. The **root area** is the whole app. Each `TabsRoot` is a **tab area**, and a tab area inside a `TabView` is nested in that tab. The record lists the areas on the live path, outermost first.
- **A step** is one entry's worth of an area: a `page` (a navigation) or a `layer` (a pushed location state value). A step is **real** (it has an entry, at a `position`: the history length right after its push) or **virtual** (kept only as a snapshot, after a tab was restored into one entry).
- **Values point at steps**, not at positions: each value records its area, the step of its first push and of its latest push, and its `persist` / `inherit` flags.
- **A step keeps a snapshot** (address, values and inner areas) once something is pushed above it in a tab area, and the current step when its tab is saved. A snapshot keeps every value but `persist: false` and `inherit: false` ones; a saved layer step whose own value is dropped goes with it (`saveSteps` in `src/core/steps.ts`).
- **Restoring a tab collapses its steps** (`src/core/steps.ts`): the top step takes the new entry, the rest become virtual, and every area inside the restored step collapses the same way. Nothing is restamped.

## Two history operations
- **Go to a step:**
  - if it is real, land before the entry above it: one jump through the `destroy` → `navigate` markers, which also skips entries added since (iframes);
  - if it is virtual, replace the tab's lowest real entry with it (a *virtual pop*).
- **Push a step:** one push, then an in-place write right after it that records the step's position (the history length the push left).

Closing a value, swapping layers, switching tabs, popping a tab to its root, leaving a tab area, cleaning up after a reload and backing through a restored tab are all built from these two, plus in-place writes.

## The pieces
| Piece | File | Job |
| --- | --- | --- |
| Planners (pure) | `src/core/planChanges.ts`, `src/core/planTabs.ts` | Current record + requests → the operations to run |
| Intent queue | `src/providers/engine/IntentQueue.ts` | Requests in order: an operation's finishing write, then a tab operation, then all value changes as one transaction |
| Transactions | `src/providers/engine/useLocationStateTransactions.ts` | Takes intents, plans them, checks guards, sends them one landing at a time |
| Busy state | `src/providers/engine/EngineWork.ts` | Work sent and not landed, and operations still running |
| Watcher | `src/providers/engine/useMoveWatcher.ts` | Sees every user move and asks the deciders whether to undo it, keeping the screen on show |
| Deciders | `src/providers/engine/deciders/` | Feature rules for undoing moves: guards ask first, then tabs show virtual steps |
| Tabs handler | `src/providers/engine/useTabsHandler.ts` | Registers tab areas, records new pages, keeps each area's saved pages |
| Reload cleanup | `src/providers/engine/useEphemeralStateHandler.ts` | Closes `persist: false` values restored by a reload |

## Rules that keep it correct
- **One navigation at a time:** nothing is sent while work is in flight or the engine is correcting.
- **Every change made in one tick is one transaction:** closes first, then in-place writes, then at most one push.
- **The screen never shows a half-way entry:** a move being undone and a tab operation keep the previous location on show until they land; a return-to-position shows the location it will re-apply.

## Checks that guard it
- **Unit tests** for the pure core and the engine classes: `pnpm test:unit`.
- **End-to-end tests** on React Router 7 and 8: `pnpm test:e2e`. These include history-write counts per main flow, compared with `e2e/baselines/`.
- **The public export list**, compared with `baselines/public-api.txt`: `pnpm api:check`.
