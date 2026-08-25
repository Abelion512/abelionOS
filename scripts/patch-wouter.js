/**
 * postinstall: patch wouter Switch component to collect route paths
 * into window.__WOUTER_ROUTES__ for the Manus debug collector.
 *
 * Idempotent — skips if the marker string is already present.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const WOUTER_SRC = resolve(
  import.meta.dirname,
  "..",
  "node_modules",
  "wouter",
  "src",
  "index.js",
);

const MARKER = "__WOUTER_ROUTES__";

const PATCH_BLOCK = `
  // Collect all route paths to window object (patched for debug collector)
  if (typeof window !== 'undefined') {
    if (!window.__WOUTER_ROUTES__) {
      window.__WOUTER_ROUTES__ = [];
    }
    const allChildren = flattenChildren(children);
    allChildren.forEach((element) => {
      if (isValidElement(element) && element.props.path) {
        const path = element.props.path;
        if (!window.__WOUTER_ROUTES__.includes(path)) {
          window.__WOUTER_ROUTES__.push(path);
        }
      }
    });
  }
`;

// Anchor: the line right before the existing `for` loop in Switch
const ANCHOR = "const [originalLocation] = useLocationFromRouter(router);";

if (!existsSync(WOUTER_SRC)) {
  // wouter not installed yet — nothing to patch
  process.exit(0);
}

const source = readFileSync(WOUTER_SRC, "utf-8");

if (source.includes(MARKER)) {
  // already patched
  process.exit(0);
}

if (!source.includes(ANCHOR)) {
  console.warn(
    "[patch-wouter] anchor line not found in wouter source — skipping patch",
  );
  process.exit(0);
}

const patched = source.replace(
  ANCHOR,
  ANCHOR + "\n" + PATCH_BLOCK,
);

writeFileSync(WOUTER_SRC, patched, "utf-8");
console.log("[patch-wouter] wouter Switch patched for route collection");
