import { build } from 'esbuild';

await build({
  entryPoints: ['src/Piano.jsx'],
  bundle: true,
  outfile: 'lib/index.js',
  jsx: 'automatic',
  minify: true,
  sourcemap: true,
  alias: {
    react: 'preact/compat',
    'react-dom/test-utils': 'preact/test-utils',
    'react-dom': 'preact/compat', // Must be below test-utils
    'react/jsx-runtime': 'preact/jsx-runtime',
  },
});
