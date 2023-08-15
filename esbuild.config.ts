import { BuildOptions, build, context } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const config: BuildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  outdir: 'umd',
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
await mkdir('umd/', { recursive: true });
await copyFile('src/index.html', 'umd/index.html');

const devMode = process.argv.includes('--dev');

if (devMode) {
  let ctx = await context(config);

  let { host, port } = await ctx.serve({
    servedir: 'umd',
  });
  console.log({ host, port });
} else {
  // UMD build
  let result = await build(config);

  // Importable NPM build (ESM)
  let resultUmd = await build({ ...config, external: ['preact', 'preact/hooks'], outdir: 'lib' });

  console.log(process.argv, result, resultUmd);
}
