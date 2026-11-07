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

## Tabbed apps

For apps with a tab bar (home, search, profile…), where each tab remembers where you were.

```tsx
import { TabsRoot, TabView, useTabs } from "@pwabucket/pwa-router";

/** The app's tabs */
enum TabId {
  Home = "home",
  Search = "search",
  Profile = "profile",
}

/** Every tab with the path of its first page; keep the list constant */
const TABS = [
  { id: TabId.Home, root: "/" },
  { id: TabId.Search, root: "/search" },
  { id: TabId.Profile, root: "/profile" },
];

<TabsRoot id="main" tabs={TABS} defaultTab={TabId.Home}>
  <TabBar />
  {TABS.map(({ id }) => (
    <TabPane key={id} id={id}>
      <AppRoutes />
    </TabPane>
  ))}
</TabsRoot>;

/** The tab bar, built with your own UI library */
const TabBar = () => {
  const { active, select } = useTabs();
  // render buttons calling select(TabId.Search)…
};

/** A tab's pane, laid out by the app: here, hidden while its tab isn't active */
const TabPane = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { active } = useTabs();

  return (
    <TabView id={id}>
      <div hidden={active !== id}>{children}</div>
    </TabView>
  );
};
```

### How it behaves

- **Back inside a tab** goes through that tab's pages and the layers opened on them.
- **Back from a tab's first page** goes to the default tab, where you left it. Back from the default tab's first page leaves the tab area.
- **Switching tabs** shows the tab where you left it, and never builds up history.
- **Popping a tab to its first page** is `popToRoot()`, for example when the active tab is tapped again; the tab bar decides.
- **Any navigation from inside a tab belongs to that tab**, whatever its address, so tabs can share routes. That includes links made with React Router directly.
- **Leaving the tab area** (logout, onboarding) clears every tab's history at once: pass `exitTabs` to `useNavigate`, `Link`, `NavLink` or `Navigate`.

  ```tsx
  <Link to="/login" exitTabs replace>Log out</Link>
  ```
- **Opened directly on a tab page** (a shared link), the app picks the tab whose `root` is the longest match of the address, or the default tab when none matches. Roots match the way React Router matches routes: whole path segments, ignoring case. On the first tap, the default tab's first page and the tab's first page are put underneath, so back goes there before leaving the app. Pass `deepLinkRoots={false}` to `TabsRoot` to put nothing underneath.
- **A reload** keeps the active tab, its pages and layers, and every other tab's.

### How the history is kept

The browser history only holds the **active** tab's pages. The default tab's pages stay at the bottom; any other tab takes one slot above them.

```
Home, two pages deep:        [Home] [Home: post 5]
Search, one page deeper:     [Home] [Home: post 5] [Search] [Search: results]
Switch to Profile:           [Home] [Home: post 5] [Profile]           ← Search's pages saved
Switch to Search:            [Home] [Home: post 5] [Search: results]   ← one entry
Back:                        [Home] [Home: post 5] [Search]            ← same entry, changed
Back:                        [Home] [Home: post 5]
```

