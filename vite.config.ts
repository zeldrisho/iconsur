import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    // Type-check with the project tsconfig (includes tsc --noEmit diagnostics).
    options: {
      typeAware: true,
      typeCheck: true,
    },
    // Vendored Emscripten artifact: excluded from lint (tsc already skips it
    // via @ts-nocheck) — regenerating it from OpenJPEG is the only sanctioned edit.
    ignorePatterns: ["src/openjpeg.ts"],
  },
  // Keep the manually curated changelog stable; release formatting is reviewed by hand.
  fmt: {
    ignorePatterns: ["CHANGELOG.md"],
  },
  // Staged-file checks for the pre-commit hook (see .vite-hooks/pre-commit).
  // Note: no `*.md` rule — changelog entries are written and reviewed manually.
  staged: {
    "*.ts": "vp check --fix",
    "*.{json,toml,yml}": "vp fmt",
  },
  // Vitest configuration for `vp test` (vite-plus bundles the runner; the
  // `vitest` package itself is not a project dependency).
  test: {
    include: ["tests/**/*.test.ts"],
  },
  // Single-CJS bundle feeding the pkg binary.
  pack: {
    entry: "src/index.ts",
    format: ["cjs"],
    outDir: "dist",
    clean: true,
    // CLI — no type declarations needed (avoids TS2883 on the jimp class type).
    dts: false,
    // Bundle every dependency into the single CJS file used by pkg. Node
    // built-ins stay external.
    deps: {
      alwaysBundle: [/.*/],
    },
  },
});
