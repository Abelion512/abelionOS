// ponytail: patch minimal type defs wouter untuk kompatibilitas React 19.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const candidates = [
  join(process.cwd(), "node_modules", "wouter", "types", "index.d.ts"),
];let patched = false;
for (const typesPath of candidates) {
  if (!existsSync(typesPath)) continue;
  let content = readFileSync(typesPath, "utf8");
  if (content.includes("ReactElement")) {
    // Hapus ReactElement dari daftar import react, sisakan koma yang valid.
    content = content.replace(
      /(import\s*{[^}]*?),\s*\bReactElement\b\s*,?([^}]*}\s*from\s*"react")/,
      (m, before, after) => `${before}${after}`
    );
    content = content.replace(/\bReactElement\b/g, "React.JSX.Element");
    writeFileSync(typesPath, content);
    patched = true;
  }
}
if (!patched) {
  console.warn("patch-wouter: type defs wouter tidak ditemukan (mungkin sudah dipatch)");
}
