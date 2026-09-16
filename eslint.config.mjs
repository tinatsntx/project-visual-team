// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Flat lint config for the monorepo. Scoped to source, tests, scripts, and
 * evals; generated artifacts (dist/, plugin-ui bundles, node_modules) are
 * ignored. Recommended sets only — no style pedantry.
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "apps/plugin-ui/dist/**",
      "docs/m3-shots/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // The codebase uses `any` deliberately at MCP/JSON boundaries where a
      // schema narrows immediately after; keep it visible but non-blocking.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // `as` casts through Zod narrowing are the established pattern.
      "@typescript-eslint/no-unnecessary-type-constraint": "off",
    },
  },
  {
    // Plain-JS scripts and hooks run under Node without TS checking.
    files: ["**/*.mjs", "**/*.cjs", "plugin/hooks/*.mjs", "scripts/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", Buffer: "readonly", URL: "readonly", setTimeout: "readonly", clearTimeout: "readonly" },
    },
  },
);
