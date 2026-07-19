//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack is the default in Next.js 16.
  // TypeScript path aliases (@/* → src/*) are defined in tsconfig.json
  // and are automatically resolved by Turbopack — no additional config needed.
  turbopack: {},
};

module.exports = nextConfig;
