// Prints every name the package exports, one per line, sorted
import { readFileSync } from "fs";
import path from "path";

/** The built type files of each entry point */
const ENTRIES = { ".": "dist/index.d.ts", "./testing": "dist/testing.d.ts" };

/** Names exported by one type file */
const readExports = (file) => {
  const filePath = path.resolve(import.meta.dirname, "..", file);
  const source = readFileSync(filePath, "utf8");
  const names = new Set();

  /* export { a, b as c } lists */
  for (const [, list] of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const item of list.split(",")) {
      const name = item.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, "");
      if (name) names.add(name);
    }
  }

  /* export declare const|function|interface|type|class name */
  for (const [, name] of source.matchAll(
    /export\s+declare\s+(?:const|function|interface|type|class)\s+(\w+)/g,
  )) {
    names.add(name);
  }

  return [...names].sort();
};

/* One line per export, prefixed by its entry point */
for (const [entry, file] of Object.entries(ENTRIES)) {
  for (const name of readExports(file)) console.log(`${entry} ${name}`);
}
