// Externalise native modules and Prisma so webpack does not try to bundle them.
// @prisma/client and .prisma/client contain a platform-specific query-engine binary
// that cannot be bundled; they are copied verbatim into the Docker runner stage.
module.exports = (options) => {
  const base = Array.isArray(options.externals)
    ? options.externals
    : options.externals
      ? [options.externals]
      : [];
  return {
    ...options,
    externals: [
      ...base,
      { '@prisma/client': 'commonjs @prisma/client', bcrypt: 'commonjs bcrypt' },
    ],
  };
};
