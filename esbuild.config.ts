import { BuildOptions, build, context } from 'esbuild';
import { copyFile } from 'node:fs/promises';

const config: BuildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  outdir: 'lib',
  jsx: 'automatic',
  minify: true,
  sourcemap: true,
  alias: {
    react: 'preact/compat',
    'react-dom/test-utils': 'preact/test-utils',
    'react-dom': 'preact/compat', // Must be below test-utils
    'react/jsx-runtime': 'preact/jsx-runtime',
  },
};

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
  console.log(process.argv, result);
}
