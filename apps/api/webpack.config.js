// Externalise native modules and Prisma so webpack does not try to bundle them.
// @prisma/client and .prisma/client contain a platform-specific query-engine binary
// that cannot be bundled; they are copied verbatim into the Docker runner stage.
// Drop nodeExternals (NestJS default) so webpack bundles all JS deps into dist/main.js.
// Only native-binary modules stay external — they are resolved from node_modules at runtime.
module.exports = (options) => ({
  ...options,
  externals: [
    { '@prisma/client': 'commonjs @prisma/client', bcrypt: 'commonjs bcrypt' },
  ],
});
