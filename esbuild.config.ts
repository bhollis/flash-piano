import { BuildOptions, build, context } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const config: BuildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  external: ['preact', 'preact/hooks'],
  outdir: 'lib',
  jsx: 'automatic',
  format: 'esm',
  minify: true,
  sourcemap: true,
  loader: { '.css': 'text' },
  alias: {
    react: 'preact/compat',
    'react-dom/test-utils': 'preact/test-utils',
    'react-dom': 'preact/compat', // Must be below test-utils
    'react/jsx-runtime': 'preact/jsx-runtime',
  },
};

await mkdir('lib/', { recursive: true });
await copyFile('src/index.html', 'lib/index.html');

const devMode = process.argv.includes('--dev');

if (devMode) {
  let ctx = await context(config);

  let { host, port } = await ctx.serve({
    servedir: 'lib',
  });
  console.log({ host, port });
} else {
  let result = await build(config);

  let resultUmd = await build({ ...config, external: [], outdir: 'umd' });

  console.log(process.argv, result, resultUmd);
}
