// import { build } from 'esbuild'; // for type:"module" pkgs
const { build } = require('esbuild');

// for wallet-connect shim
const plugin = require('node-stdlib-browser/helpers/esbuild/plugin');
const stdLibBrowser = require('node-stdlib-browser');

build({
	entryPoints: ['src/index.ts'],
	outdir: 'dist',
	bundle: true,
	sourcemap: true,
	minify: false,
	treeShaking: false,
	target: ['esnext'],

	// BROWSER build
	platform: 'browser',
	format: 'esm', // esm works in node+browser, but cjs is better for node
	splitting: true, // only for esm
	outExtension: { '.js': '.mjs' }, // .js -> .mjs (change package.json main + modules entry IF doing this)

	// wallet-connect requires us to shim global -> window and globally avail instance of Buffer
	inject: [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
	define: {
		global: 'global',
		process: 'process',
		Buffer: 'Buffer'
	},
	plugins: [plugin(stdLibBrowser)]
})
	.catch(() => process.exit(1));