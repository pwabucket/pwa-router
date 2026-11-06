/* Set by the app's bundler; read at runtime so the library build keeps it */
declare const process: { env: { NODE_ENV?: string } };

/** Serialized size above which a value is too large for history state */
const MAX_STATE_VALUE_LENGTH = 4096;

/** Keys already warned about */
const warnedKeys = new Set<string>();

/** Warns once per key, in development, when a value is too large for history state */
export const warnLargeStateValue = (key: string, value: unknown) => {
  if (process.env.NODE_ENV === "production" || warnedKeys.has(key)) return;

  /* Measure the serialized value; unserializable values are left to the browser */
  let length = 0;
  try {
    length = JSON.stringify(value)?.length ?? 0;
  } catch {
    return;
  }
  if (length <= MAX_STATE_VALUE_LENGTH) return;

  warnedKeys.add(key);
  console.warn(
    `[pwa-router] The value of "${key}" is ${length} characters long. ` +
      "History state is kept by the browser and survives reloads: " +
      "store small references such as ids, never large data or secrets.",
  );
};
