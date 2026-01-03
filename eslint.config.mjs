import nextConfig from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      "src/generated/**",
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
  ...nextConfig,
];

export default eslintConfig;
