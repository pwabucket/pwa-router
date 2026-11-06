# @pwabucket/pwa-router

Hooks and utilities for client-side routing in React applications, designed for Progressive Web Apps (PWAs). Built on top of [React Router](https://reactrouter.com/).

Every dialog, sheet, menu, tab and inner screen becomes a **layer** in the browser history, so the phone's back gesture closes the top layer, and only that layer, like a native app.

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
- `@playwright/test` (optional, only for [`@pwabucket/pwa-router/testing`](#testing))

## Setup

Wrap your application with `PWARouter`, a `BrowserRouter` with the `PWARoutingProvider` already inside. The provider is the engine that keeps the history in step with your layers. Then render your routes with this package's `Routes`, which matches against the resolved location.

```tsx
// main.tsx
import App from "./App.tsx";
import { PWARouter } from "@pwabucket/pwa-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PWARouter deepLinkHome="/">
      <App />
    </PWARouter>
  </StrictMode>,
);

// App.tsx
import { Route, Routes } from "@pwabucket/pwa-router";

function App() {
  return (
    <Routes>
      {/* your routes */}
    </Routes>
  );
}
```

To place the provider yourself, wrap your app with `PWARoutingProvider` inside any React Router context. It takes the same `deepLinkHome` prop.

### Props

| Prop | Type | Description |
| --- | --- | --- |
| `deepLinkHome` | `string?` | When the app is first opened directly on an inner page (a shared link, a home-screen shortcut), put this home path under it, so the system back gesture shows home first and a second back leaves the app. See [Opening the app on an inner page](#opening-the-app-on-an-inner-page). |

Every other prop is passed to `BrowserRouter`.

## Layers

A layer is a value stored in the current history entry with [`useLocationState`](#uselocationstate), or one of the hooks built on it ([`useLocationToggle`](#uselocationtoggle), [`useLocationTab`](#uselocationtab), [`useLocationPopup`](#uselocationpopup)). The engine handles the history for you:

- **Setting a value adds an entry**, so back closes it.
- **Clearing a value closes its layer from any depth.** It goes back to the entry before the value's latest push, so every layer opened on top closes with it in one step. Entries added since are skipped too, such as those added by an iframe inside a dialog.
- **The router records where each value was pushed.** No component has to stamp anything, and a layer opened on top of another one the moment it appears still closes with its owner.
- **Changes made at the same moment are one step.** Every setter call made in the same tick, for any key, becomes a single navigation (a *transaction*):
  - **Close and open together swap the layers.** Closing a menu while opening a dialog from it puts the dialog in the menu's place, whichever call comes first. History doesn't grow, and back from the dialog returns to the page.
  - **Close and update together** go back first, then write the update on the entry you land on. For example: close a dialog and select the new row on the page below.
- **Changes wait their turn.** A change made while a navigation is still on its way waits for it to land, then applies. This includes changes made by components reacting to the first one, such as a layer opened as soon as another appears: it gets its own entry.
- **New values show straight away.** A value you set is returned by every hook reading it immediately, even before its navigation lands, so a screen never mistakes "on its way" for "removed by back".

### What to store in history

History state is kept by the browser, survives reloads, and is written on every step. Store **small references** (ids, flags, short strings), never large data or secrets. In development, the router warns once per key when a value's serialized form is longer than 4096 characters.

### One owner per layer

A layer is open as long as its value is in the history, whether or not anything on screen shows it. If the component that shows a dialog unmounts while the dialog is open (for example a row scrolled out of a virtualized list), the history still holds an invisible open layer, and the next back press only closes it.

Keep each layer's owner outside lists whose rows mount and unmount: one owner per dialog, opened from the rows with [`useSetLocationToggle`](#usesetlocationtoggle), which never re-renders on navigation.

## Hooks

### `useLocationState`

A value stored on the current history entry.

```tsx
import { useLocationState } from "@pwabucket/pwa-router";

const [step, setStep] = useLocationState("step", 0);

// Set a value (adds an entry)
setStep(1);

// Clear it (goes back to before its latest push)
setStep(undefined);

// Clear it back to before its first push
setStep(undefined, { toStart: true });
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | State key in `location.state` |
| `defaultValue` | `T` | Fallback when the key is not present |
| `options` | `UseLocationStateOptions?` | `{ persist?: boolean; inherit?: boolean; replace?: boolean }`, see [Non-persistent state](#non-persistent-state), [Non-inherited state](#non-inherited-state) and [In-place values](#in-place-values) |

**Returns:** `[T, (value?: T, options?: SetLocationStateOptions) => void]`

`SetLocationStateOptions` is React Router's `NavigateOptions` plus `toStart?: boolean`.
- Pass `replace: true` to update the current entry for this call only.
- Pass `state` to write other values in the same step.
- Pass `toStart: true` when clearing to go back before the value's **first** push, instead of its latest. A value pushed several times (steps 1 → 2 → 3) then closes entirely.

The setter is stable for the provider's lifetime, so it can be passed to memoized components.

#### Batched updates

The setter follows the rules of React's `setState`, with the history entry as the store:

- Calls made in the same tick, for any key, send one navigation for the net change. The latest call for a key wins.
- Setting the value a key already has, or is on its way to, does nothing (compared with `Object.is`).
- Every `useLocationState` of a key reads and writes the same value, so two components setting it navigate once.

```tsx
setValue(undefined);
setValue(undefined); // ignored: already being cleared

setValue("a");
setValue(undefined); // same tick: no change, so no navigation
```

> **Changed in 0.0.25:** setter calls are batched. Clearing a value that isn't set doesn't navigate back; use [`useNavigateBack`](#usenavigateback) to go back on purpose.
>
> **Changed in 0.1.0:**
> - Calls for different keys share one transaction.
> - Clearing lands before the value's latest push, which the router records itself.
> - The setter's third `index` argument is gone; use `toStart` or a transaction instead.

#### In-place values

Pass `{ replace: true }` for values that belong in history but must never add a step: the text in a search box, the selected row, a list filter. They are written in place on the current entry, survive a reload, and come back when the user returns to the page. Clearing one also stays in place.

```tsx
const [search, setSearch] = useLocationState("search", "", { replace: true });

<input value={search} onChange={(event) => setSearch(event.target.value)} />;
```

Typing ten letters adds no entries. An in-place value set in the same tick as a layer opens is written on the current entry first, then the layer is pushed on top, so closing the layer keeps it.

#### Non-persistent state

By default, values survive a page reload because they live in `history.state`. Pass `{ persist: false }` for values that make no sense after a reload (they point at data that only lived in memory):

```tsx
const [isOpen, setIsOpen] = useLocationToggle("example-dialog", {
  persist: false,
});
```

After a reload (or a back into an entry from before the reload), the provider hides these values and goes back to the entry before the earliest one was pushed. It closes them the same way clearing them does, so the first back press after a reload is never spent on a layer that isn't on screen.

To make every value in a section non-persistent, wrap it in [`LocationStateDefaultsProvider`](#locationstatedefaultsprovider).

#### Non-inherited state

Every push copies the current state, so a value is carried into entries pushed by other keys (e.g. a dialog opened on top). Pass `{ inherit: false }` to keep a value on the entry that set it:

```tsx
const [isOpen, setIsOpen] = useLocationToggle("example-panel", { inherit: false });
```

A push by another key while such a value is set **takes its entry's place** instead of stacking on it, so closing what was opened returns to the entry before. Popups use this, so anything opened from a menu replaces the menu.

---

### `useSetLocationState`

The setter of [`useLocationState`](#uselocationstate) without the value. The component never re-renders on navigation, which suits rows of long lists that only open a layer.

```tsx
import { useSetLocationState } from "@pwabucket/pwa-router";

const setSelected = useSetLocationState<string>("selected", { replace: true });
```

**Returns:** `(value?: T, options?: SetLocationStateOptions) => void`, stable for the provider's lifetime.

---

### `useLocationToggle`

A boolean layer (dialogs, drawers, sheets). Closing returns to the entry before it opened, closing everything opened on top.

```tsx
import { useLocationToggle } from "@pwabucket/pwa-router";

const [isOpen, toggle] = useLocationToggle("modal");

toggle(true); // open
toggle(false); // close
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | State key in `location.state` |
| `options` | `UseLocationStateOptions?` | Same as [`useLocationState`](#uselocationstate) |

**Returns:** `[boolean, (status: boolean, options?: SetLocationStateOptions) => void]`

> **Changed in 0.1.0:** the `indexKey` argument is gone (the router records where each layer opened), so options move to the second argument: `useLocationToggle(key, options)`.

### `useSetLocationToggle`

The toggle of [`useLocationToggle`](#uselocationtoggle) without the status, for components that only open or close a layer. It never re-renders on navigation.

```tsx
const openDialog = useSetLocationToggle("details-dialog");

<button type="button" onClick={() => openDialog(true)}>Details</button>;
```

---

### `useLocationTab`

Tabs or panes with a default. Other tabs share one entry above the default, so moving between them never builds up history and one back returns to the default.

```tsx
import { useLocationTab } from "@pwabucket/pwa-router";

const [tab, selectTab] = useLocationTab("example-tab", "overview");

selectTab("details"); // adds one entry above "overview"
selectTab("settings"); // replaces it
selectTab("overview"); // closes it, and anything opened on top
```

- Choosing the default returns to the state before any other tab was chosen, however many layers were opened on top in the meantime.
- Back from any other tab returns to the default in one press.
- The same hook covers two panes on a phone: the list is the default pane (`null`), and opening an item shows its pane.

  ```tsx
  const [itemId, showItem] = useLocationTab<string | null>("item", null);
  ```

**Returns:** `[T, (tab: T, options?: SetLocationStateOptions) => void]`

---

### `useLocationPopup`

A popup from a UI library (menu, select, combobox, picker, context menu) whose open state is a layer:
- it closes on back;
- it never reopens after a reload;
- anything opened from it takes its place.

Each instance gets its own key, so a page can show many. The returned props match the libraries' `open`/`onOpenChange` pair, and extra arguments a library passes are ignored.

```tsx
import { useLocationPopup } from "@pwabucket/pwa-router";

const menu = useLocationPopup("item-menu");
```

| Library | Usage |
| --- | --- |
| Base UI | `<Menu.Root open={menu.open} onOpenChange={menu.onOpenChange}>` |
| Radix UI | `<DropdownMenu.Root open={menu.open} onOpenChange={menu.onOpenChange}>` |
| Headless UI | `<Dialog open={menu.open} onClose={() => menu.onOpenChange(false)}>` |

Components without a controlled `open` prop can't be driven by history.

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `name` | `string?` | Prefix of the generated key (default: `"popup"`) |
| `options` | `UseLocationStateOptions?` | Defaults to `{ persist: false, inherit: false }` |

**Returns:** `{ open: boolean; onOpenChange: (open: boolean) => void }`

---

### `useLeaveGuard`

Asks before leaving a page, or closing a layer, with unsaved work, however the user tries to leave: the back gesture, the in-app back button, a link, a close button or Escape (through the layer's setter), reloading or closing the tab.

```tsx
import { useLeaveGuard } from "@pwabucket/pwa-router";

// The whole page
const guard = useLeaveGuard({ when: hasUnsavedChanges });

// A layer, such as a screen inside the page
const guard = useLeaveGuard({ when: hasUnsavedChanges, key: "editor" });

{guard.isBlocked && (
  <ConfirmDialog onCancel={guard.stay} onConfirm={guard.leave}>
    There are unsaved changes. Leave and lose them?
  </ConfirmDialog>
)}
```

**Options:**

| Option | Type | Description |
| --- | --- | --- |
| `when` | `boolean` | There is unsaved work to protect |
| `key` | `string?` | The layer to guard. Without one the guard covers the page (its pathname) |

**Returns:** `{ isBlocked: boolean; stay: () => void; leave: () => void }`

- **Show your question while `isBlocked` is true.** The question is itself a layer, so pressing back while it shows means "stay".
- **`stay` closes the question.** The user stays exactly where they were, with every open layer intact and the page still mounted, so its local state is kept.
- **`leave` finishes the move the user tried**, landing where they would have gone without the question.
- **Moves inside the scope never ask:** opening or closing dialogs, menus, tabs or the scope's own panes.
- **Protection never switches itself off:** the next attempt asks again, and once `when` is false, leaving needs no extra taps.
- **Reloading and closing the tab** show the browser's own warning while `when` is true.

A back press is noticed after the browser has moved, then undone, while the guarded screen stays on show. No hidden entries are added. Clearing a layer's value doesn't count as leaving a *page*: only layer guards check those.

A page opened directly, with no earlier page in its tab, can't catch the back gesture, because back leaves the app without telling it. Set [`deepLinkHome`](#props) to put home underneath.

---

### `usePWARouting`

Access the `PWARoutingContext` value.

```tsx
import { usePWARouting } from "@pwabucket/pwa-router";

const { resolvedLocation, isCorrecting } = usePWARouting();
```

**Returns:** `PWARoutingContextValue` — `{ resolvedLocation: Location; isCorrecting: boolean }`

`resolvedLocation` is the location the engine is settling on, with the values on their way to the history laid over it.

`isCorrecting` is `true` while the engine is correcting the history: going back to a position, discarding stale non-persistent state, closing a layer from depth, or undoing a guarded move. Navigations made through this package are ignored meanwhile.

---

### `useLocation`

Drop-in replacement for React Router's `useLocation` that returns `resolvedLocation`, so stale non-persistent values and intermediate locations are never seen.

---

### `useNavigate`

Drop-in replacement for React Router's `useNavigate` that is aware of the provider:

- Calls are ignored while `isCorrecting` is `true`, so they can't race a correction.
- A push from an entry holding [non-inherited state](#non-inherited-state) replaces that entry (pass `replace` explicitly to override), so back returns to the entry before it.
- The returned function is stable across navigations.

---

### `useSearchParams`

Drop-in replacement for React Router's `useSearchParams`. Reads come from `resolvedLocation`, and the setter goes through [`useNavigate`](#usenavigate).

---

### `useNavigateBack`

Returns a callback that goes back in history. If there is no earlier entry (the user landed directly on the page), it navigates to a root path instead. The callback is stable across navigations.

```tsx
import { useNavigateBack } from "@pwabucket/pwa-router";

const navigateBack = useNavigateBack();

<button type="button" onClick={() => navigateBack()}>Back</button>;
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `root` | `string?` | Fallback path when there is no history to go back to (default: `"/"`) |

**Returns:** `(options?: NavigateOptions) => void`

## Components

### `LocationStateDefaultsProvider`

Sets default options for every location state value inside it. A value's own options still win.

```tsx
import { LocationStateDefaultsProvider } from "@pwabucket/pwa-router";

// Nothing in this section survives a reload
<LocationStateDefaultsProvider persist={false}>
  <ExampleSection />
</LocationStateDefaultsProvider>;
```

| Prop | Type | Description |
| --- | --- | --- |
| `persist` | `boolean?` | Default for `persist` |
| `inherit` | `boolean?` | Default for `inherit` |

### `Link` / `NavLink` / `Navigate` / `Routes`

Drop-in replacements for React Router's `Link`, `NavLink`, `Navigate` and `Routes`, with the same props.
- Like [`useNavigate`](#usenavigate), clicks are ignored while the provider is correcting, and pushes from an entry holding non-inherited state replace it.
- `NavLink` matches its active state against `resolvedLocation`.
- `Navigate` waits for a correction to finish before redirecting.
- `Routes` matches against `resolvedLocation` unless a `location` is passed.

```tsx
import { Link, Navigate, NavLink } from "@pwabucket/pwa-router";

<Link to="/posts">Posts</Link>
<NavLink to="/users">Users</NavLink>
<Navigate to="/login" replace />
<Routes>{/* your routes */}</Routes>
```

Prefer these and the hooks above over React Router's, so navigation goes through the provider.

### `PWARouter`

A `BrowserRouter` with the `PWARoutingProvider` already inside. Takes the same props as `BrowserRouter`, plus [`deepLinkHome`](#props).

### `RouterStatusProbe`

Exposes the engine's status to end-to-end tests as an attribute on the root element. Render it inside the router in test builds; see [Testing](#testing).

## Opening the app on an inner page

People open PWAs directly on inner pages, from shared links or home-screen shortcuts. With nothing earlier in the tab, the system back gesture closes the app instead of going home.

With `deepLinkHome` set, when the app is first opened on an inner page (the first entry, with no state), the router replaces that entry with the home path and pushes the inner page back on top. This happens during the user's first click or key press, because browsers may skip entries added without a user interaction when the back button is pressed. Reloads and returning to the app add nothing more.

## Testing

`@pwabucket/pwa-router/testing` holds [Playwright](https://playwright.dev/) helpers for testing back-gesture flows in a real browser. Render [`RouterStatusProbe`](#routerstatusprobe) in the app under test, so the helpers know when the engine has settled.

```ts
import { expect, test } from "@playwright/test";
import { goBack, press, visit } from "@pwabucket/pwa-router/testing";

test("back closes the dialog", async ({ page }) => {
  const start = await visit(page, "/example");
  await press(page, "Open dialog");

  const back = await goBack(page);
  expect(back.index).toBe(start.index);
});
```

| Helper | Description |
| --- | --- |
| `visit(page, path)` | Opens a path in a fresh entry |
| `press(page, name)` | Clicks a button by its accessible name |
| `goBack(page)` / `goForward(page)` | Presses the browser's back or forward button |
| `reload(page)` | Reloads the page |
| `settle(page)` | Waits until the engine is idle and the history stops changing |
| `readHistory(page)` | Reads the history now |

Every helper waits for the engine, then returns a `HistorySnapshot`: `{ path, length, index, state, isCorrecting }`, where `index` is React Router's index of the current entry and `state` the values stored on it.

Run each flow in its own page. Frames on one page share one history, so two of them corrupt each other's.

## Re-exports

So apps can import routing from this package alone, these React Router exports are passed through unchanged:

- **Components:** `BrowserRouter`, `Outlet`, `Route`
- **Hooks:** `useBeforeUnload`, `useHref`, `useInRouterContext`, `useMatch`, `useNavigationType`, `useOutletContext`, `useParams`, `useResolvedPath`
- **Utilities:** `createSearchParams`, `generatePath`, `matchPath`, `resolvePath`
- **Types:** `BrowserRouterProps`, `LinkProps`, `Location`, `NavigateFunction`, `NavigateOptions`, `NavigateProps`, `NavLinkProps`, `NavLinkRenderProps`, `OutletProps`, `Params`, `Path`, `PathMatch`, `RouteProps`, `RoutesProps`, `SetURLSearchParams`, `To`, `URLSearchParamsInit`

`useNavigationType` reports React Router's own value, which includes the engine's correction steps.

## Upgrading to 0.1.0

- `useLocationIndexUpdater` and `useLocationIndex` are removed. The router records where each layer opened, so delete the calls.
- `useLocationToggle(key, indexKey, options)` becomes `useLocationToggle(key, options)`.
- The `indexKey` option of `useLocationState` is removed.
- The setter's third `index` argument is removed. To go back before a value's first push, clear it with `{ toStart: true }`. To close several layers, clear the lowest one: everything above closes with it.
- Hand-written "replace instead of add" options and lists of keys to clear on close can go. Close one layer and open another in the same tick, and the new one takes its place.
- Hand-written leave guards built on hidden entries can be replaced with [`useLeaveGuard`](#useleaveguard).
- `routerState.ephemeral` takes a list of keys instead of a key map.

## Types

The following types are exported for convenience:

- **`PWARouterProps`**, **`PWARoutingProviderProps`**, **`PWARoutingContextValue`**
- **`UseLocationStateOptions`**, **`SetLocationStateOptions`**, **`SetLocationState<T>`**, **`UseLocationStateReturn<T>`**
- **`SetLocationToggle`**, **`UseLocationToggleReturn`**
- **`SelectLocationTab<T>`**, **`UseLocationTabReturn<T>`**
- **`LocationPopupProps`**, **`LocationStateDefaultsProviderProps`**
- **`UseLeaveGuardOptions`**, **`LeaveGuardControls`**

## License

[MIT](LICENSE)
