module.exports = {
  extends: ["next", "next/core-web-vitals"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "**/index",
              "**/index.js",
              "**/index.ts",
              "**/index.jsx",
              "**/index.tsx",
              "*/index",
              "./index",
              "../index",
            ],
            message:
              "Explicit index file imports are not allowed. Import directly from the source file instead.",
          },
        ],
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "ExportAllDeclaration",
        message:
          "Re-exporting everything from another module (export * from '...') creates barrel files and is not allowed.",
      },
      {
        selector: "ExportNamedDeclaration[source]",
        message:
          "Re-exporting from another module (export { ... } from '...') creates barrel files and is not allowed.",
      },
    ],
  },
};
