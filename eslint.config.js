import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Prettier config (disables conflicting rules)
  prettierConfig,

  // Custom rules for TypeScript files
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Allow both Array<T> and T[] syntax
      "@typescript-eslint/array-type": "off",
      // Allow type inference
      "@typescript-eslint/no-inferrable-types": "off",
      // Allow generic constructors with type on either side
      "@typescript-eslint/consistent-generic-constructors": "off",

      // General rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
    },
  },

  // Relaxed rules for config files and scripts
  {
    files: ["*.js", "*.mjs", "scripts/**/*.ts", "tests/**/*.ts", "vitest.config.ts"],
    rules: {
      "no-console": "off",
    },
  }
);
