import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".scratch/**",
      "public/**",
      "src/api/schema.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  { files: ["**/*.js", "**/*.mjs"], ...tseslint.configs.disableTypeChecked },
  // providers, hooks and shared pieces export more than components on purpose
  {
    files: [
      "src/app/**",
      "src/auth/**",
      "src/i18n/**",
      "src/features/shared.tsx",
      "src/components/ui/**",
      "src/features/accounts/accounts-page.tsx",
    ],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["vite.config.ts", "playwright.config.ts", "scripts/**", "tests/**"],
    languageOptions: { globals: globals.node },
  },
);