- **A switch costs one close and one push, however deep the tab is.** The tab's other pages and layers are kept in the history state of its entry, not as entries.
- **Back through those kept steps** is noticed and undone: the router goes forward again and changes the entry to the previous page or layer, with the screen kept still meanwhile. Closing a kept layer with its own button shows what was under it the same way, without a new entry.
- **What a tab keeps** is each page and layer, with every location state value except those marked `persist: false` or `inherit: false`:
  - dialogs, panels, selections and [in-place values](#in-place-values) such as a search box's text come back with the tab;
  - popups and menus ([`useLocationPopup`](#uselocationpopup)) close on a switch. On the default tab they close before it, and the rest stays open below.
- **How much it keeps:** at most 50 pages and layers per tab.

### Tabs at one address

For a page whose tabs share its address, where moving inside a tab is location state (opening an item, then its panel). Leave out `root`: every tab starts on the address the page was opened on.

```tsx
/** The page's tabs, all at its address */
const TABS = [{ id: "canvas" }, { id: "items" }, { id: "settings" }];

<TabsRoot id="layout" tabs={TABS} defaultTab="canvas">
  <TabBar />
  <TabPane id="canvas">
    <Canvas />
  </TabPane>
  <TabPane id="items">
    <Items />
  </TabPane>
  <TabPane id="settings">
    <Settings />
  </TabPane>
</TabsRoot>;
```

- **The area starts where the `TabsRoot` mounts.** Back from the default tab leaves the page.
- **Each tab keeps its layers** the way an app's tab keeps pages: one slot, one push per switch, and back steps through them in one entry.
- **A link to the page opens the default tab**, with nothing put underneath. Tabs without a `root` are never picked from an address; tabs with one still are, so both kinds can mix.

### Views and layout

- **`TabView` gives a tab's screens their location; the layout is yours.** It renders no element, so show, hide, animate or place the panes however the app needs.
- **Screens can read their tab's status** with [`useTabView`](#usetabview).
- **Only the active tab's screens are live.** Every other view reads its tab's last step: it can't navigate or change location state, and its location doesn't change while other tabs navigate.
- **Panes kept mounted while hidden** keep their screens' state and unsaved work across switches, and a switch never asks a [leave guard](#useleaveguard). Leaving the tab area (`exitTabs`) does ask. A heavy pane can drop its content while its tab isn't active, to save memory on low-end phones; its screens then lose their local state.
- **A wide layout showing every pane at once** renders them without `TabsRoot`: only one tab can own the current entry. With no `TabsRoot` mounted, the router has no tab behaviour, and back is a plain back.

## Hooks

### `useTabs`

The nearest tabbed area: the tab on show, and switching tabs.

```tsx
const { active, select, popToRoot } = useTabs();
```

**Returns:** `{ active: string; select: (tab: string) => void; popToRoot: () => void }`
- `active` is the tab on show; it changes as soon as `select` is called.
- `select(tab)` switches to a tab. On the active tab, it does nothing.
- `popToRoot()` pops the active tab to its first page, closing everything above it. Unlike a switch, it asks a [leave guard](#useleaveguard) it would leave.
- `select` and `popToRoot` are stable.

---

### `useTabView`

The tab of the nearest [`TabView`](#tabsroot--tabview), and whether it is active, for screens that act differently while their tab isn't selected: pausing media, skipping work, setting `aria` attributes.

```tsx
const view = useTabView();

useEffect(() => {
  if (!view?.isActive) video.pause();
}, [view?.isActive]);
```

**Returns:** `{ tab: string; isActive: boolean } | null`
- `isActive` is `true` while the view's tab is selected, including one being switched to.
- `null` outside every `TabView`.

---

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
- Pass `replace: true, onOwnEntry: true` to update a pushed value on the entry it was pushed on, closing every layer opened above it first, in one step. [`useLocationTab`](#uselocationtab) uses it to switch between tabs.

The setter is stable for the provider's lifetime, so it can be passed to memoized components. The hook re-renders only when its own value changes, not when other layers open or close.

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
- **`useLocationTab` or `TabsRoot`?** `useLocationTab` is one value, and the tabs other than the default share one entry: layers opened on one of them close when you switch away from it. When each tab should keep its layers across switches, use a `TabsRoot` with [tabs at one address](#tabs-at-one-address).

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
| `warnOnUnload` | `boolean?` | Also show the browser's own warning on reload and closing the tab (default: `true`) |

**Returns:** `{ isBlocked: boolean; stay: () => void; leave: () => void }`

- **Show your question while `isBlocked` is true.** The question is itself a layer, so pressing back while it shows means "stay".
- **`stay` closes the question.** The user stays exactly where they were, with every open layer intact and the page still mounted, so its local state is kept.
- **`leave` finishes the move the user tried**, landing where they would have gone without the question.
- **Moves inside the scope never ask:** opening or closing dialogs, menus, tabs or the scope's own panes.
- **Protection never switches itself off:** the next attempt asks again, and once `when` is false, leaving needs no extra taps.
- **Reloading and closing the tab** show the browser's own warning while `when` is true. Pass `warnOnUnload: false` to skip it, for example when the work is saved as a draft.

A back press is noticed after the browser has moved, then undone, while the guarded screen stays on show. No hidden entries are added. Clearing a layer's value doesn't count as leaving a *page*: only layer guards check those.

A page opened directly, with no earlier page in its tab, can't catch the back gesture, because back leaves the app without telling it. Set [`deepLinkHome`](#props) to put home underneath.

---

### `usePWARouting`

Access the `PWARoutingContext` value.

```tsx
import { usePWARouting } from "@pwabucket/pwa-router";

const { resolvedLocation, isCorrecting } = usePWARouting();
```

**Returns:** `PWARoutingContextValue` — `{ resolvedLocation: Location; isCorrecting: boolean; isInactive: boolean }`

`resolvedLocation` is the location the engine is settling on, with the values on their way to the history laid over it.

`isCorrecting` is `true` while the engine is correcting the history: going back to a position, discarding stale non-persistent state, closing a layer from depth, undoing a guarded move, or recording a tab page. Navigations made through this package are ignored meanwhile.

`isInactive` is `true` inside a tab that isn't active, whose navigations are ignored.

---

### `useLocation`

Drop-in replacement for React Router's `useLocation` that returns `resolvedLocation`, so stale non-persistent values and intermediate locations are never seen.

---

### `useNavigate`

Drop-in replacement for React Router's `useNavigate` that is aware of the provider:

- Calls are ignored while `isCorrecting` is `true`, so they can't race a correction.
- A push from an entry holding [non-inherited state](#non-inherited-state) replaces that entry (pass `replace` explicitly to override), so back returns to the entry before it.
- The returned function is stable across navigations.
- Calls from a tab that isn't active are ignored.
- Pass `exitTabs: true` to leave the [tabbed area](#tabbed-apps), clearing every tab's history.

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
- Like [`useNavigate`](#usenavigate), clicks are ignored while the provider is correcting or from a tab that isn't active, and pushes from an entry holding non-inherited state replace it.
- `Link`, `NavLink` and `Navigate` take `exitTabs` to leave the [tabbed area](#tabbed-apps).
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

### `TabsRoot` / `TabView`

See [Tabbed apps](#tabbed-apps).

| `TabsRoot` prop | Type | Description |
| --- | --- | --- |
| `id` | `string` | The tabbed area's id |
| `tabs` | `TabDefinition[]` | Every tab: `{ id: string; root?: string }`, where `root` is the path of its first page. Without one, the tab starts on the address the area was opened on ([tabs at one address](#tabs-at-one-address)). Keep the list constant |
| `defaultTab` | `string` | The tab at the bottom: back from any other tab returns to it |
| `deepLinkRoots` | `boolean?` | Put the tab roots under a page the app is first opened on, so back goes there first (default: `true`) |

| `TabView` prop | Type | Description |
| --- | --- | --- |
| `id` | `string` | The tab whose location the view's screens read |

`TabView` renders only its children: the app lays out and shows its panes ([views and layout](#views-and-layout)).

Tabbed areas can nest: a `TabsRoot` inside a `TabView` is an area of its own, which lives while its parent tab is shown. Switching the outer tab away and back restores the inner tabs, where they were, at one push. A navigation from the outer tab's page, outside the inner tabs, still counts as a page of the inner area.

### `PWARouter`

A `BrowserRouter` with the `PWARoutingProvider` already inside. Takes the same props as `BrowserRouter`, plus [`deepLinkHome`](#props).

### `RouterStatusProbe`

Exposes the engine's status to end-to-end tests as an attribute on the root element. Render it inside the router in test builds; see [Testing](#testing).

## Opening the app on an inner page

People open PWAs directly on inner pages, from shared links or home-screen shortcuts. With nothing earlier in the tab, the system back gesture closes the app instead of going home.

Inside a [tabbed area](#tabbed-apps) this happens on its own, with the tab roots underneath, unless `TabsRoot` has `deepLinkRoots={false}`. A default tab without a `root` puts nothing underneath. Elsewhere, with `deepLinkHome` set, when the app is first opened on an inner page (the first entry, with no state), the router replaces that entry with the home path and pushes the inner page back on top. This happens during the user's first click or key press, because browsers may skip entries added without a user interaction when the back button is pressed. Reloads and returning to the app add nothing more.

## State markers

For moves the hooks don't cover, a navigation's state can carry a marker that the router acts on. Spread one from `routerState` into `state`:

```tsx
import { NavLink, routerState } from "@pwabucket/pwa-router";

<NavLink to="/settings" replace state={routerState.from(-1)}>
  Settings
</NavLink>;
```

- `routerState.from(delta)` goes back by `delta` entries first, then applies the navigation from there. A link inside a sidebar layer uses `from(-1)` with `replace`: the sidebar's entry closes and the page takes its place, so back never reopens the sidebar.
- `routerState.navigate(position)` lands on the entry before `position`, where an entry's position is `window.history.length` right after it was pushed.
- `routerState.destroy(position)` first pushes an entry, which drops every forward entry (such as those an iframe added), then lands like `navigate`.
- `fromPosition`, `navigateIndex` and `destroyIndex` are the same helpers on their own, and `ROUTER_FROM_POSITION`, `ROUTER_NAVIGATE_INDEX` and `ROUTER_DESTROY_INDEX` are their keys.

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
- `routerState.ephemeral`, `routerState.nonInherited`, `ephemeralKeys`, `nonInheritedKeys` and the internal `ROUTER_EPHEMERAL_KEYS`, `ROUTER_NON_INHERITED_KEYS`, `ROUTER_GUARD` and `ROUTER_TABS` constants are removed: the engine keeps its data under one `__router` key. History state written by 0.0.25 isn't read: a `persist: false` value left in an old entry may show again after the upgrade.

## Types

The following types are exported for convenience:

- **`PWARouterProps`**, **`PWARoutingProviderProps`**, **`PWARoutingContextValue`**
- **`UseLocationStateOptions`**, **`SetLocationStateOptions`**, **`SetLocationState<T>`**, **`UseLocationStateReturn<T>`**
- **`SetLocationToggle`**, **`UseLocationToggleReturn`**
- **`SelectLocationTab<T>`**, **`UseLocationTabReturn<T>`**
- **`LocationPopupProps`**, **`LocationStateDefaultsProviderProps`**
- **`UseLeaveGuardOptions`**, **`LeaveGuardControls`**
- **`TabsRootProps`**, **`TabViewProps`**, **`TabDefinition`**, **`TabsControls`**, **`TabViewStatus`**
- **`PWANavigateFunction`**, **`PWANavigateOptions`**, **`PWALinkProps`**, **`PWANavLinkProps`**, **`PWANavigateProps`**

## License

[MIT](LICENSE)
