# @pwabucket/pwa-router

Hooks and utilities for client-side routing in React applications, designed for Progressive Web Apps (PWAs). Built on top of [React Router](https://reactrouter.com/).

## Installation

```bash
# npm
npm install @pwabucket/pwa-router

# pnpm
pnpm add @pwabucket/pwa-router
```

### Peer Dependencies

- `react` ^18 || ^19
- `react-router` ^7

## Setup

Wrap your application with `PWARoutingProvider` inside a React Router context. The provider manages internal history tracking needed by the routing hooks.

```tsx
// main.tsx
import App from "./App.tsx";
import { BrowserRouter } from "react-router";
import { PWARoutingProvider } from "@pwabucket/pwa-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PWARoutingProvider>
        <App />
      </PWARoutingProvider>
    </BrowserRouter>
  </StrictMode>,
);

// App.tsx
import { usePWARouting } from "@pwabucket/pwa-router";
import { Routes, Route } from "react-router";

function App() {
  const { resolvedLocation } = usePWARouting();
  
  return (
    <Routes location={resolvedLocation}>
        {/* your routes */}
    </Routes>
  );
}
```

## Hooks

### `usePWARouting`

Access the `PWARoutingContext` value, which exposes the resolved location.

```tsx
import { usePWARouting } from "@pwabucket/pwa-router";

const { resolvedLocation } = usePWARouting();
```

**Returns:** `PWARoutingContextValue` — `{ resolvedLocation: Location }`

---

### `useLocationState`

Manage state tied to the current location entry. When the value is cleared (`undefined`), it navigates back automatically.

```tsx
import { useLocationState } from "@pwabucket/pwa-router";

const [value, setValue] = useLocationState("myKey", "default");

// Set a new value (pushes to history)
setValue("new value");

// Clear value (navigates back)
setValue(undefined);

// Clear value and navigate back to a specific history index
setValue(undefined, {}, historyIndex);
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | State key in `location.state` |
| `defaultValue` | `T` | Fallback when the key is not present |
| `options` | `UseLocationStateOptions?` | `{ persist?: boolean; indexKey?: string; inherit?: boolean }`, see [Non-persistent state](#non-persistent-state) and [Non-inherited state](#non-inherited-state) |

**Returns:** `[T, (value?: T, options?: NavigateOptions, index?: number) => void]`

- When `value` is provided, navigates to the current location with the new state value.
- When `value` is `undefined` and `index` is provided, calculates a history delta and navigates back to that entry.
- When `value` is `undefined` and no `index`, navigates back one entry (or to `"/"` if there is no prior history).

#### Non-persistent state

By default, values survive a page reload because they live in `history.state`. Pass `{ persist: false }` to make a value ephemeral:

```tsx
const [value, setValue] = useLocationState("myKey", "default", { persist: false });
```

After a reload (or a Back into an entry from before it), `PWARoutingProvider` hides these values and navigates back behind the scenes:

- If it has an `indexKey` (e.g. `useLocationToggle` with an `indexKey`), it returns to the entry before the dialog, the same way closing the toggle does.
- Otherwise it goes back one entry at a time until it reaches a clean one.

#### Non-inherited state

Every push copies the current state, so a value is carried into entries pushed by other keys (e.g. a dialog opened on top). Pass `{ inherit: false }` to keep a value on the entry that set it:

```tsx
const [isOpen, setIsOpen] = useLocationToggle("keyboard", undefined, {
  inherit: false,
});
```

Entries pushed by other keys leave it out, so closing it always goes back from its own entry and never pops what was opened on top.

A push by another key while such a value is set replaces its entry instead of stacking on it, so closing what was opened returns to the entry before. Closing a non-inherited value is ignored when the entry it was read from is no longer the current one, so a close racing a navigation can't go back from the new entry.

---

### `useLocationToggle`

A convenience wrapper around `useLocationState` for boolean toggle patterns (e.g. modals, drawers, sheets). Internally uses `useLocationIndex` to navigate back to the correct history entry when closing.

```tsx
import { useLocationToggle } from "@pwabucket/pwa-router";

const [isOpen, toggle] = useLocationToggle("modal");

// Open
toggle(true);

// Close (navigates back)
toggle(false);

// Closed automatically after a page reload
const [isSheetOpen, toggleSheet] = useLocationToggle("sheet", undefined, {
  persist: false,
});
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | State key in `location.state` |
| `indexKey` | `string?` | Optional key for index tracking (see `useLocationIndex`) |
| `options` | `UseLocationStateOptions?` | `{ persist?: boolean; inherit?: boolean }`, set `persist: false` to close on reload (see [Non-persistent state](#non-persistent-state)), `inherit: false` to keep it off entries pushed on top (see [Non-inherited state](#non-inherited-state)) |

**Returns:** `[boolean, (status: boolean, options?: NavigateOptions) => void]`

---

### `useLocationIndex`

Reads the saved history index for a given key from `location.state`. The index is stored under the key `__router_index_<key>`. Used internally by `useLocationToggle` to navigate back to the correct entry.

```tsx
import { useLocationIndex } from "@pwabucket/pwa-router";

const index = useLocationIndex("modal");
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string?` | The index tracking key |

**Returns:** `number | undefined`

---

### `useLocationIndexUpdater`

Stamps the current `history.length` onto `location.state` (under `__router_index_<key>`) when the component first mounts. Call it inside the toggled UI (e.g. a dialog). `useLocationToggle` can then return to the entry before the dialog when it closes, even after an iframe or nested navigation has added history entries.

```tsx
import { useLocationIndexUpdater, useLocationToggle } from "@pwabucket/pwa-router";

function Dialog() {
  useLocationIndexUpdater("dialog");
  // ...
}

const [isOpen, toggle] = useLocationToggle("dialog", "dialog");
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | The index tracking key |

---

### `useNavigateBack`

Returns a callback that navigates back in history. If there is no prior history entry (i.e. the user landed directly on the page), it navigates to a root path instead.

```tsx
import { useNavigateBack } from "@pwabucket/pwa-router";

function Header() {
  const navigateBack = useNavigateBack();

  return <button onClick={() => navigateBack()}>Back</button>;
}
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `root` | `string?` | Fallback path when there is no history to go back to (default: `"/"`) |

**Returns:** `(options?: NavigateOptions) => void`

## Types

The following types are exported for convenience:

- **`PWARoutingContextValue`** — `{ resolvedLocation: Location }`
- **`UseLocationStateReturn<T>`** — `[T, (value?: T, options?: NavigateOptions, index?: number) => void]`
- **`UseLocationToggleReturn`** — `[boolean, (status: boolean, options?: NavigateOptions) => void]`

## License

[MIT](LICENSE)