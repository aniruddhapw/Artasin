import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    rules: {
      // Images go through components/LazyImage.tsx and lib/images.ts, which add
      // Cloudinary resizing and a loading placeholder. README ("Known Follow-ups")
      // explains why next/image isn't used; without this the rule flags every
      // <img> as a warning that will never be acted on.
      "@next/next/no-img-element": "off"
    }
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // TypeScript itself reports undefined names and unused variables, and the
      // core rules misread type-only code, so the TypeScript versions take over.
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }]
    }
  },
  globalIgnores([".next/**", "node_modules/**", "public/**", "next-env.d.ts"])
]);
