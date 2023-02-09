// import { build } from 'esbuild'; // for type:"module" pkgs
const { build } = require('esbuild');

const plugin = require('node-stdlib-browser/helpers/esbuild/plugin');
const stdLibBrowser = require('node-stdlib-browser');

// const { w3hOptionalDeps } = await (import('@thencc/web3-wallet-handler'));

// const w3hPkg = require('@thencc/web3-wallet-handler/package.json');
// const w3hOptionalDeps = w3hPkg.optionalDependencies;
// console.log('w3hOptionalDeps', w3hOptionalDeps);
// const w3hOptionalDepsKeys = Object.keys(w3hOptionalDeps);
// console.log('w3hOptionalDepsKeys', w3hOptionalDepsKeys);

// import * as xx from '@thencc/web3-wallet-handler/buildSettings';
// const xx = require('@thencc/web3-wallet-handler/buildSettings');
// console.log('xx', xx);
// clientPkgs

const {clientPkgs, disableClients } = require('@thencc/web3-wallet-handler/buildSettings');
// const { clientPkgs, disableClients } = require('@thencc/web3-wallet-handler');
console.log('clientPkgs', clientPkgs);

// TODO should default to disabling all
let k = disableClients([
	'myalgo',
	'pera',
	'inkey'
]);
console.log(k);

// const { w3hOptionalDeps } = require('@thencc/web3-wallet-handler');
// const { w3hOptionalDeps } = require('@thencc/web3-wallet-handler/dist/index.esm.js');

// const w3h = require('@thencc/web3-wallet-handler/dist/index.esm.mjs');
// console.log('w3h', w3h);

// ts-disable
// import { w3hOptionalDeps } from '@thencc/web3-wallet-handler';


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

	// for w3h
	external: [
		// ...w3hOptionalDeps
		// ...w3hOptionalDepsKeys,

		...k
		// '@perawallet/connect',
		// '@randlabs/myalgo-connect',
		// '@thencc/inkey-client-js',
	],

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