import { build } from 'esbuild';
import { CLIENT_PKGS } from '@thencc/any-wallet';

// shims
import { default as plugin } from 'node-stdlib-browser/helpers/esbuild/plugin';
import { default as stdLibBrowser } from 'node-stdlib-browser';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// build tips (iife, esm, cjs)
// https://medium.com/geekculture/build-a-library-with-esbuild-23235712f3c

// about package json 'exports' block
// https://medium.com/swlh/npm-new-package-json-exports-field-1a7d1f489ccf

build({
	entryPoints: ['src/index.ts'],
	outdir: 'dist',
	bundle: true,
	sourcemap: true,
	minify: true,
	treeShaking: true,
	target: ['esnext'],
	//external: ['src/lowtone.ts', 'src/finished.ts'],
	// assetNames: 'assets/[name]',
	// loader: { '.mp3': 'file' },

	// BROWSER build
	platform: 'browser',
	format: 'esm', // esm works in node+browser, but cjs is better for node
	splitting: true, // only for esm
	// outExtension: { '.js': '.esm.js' }, // .js -> .mjs (change package.json main + modules entry IF doing this)
	outExtension: { '.js': '.mjs' }, // .js -> .mjs (change package.json main + modules entry IF doing this)

	// for w3h
	external: [
		...CLIENT_PKGS,
	],

	// TODO remove these since algosdk@2.1.0 solves for this! right?
	// shims for node things in browser js
	inject: [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
	define: {
		global: 'global',
		process: 'process',
		Buffer: 'Buffer'
	},
	plugins: [plugin(stdLibBrowser)]
})
	.catch(() => process.exit(1));