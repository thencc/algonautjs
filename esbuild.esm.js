// import { build } from 'esbuild'; // for type:"module" pkgs
const { build } = require('esbuild');

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
})
	.catch(() => process.exit(1));