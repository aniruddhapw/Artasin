import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  js.configs.recommended,
  ...nextVitals,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    rules: {
      // Images go through components/LazyImage.jsx and lib/images.js, which add
      // Cloudinary resizing and a loading placeholder. README ("Known Follow-ups")
      // explains why next/image isn't used; without this the rule flags every
      // <img> as a warning that will never be acted on.
      "@next/next/no-img-element": "off"
    }
  },
  globalIgnores([".next/**", "node_modules/**", "public/**", "next-env.d.ts"])
]);
