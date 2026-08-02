export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        AbortController: "readonly",
        document: "readonly",
        decodeURIComponent: "readonly",
        encodeURIComponent: "readonly",
        Event: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Response: "readonly",
        URLSearchParams: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error",
    },
  },
];
