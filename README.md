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

## Hooks

### `useLocationState`

Manage state tied to the current location entry. When the value is cleared (`undefined`), it navigates back automatically.

```tsx
import { useLocationState } from "@pwabucket/pwa-router";

const [value, setValue] = useLocationState("myKey", "default");

// Set a new value (pushes to history)
setValue("new value");

// Clear value (navigates back)
setValue(undefined);
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | State key in `location.state` |
| `defaultValue` | `T` | Fallback when the key is not present |
| `indexKey` | `string?` | Optional key for index tracking (see `useLocationIndex`) |

**Returns:** `[T, (value?: T, options?: NavigateOptions) => void]`

---

### `useLocationToggle`

A convenience wrapper around `useLocationState` for boolean toggle patterns (e.g. modals, drawers, sheets).

```tsx
import { useLocationToggle } from "@pwabucket/pwa-router";

const [isOpen, toggle] = useLocationToggle("modal");

// Open
toggle(true);

// Close (navigates back)
toggle(false);
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string` | State key in `location.state` |
| `indexKey` | `string?` | Optional key for index tracking |

**Returns:** `[boolean, (status: boolean, options?: NavigateOptions) => void]`

---

### `useLocationIndex`

Reads the saved history index for a given key from `location.state`. Used internally by `useLocationState` to navigate back to the correct entry.

```tsx
import { useLocationIndex } from "@pwabucket/pwa-router";

const index = useLocationIndex("myKey");
```

**Parameters:**

| Param | Type | Description |
| --- | --- | --- |
| `key` | `string?` | The index tracking key |

**Returns:** `number | undefined`

---

### `useLocationIndexUpdater`

Stamps the current `history.length` onto `location.state` so that `useLocationState` can navigate back to the correct entry when clearing a value. Call this in a layout or page component that serves as a "base" for toggled UI.

```tsx
import { useLocationIndexUpdater } from "@pwabucket/pwa-router";

function Layout() {
  useLocationIndexUpdater("modal");
  // ...
}
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

The following types are also exported for convenience:

- **`UseLocationStateReturn<T>`** — `[T, (value?: T, options?: NavigateOptions) => void]`
- **`UseLocationToggleReturn`** — `[boolean, (status: boolean, options?: NavigateOptions) => void]`

## License

[MIT](LICENSE)