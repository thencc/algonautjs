import { build } from 'esbuild';
import { CLIENT_PKGS } from '@thencc/any-wallet';

import { readFileSync } from 'fs';

// helpful plugin logic from: https://github.com/evanw/esbuild/issues/1685
const excludeVendorFromSourceMapPlugin = ({ filter }) => ({
	name: 'excludeVendorFromSourceMap',
	setup(build) {
	  build.onLoad({ filter }, (args) => {
		if (args.path.endsWith('.js')) {
		  return {
			contents:
			  readFileSync(args.path, 'utf8') +
			  '\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==',
			loader: 'default',
		  };
		}
	  });
	},
});

build({
	entryPoints: ['src/index.ts'],
	outdir: 'dist',
	bundle: true,
	tsconfig: "./tsconfig.json",
	plugins: [
		// excludeVendorFromSourceMapPlugin({filter: /.*/})
		excludeVendorFromSourceMapPlugin({filter: /.node_modules/})
	],
	sourcemap: true,
	// sourcemap: 'linked',
	minify: true,
	// minify: false,
	treeShaking: true,
	treeShaking: false,
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
		...CLIENT_PKGS,
	],
})
	.catch(() => process.exit(1));