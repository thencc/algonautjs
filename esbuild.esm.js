// import { build } from 'esbuild'; // for type:"module" pkgs
const { build } = require('esbuild');

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
	assetNames: 'assets/[name]',
	loader: { '.mp3': 'file' },

	// BROWSER build
	platform: 'browser',
	format: 'esm', // esm works in node+browser, but cjs is better for node
	splitting: true, // only for esm
	outExtension: { '.js': '.mjs' }, // .js -> .mjs (change package.json main + modules entry IF doing this)
})
	.catch(() => process.exit(1));