module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "next/core-web-vitals",
    "plugin:json/recommended",
    "plugin:prettier/recommended",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
    "react/prop-types": "off",
    "import/no-extraneous-dependencies": "off",
    "react/jsx-wrap-multilines": 2,
    "react/jsx-no-useless-fragment": 2,
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-duplicate-enum-values": "off",
    "react/jsx-curly-brace-presence": [
      "error",
      { props: "never", children: "never", propElementValues: "always" },
    ],
    "prettier/prettier": [
      "error",
      {
        printWidth: 80,
      },
    ],
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "coverage/",
    "__snapshots__/",
    "storybook-static/",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
};