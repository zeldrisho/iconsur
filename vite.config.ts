import { defineConfig } from "vite-plus";

export default defineConfig({
  // Vendored Emscripten artifact: excluded from lint (tsc already skips it via
  // @ts-nocheck) — regenerating it from OpenJPEG is the only sanctioned edit.
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
  // Staged-file checks for the pre-commit hook (see .vite-hooks/pre-commit).
  staged: {
    "*.ts": "vp check --fix",
    "*.{json,md,toml,yml}": "vp fmt",
  },
  // Vitest configuration for `vp test`.
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
