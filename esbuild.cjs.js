import { build } from 'esbuild';
import { CLIENT_PKGS } from '@thencc/any-wallet';

build({
	entryPoints: ['src/index.ts'],
	outdir: 'dist',
	bundle: true,
	sourcemap: true,
	minify: true,
	treeShaking: true,
	//target: ['node14'], // change for browser/node?
	// assetNames: 'assets/[name]',
	// loader: { '.mp3': 'file' },
	// target: [
	// 	'es2020',
	// 	'chrome58',
	// 	'firefox57',
	// 	'safari11',
	// 	'edge16',
	// 	'node12',
	// ],
	// tsconfig: 'custom-tsconfig.json', // tsc path
	// watch: false, // continuous builds (fast)
	// define: { DEBUG: 'true' }, // DEFINE replaces global identifiers with constant expressions
	// drop: ['console'], // things to remove during build
	// inject: ['./file-with-export.js'] // https://esbuild.github.io/api/#inject
	// conditions: [] // route import behavior via package.json https://esbuild.github.io/api/#how-conditions-work

	// NODE build
	platform: 'node',
	format: 'cjs', // commonJs is for node
	outExtension: { '.js': '.cjs' },

	// for w3h
	external: [
		...CLIENT_PKGS
	],
})
	.catch(() => process.exit(1));