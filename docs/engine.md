# How the engine works

For people changing the router itself. The README covers using it.

## The model
- **Every entry carries one engine record**, under the `__router` key of its history state (`src/lib/engine/core/record.ts`). App values stay top-level in `location.state`.
- **An area** is a run of entries with one owner. The **root area** is the whole app. Each `TabsRoot` is a **tab area**, and a tab area inside a `TabView` is nested in that tab. The record lists the areas on the live path, outermost first. A tab area also records the address it was opened on, where its tabs without a `root` start.
- **A step** is one entry's worth of an area: a `page` (a navigation) or a `layer` (a pushed location state value). A step is **real** (it has an entry, at a `position`: the history length right after its push) or **virtual** (kept only as a snapshot, after a tab was restored into one entry).
- **Values point at steps**, not at positions: each value records its area, the step of its first push and of its latest push, and its `persist` / `inherit` flags.
- **A step keeps a snapshot** (address, values and inner areas) once something is pushed above it in a tab area, and the current step when its tab is saved. A snapshot keeps every value but `persist: false` and `inherit: false` ones; a saved layer step whose own value is dropped goes with it (`saveSteps` in `src/lib/engine/core/steps.ts`).
- **Restoring a tab collapses its steps** (`src/lib/engine/core/steps.ts`): the top step takes the new entry, the rest become virtual, and every area inside the restored step collapses the same way. Nothing is restamped.

## Two history operations
- **Go to a step:**
  - if it is real, land before the entry above it. Below the current entry, the history driver (`src/lib/engine/driver/HistoryDriver.ts`) resets the pointer with one push, so `history.length` is exact even after a frame navigated, then jumps;
  - if it is virtual, replace the tab's lowest real entry with it (a *virtual pop*).
- **Push a step:** one push, then an in-place write right after it that records the step's position (the history length the push left).

Closing a value, swapping layers, switching tabs, popping a tab to its root, leaving a tab area, cleaning up after a reload and backing through a restored tab are all built from these two, plus in-place writes.

## Where the code lives
Folders are named by kind first, then by feature (`router`, `links`, `layers`, `guards`, `tabs`, `engine`):

| Folder | Holds |
| --- | --- |
| `src/components/` | Components: `PWARouter`, `Routes`, `RouterStatusProbe`, `Link`, `NavLink`, `Navigate`, `TabsRoot`, `TabView` |
| `src/contexts/` | Contexts, with the providers that fill them (`PWARoutingProvider`, `LocationStateDefaultsProvider`) |
| `src/hooks/` | Hooks; `hooks/engine/` holds the engine's runtime hooks, and `hooks/engine/handlers/` the corrections |
| `src/lib/` | Plain code with no React: `lib/engine/` (`core/` pure record, steps and planner; `transactions/`; `history/`), `lib/tabs/` (`core/` pure tab planning), `lib/guards/`, `lib/layers/`, `lib/router/` (the store hooks read the routing view from, in slices or when acting) |
| `src/testing/` | The Playwright helpers of the `/testing` entry |

## The pieces
| Piece | File | Job |
| --- | --- | --- |
| Planners (pure) | `src/lib/engine/core/planChanges.ts`, `src/lib/tabs/core/planTabsOp.ts` (plus `adoptAreas`, `settleMemory`, `restoreSteps`, `planBackfill` beside it) | Current record + requests → the operations to run |
| Intent queue | `src/lib/engine/transactions/IntentQueue.ts` | Requests in order: a tab operation, then all value changes as one transaction |
| Transactions | `src/lib/engine/transactions/LocationStateTransactions.ts` (wired by `src/hooks/engine/useLocationStateTransactions.ts`) | Takes intents, plans them, checks guards, sends them one landing at a time |
| History driver | `src/lib/engine/driver/HistoryDriver.ts` | Runs every correction that contains a `go` as one intent: its moves one at a time, each waiting for its landing. Plain pushes and replaces are written directly |
| Busy state | `src/lib/engine/EngineWork.ts` | Work sent and not landed, and operations still running |
| Watcher | `src/hooks/engine/useMoveWatcher.ts` | Sees every user move and asks the deciders whether to undo it; the undo runs as one driver intent, keeping the screen on show |
| Deciders | `src/lib/engine/moveDeciders.ts` (the contract), `src/lib/guards/guardDecider.ts`, `src/lib/tabs/virtualStepDecider.ts` | Feature rules for undoing moves: guards ask first, then tabs show virtual steps |
| Tabs handler | `src/hooks/tabs/useTabsHandler.ts` | Registers tab areas, records new pages, keeps each area's saved steps |
| Reload cleanup | `src/hooks/engine/handlers/useEphemeralStateHandler.ts` | Closes `persist: false` values restored by a reload |
| State markers | `src/hooks/engine/handlers/useStateMarkersHandler.ts` | Runs the `from`, `destroy` and `navigate` markers an app puts on its navigations as driver intents; the engine itself writes none |

## Rules that keep it correct
- **One navigation at a time:** nothing is sent while work is in flight or the engine is correcting, which includes the driver running an intent.
- **Every change made in one tick is one transaction:** closes first, then in-place writes, then at most one push.
- **The screen never shows a half-way entry:** a move being undone and a tab operation keep the previous location on show until their intent ends; a return-to-position shows the location it will re-apply.
- **A close below the current entry resets the pointer first:** one push makes the current entry the last, so `history.length` is exact even after a frame navigated, then the jump. Positions are never the router's index, which doesn't move for frames.

## Checks that guard it
- **Unit tests** for the pure core and the engine classes: `pnpm test:unit`.
- **End-to-end tests** on React Router 7 and 8: `pnpm test:e2e`. These include history-write counts per main flow, compared with `e2e/baselines/`.
- **The public export list**, compared with `baselines/public-api.txt`: `pnpm api:check`.
