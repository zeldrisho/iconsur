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
    ignorePatterns: [
      "src/openjpeg.ts",
      ".agent/**",
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".continue/**",
      ".cursor/**",
      ".gemini/**",
      ".opencode/**",
      ".pi/**",
      ".roo/**",
      ".windsurf/**",
      "tools/oxlint/anti-slop/**",
    ],
    jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }],
    rules: {
      "oxc/no-accumulating-spread": "error",
      "anti-slop/no-array-filter-map": "error",
      "anti-slop/no-reduce-accumulator-copy": "error",
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      // Compatibility guards and boundary casts are intentional here.
      "anti-slop/no-runtime-typeof": "off",
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-unsafe-dictionary-type": "off",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-readable-spacing": "error",
      "anti-slop/require-safety-comment-for-type-assertion": "off",
    },
  },
  // Keep the manually curated changelog stable; release formatting is reviewed by hand.
  fmt: {
    ignorePatterns: [
      "CHANGELOG.md",
      ".agent/**",
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".continue/**",
      ".cursor/**",
      ".gemini/**",
      ".opencode/**",
      ".pi/**",
      ".roo/**",
      ".windsurf/**",
      "tools/oxlint/anti-slop/**",
    ],
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
