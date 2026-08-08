// Resolves vendored binary assets (src/mask.png) across every execution mode:
// - `node src/index.ts` (ESM source; `import.meta.dirname` points at src/)
// - the tsdown CJS bundle in `dist/` (asset copied next to the bundle at build time)
// - the @yao-pkg/pkg binary snapshot (assets are mounted under `src/`, the bundle
//   lives in `dist/`, so the bundle-relative candidate is `../src/<name>`)
import fs from "node:fs";
import path from "node:path";

const CJS_DIRNAME = typeof __dirname === "string" ? __dirname : undefined;

/**
 * Best-effort dirname of this module under ESM type stripping. Rolldown
 * replaces `import.meta` with `{}` in the CJS bundle, so this returns
 * undefined there and the `__dirname` candidates take over.
 */
function getEsmDirname(): string | undefined {
  try {
    if (typeof import.meta.dirname === "string") {
      return import.meta.dirname;
    }
  } catch {
    // not available in this runtime
  }
  return undefined;
}

/**
 * Returns an absolute path to the named vendored asset, or throws if it cannot
 * be located in any of the supported execution layouts.
 */
export function resolveAsset(name: string): string {
  const esmDirname = getEsmDirname();
  const candidates: string[] = [];
  if (esmDirname) {
    candidates.push(path.join(esmDirname, name));
  }
  if (CJS_DIRNAME) {
    candidates.push(path.join(CJS_DIRNAME, name));
    candidates.push(path.join(CJS_DIRNAME, "..", "src", name));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Cannot locate bundled asset: ${name} (tried ${candidates.join(", ")})`);
}

/**
 * Returns an absolute path to the repository's package.json in every
 * execution layout (ESM source, CJS bundle, pkg snapshot).
 */
export function resolvePackageJson(): string {
  const esmDirname = getEsmDirname();
  const candidates: string[] = [];
  if (esmDirname) {
    candidates.push(path.join(esmDirname, "..", "package.json"));
  }
  if (CJS_DIRNAME) {
    candidates.push(path.join(CJS_DIRNAME, "..", "package.json"));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Cannot locate package.json (tried ${candidates.join(", ")})`);
}
