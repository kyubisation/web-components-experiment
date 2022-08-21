import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin'

esbuild.serve({
  servedir: 'www'
}, {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'www/main.js',
  plugins: [sassPlugin({
    type: "css-text",
  })]
}).catch(() => process.exit(1))