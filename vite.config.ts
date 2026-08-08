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
  // Generated artifacts are excluded from formatting: CHANGELOG.md is produced
  // by git-cliff and must ship byte-identical to what the release workflow writes.
  fmt: {
    ignorePatterns: ["CHANGELOG.md"],
  },
  // Staged-file checks for the pre-commit hook (see .vite-hooks/pre-commit).
  // CHANGELOG.md is excluded via fmt.ignorePatterns above, so `vp fmt` leaves
  // the git-cliff-generated file untouched.
  staged: {
    "*.ts": "vp check --fix",
    "*.{json,toml,yml}": "vp fmt",
    "*.md": "vp fmt",
  },
  // Vitest configuration for `vp test` (vite-plus bundles the runner; the
  // `vitest` package itself is not a project dependency).
  test: {
    include: ["tests/**/*.test.ts"],
  },
  // tsdown entry feeding `vp pack` (single-CJS bundle for the pkg binary).
  pack: {
    entry: "src/index.ts",
    format: ["cjs"],
    outDir: "dist",
    clean: true,
    // CLI — no type declarations needed (avoids TS2883 on the jimp class type).
    dts: false,
    // Bundle every dependency into the single CJS file: the @yao-pkg/pkg binary
    // cannot load external ESM (plist@5 is ESM-only), and pkg's snapshot cannot
    // run `require()`d ESM. Node built-ins stay external (platform: node).
    deps: {
      alwaysBundle: [/.*/],
    },
  },
});
