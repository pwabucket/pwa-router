# @pwabucket/pwa-router

Hooks and utilities for client-side routing in React applications, designed for Progressive Web Apps (PWAs). Built on top of [React Router](https://reactrouter.com/).

Values such as an open dialog are stored in the browser history, so the back gesture closes them.

## Contents

- [Installation](#installation)
- [Setup](#setup)
- [Location state](#location-state): `useLocationState`, `useLocationToggle`, `useLocationIndexUpdater`, `useLocationIndex`
- [Navigation](#navigation): `useNavigate`, `useNavigateBack`, `useLocation`, `usePWARouting`
- [Components](#components): `PWARouter`, `PWARoutingProvider`, `Routes`, `Link`, `NavLink`, `Navigate`
- [State markers](#state-markers)
- [Examples](#examples)
- [Re-exports](#re-exports)
- [Types](#types)

## Installation

```bash
# npm
npm install @pwabucket/pwa-router

# pnpm
pnpm add @pwabucket/pwa-router
```

### Peer Dependencies

- `react` ^18 || ^19
- `react-router` ^7 || ^8 (React Router 8 itself needs React 19.2.7 or later)

## Setup

Wrap the application with `PWARouter`, a `BrowserRouter` with the `PWARoutingProvider` inside, and render routes with this package's `Routes`.

```tsx
// main.tsx
import App from "./App.tsx";
import { PWARouter } from "@pwabucket/pwa-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PWARouter>
      <App />
    </PWARouter>
  </StrictMode>,
);

// App.tsx
import { Route, Routes } from "@pwabucket/pwa-router";

function App() {
  return <Routes>{/* routes */}</Routes>;
}
```

To place the provider inside an existing React Router context, render `PWARoutingProvider` instead.

## Location state

### `useLocationState`

A value stored on the current history entry.

```tsx
const [value, setValue] = useLocationState(key, defaultValue, options);

setValue("example"); // pushes an entry holding the value
setValue(undefined); // goes back one entry
setValue(undefined, {}, index); // goes back to before a stamped index
```

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | The key in `location.state` |
| `defaultValue` | `T` | The value when the key isn't set |
| `options` | `UseLocationStateOptions?` | `{ persist?: boolean; indexKey?: string; inherit?: boolean }` |

**Returns:** `[T, (value?: T, options?: NavigateOptions, index?: number) => void]`

- A value pushes an entry carrying the current state, or writes in place with `{ replace: true }`.
- `undefined` goes back: to before `index` when one is given, otherwise one entry (or to `"/"` when nothing is behind).
- Each call navigates; calls aren't batched. Setting the value the key already has does nothing (`Object.is`), so clearing a value that isn't set doesn't go back.
- The setter is stable across navigations.

#### `persist`

Values survive a reload by default, since they live in `history.state`. With `{ persist: false }`, the provider hides the value after a reload (or on a back into an entry from before it) and goes back behind the scenes:

- with an `indexKey`, to the entry before its stamp, like closing a stamped toggle;
- otherwise back one entry at a time, or, when nothing is behind, by dropping the value in place.

#### `inherit`

Each push copies the current state, so a value is carried into entries pushed by other keys. With `{ inherit: false }`, the value stays on the entry that set it:

- a push by another key replaces that entry instead of stacking on it;
- closing the value is ignored when the entry it was read from is no longer the current one, so a close racing a navigation can't go back from the new entry.

### `useLocationToggle`

A boolean value, for dialogs, drawers and sheets.

```tsx
const [isOpen, setOpen] = useLocationToggle(key, indexKey, options);

setOpen(true); // pushes
setOpen(false); // goes back, to before the indexKey stamp when there is one
```

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | The key in `location.state` |
| `indexKey` | `string?` | The stamp to close back to (see [`useLocationIndexUpdater`](#uselocationindexupdater)) |
| `options` | `UseLocationStateOptions?` | `{ persist?: boolean; inherit?: boolean }` |

**Returns:** `[boolean, (status: boolean, options?: NavigateOptions) => void]`

### `useLocationIndexUpdater`

Stamps `history.length` on the current entry, under `__router_index_<key>`, when the component first mounts. Call it inside the toggled content. Entries pushed on top carry the stamp, so a toggle given the same `indexKey` closes back to before the stamped entry in one move, skipping entries added since (such as an iframe's navigations).

```tsx
function DialogContent() {
  useLocationIndexUpdater("dialog");
  // ...
}

const [isOpen, setOpen] = useLocationToggle("dialog", "dialog");
```

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | The index key |

### `useLocationIndex`

Reads the stamp under an index key on the current entry.

```tsx
const index = useLocationIndex("dialog");
```

**Returns:** `number | undefined`

## Navigation

### `useNavigate`

React Router's `useNavigate`, aware of the provider:

- calls are ignored while the provider is correcting, so they can't race a correction;
- leaving an entry that holds `inherit: false` values replaces it, unless `replace` is passed;
- the returned function is stable across navigations.

**Returns:** `NavigateFunction`

### `useNavigateBack`

Returns a function that goes back one entry, or navigates to `root` when nothing is behind (the app was opened on this entry).

```tsx
const navigateBack = useNavigateBack();

<button onClick={() => navigateBack()}>Back</button>;
```

| Param | Type | Description |
| --- | --- | --- |
| `root` | `string?` | The path when nothing is behind (default: `"/"`) |

**Returns:** `(options?: NavigateOptions) => void`

### `useLocation`

React Router's `useLocation`, returning `resolvedLocation`: stale non-persistent values and the locations a correction passes through are never seen.

### `usePWARouting`

The provider's value.

```tsx
const { resolvedLocation, isCorrecting } = usePWARouting();
```

**Returns:** `PWARoutingContextValue`: `{ resolvedLocation: Location; isCorrecting: boolean }`

`isCorrecting` is `true` while the provider corrects the history: going back for a [state marker](#state-markers), closing stale non-persistent values, or going back to a stamp. Meanwhile, `useNavigate` ignores calls and `Navigate` waits.

## Components

### `PWARouter`

A `BrowserRouter` with the `PWARoutingProvider` inside. Takes `BrowserRouter`'s props.

### `PWARoutingProvider`

The provider, for use inside an existing React Router context.

### `Routes`

React Router's `Routes`, matched against `resolvedLocation` unless a `location` is passed.

### `Link` / `NavLink` / `Navigate`

React Router's components. Leaving an entry that holds `inherit: false` values replaces it, unless `replace` is passed. `Navigate` renders nothing while the provider is correcting, then navigates.

## State markers

Markers are put in a navigation's `state`, and run by the provider once the navigation lands.

| Marker | Description |
| --- | --- |
| `routerState.from(delta)` | Go back by `delta` first, then apply the navigation from there |
| `routerState.destroy(index)` | Push an entry to drop forward history, then go back to before `index` (used by stamped closes) |
| `routerState.navigate(index)` | Go back to before `index` |

```tsx
<Link to="/example" replace state={routerState.from(-1)}>
  Example
</Link>
```

Each marker is also exported on its own: `fromPosition`, `destroyIndex`, `navigateIndex`.

## Examples

Common flows, built from the hooks above.

### A menu item opening a dialog

The menu is `inherit: false`, so opening the dialog from the menu's entry replaces it, and back from the dialog returns to the page. A close of the menu that arrives after the dialog opened is ignored.

```tsx
const [isMenuOpen, setMenuOpen] = useLocationToggle("menu", undefined, {
  inherit: false,
});
const [isDialogOpen, setDialogOpen] = useLocationToggle("dialog");
```

### A sheet with a confirm on top

The sheet's content stamps the sheet's entry; closing the sheet from the confirm closes both.

```tsx
const SheetContent = () => {
  useLocationIndexUpdater("sheet");
  // ...
};

const [isSheetOpen, setSheetOpen] = useLocationToggle("sheet", "sheet");
const [isConfirmOpen, setConfirmOpen] = useLocationToggle("confirm");

/* Confirm */
setSheetOpen(false);
```

### Closing a dialog and updating the page below

```tsx
navigate(location.pathname, {
  replace: true,
  state: { ...routerState.from(-1), selected: "example" },
});
```

### A drawer link replacing the page under the drawer

```tsx
<Link to="/example" replace state={routerState.from(-1)}>
  Example
</Link>
```

### A value kept in history without adding entries

Written in place with `{ replace: true }`. The input keeps its own text, since the location updates after the navigation renders.

```tsx
const [search, setSearch] = useLocationState("search", "");
const [text, setText] = useState(search);

<input
  value={text}
  onChange={(event) => {
    setText(event.target.value);
    setSearch(event.target.value, { replace: true });
  }}
/>;
```

### Popups from UI libraries

A key per instance, `persist: false` so they don't return after a reload, and `inherit: false` so a dialog opened from them takes their place. `(open) => setOpen(open)` drops the extra arguments some libraries pass to `onOpenChange`.

```tsx
const usePopupToggle = () =>
  useLocationToggle(`popup-${useId()}`, undefined, {
    persist: false,
    inherit: false,
  });

const [isOpen, setOpen] = usePopupToggle();

<Select.Root open={isOpen} onOpenChange={(open) => setOpen(open)} />;
```

### Defaults for a group of layers

```tsx
const useEphemeralToggle = (key: string) =>
  useLocationToggle(key, undefined, { persist: false });
```

### Asking before leaving with unsaved work

The browser reports a back gesture after it happened, so a guard puts an entry on top beforehand:

1. While there's unsaved work, open a guard toggle (`persist: false`), which pushes an entry.
2. Back pops it: the guard is closed while work is still unsaved, so show the question.
3. "Stay" opens the guard again. "Leave" goes back once more, or follows the held link.
4. Once saved, close the guard.
5. For reloads and closing the tab, use `useBeforeUnload`.

### Tabs

- **Tabs with no history:** the active tab in `useState`. If a tab pushes its own entries, stamp the tab's base and close back to it when switching away, so back on another tab doesn't pop an entry that isn't on screen.
- **Back returns to the default tab:** push when leaving the default, replace between the other tabs, and close to return to the default.

### Two panes on small screens

The second pane is a toggle. When the layout widens and both panes show, close it.

### Opening the app on an inner page

Puts home under a page the app was first opened on, so back shows home before leaving. One navigation per landing: the first load of an entry (`location.key === "default"`) is replaced with home, carrying the page; once that replace has landed, the page is pushed again. Back to home and reloads are `POP` navigations, so they don't push again.

```tsx
const useDeepLinkHome = (home = "/") => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  useEffect(() => {
    /* First load on an inner page: replace it with home, carrying the page */
    if (location.key === "default" && location.pathname !== home) {
      const { pathname, search, hash, state } = location;
      navigate(home, {
        replace: true,
        state: { deepLinkTo: { pathname, search, hash, state } },
      });
      return;
    }

    /* The replace landed: push the page again */
    const target = location.state?.deepLinkTo;
    if (navigationType === "REPLACE" && target) {
      const { state, ...path } = target;
      navigate(path, { state });
    }
  }, [location, navigationType, navigate, home]);
};
```

`useNavigationType` comes from `react-router`.

### Testing back-gesture flows

With [Playwright](https://playwright.dev/): `page.goBack()`, then read `history.length` and `history.state` with `page.evaluate`. Run each flow in its own page: frames on one page share one history.

## Re-exports

These React Router exports are passed through unchanged:

- **Components:** `BrowserRouter`, `Outlet`, `Route`
- **Hooks:** `useBeforeUnload`, `useHref`, `useInRouterContext`, `useMatch`, `useOutletContext`, `useParams`, `useResolvedPath`
- **Utilities:** `createSearchParams`, `generatePath`, `matchPath`, `resolvePath`
- **Types:** `BrowserRouterProps`, `LinkProps`, `Location`, `NavigateFunction`, `NavigateOptions`, `NavigateProps`, `NavLinkProps`, `NavLinkRenderProps`, `OutletProps`, `Params`, `Path`, `PathMatch`, `RouteProps`, `RoutesProps`, `SetURLSearchParams`, `To`, `URLSearchParamsInit`

## Types

- **`PWARouterProps`**: `BrowserRouterProps`
- **`PWARoutingContextValue`**: `{ resolvedLocation: Location; isCorrecting: boolean }`
- **`UseLocationStateOptions`**: `{ persist?: boolean; indexKey?: string; inherit?: boolean }`
- **`UseLocationStateReturn<T>`**: `[T, (value?: T, options?: NavigateOptions, index?: number) => void]`
- **`UseLocationToggleReturn`**: `[boolean, (status: boolean, options?: NavigateOptions) => void]`

## License

[MIT](LICENSE)
