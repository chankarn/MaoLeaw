import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler-oriented rules from eslint-plugin-react-hooks v6+. This app doesn't
      // use the compiler, and the flagged spots are intentional (seed form state from
      // fetched data, compare dates with Date.now() during render).
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
  { ignores: ['.next/**', 'next-env.d.ts'] },
];

export default config;
