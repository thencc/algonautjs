
import { defineConfig } from 'tsup';
import { CLIENT_PKGS } from '@thencc/any-wallet';


// helpful plugin logic from: https://github.com/evanw/esbuild/issues/1685
import { readFileSync } from 'fs';
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

export default defineConfig({
	entry: ['./src/index.ts'],
	outDir: './dist',
	clean: true, // cleans outDir before build

	dts: true, // requires typescript peer dep
	sourcemap: true,

	format: ['esm', 'cjs'],
	tsconfig: './tsconfig.json',
	// legacyOutput: true,
	outExtension({ format }) {
		// console.log('format', format);
		// return {
		// 	js: `.${format}.js`,
		// }

		if (format == 'cjs') {
			return {
				js: `.cjs`
			}
		} else if (format == 'esm') {
			return {
				js: `.mjs`
			}
		} else {
			return {
				js: `.${format}.js`,
			}
		}
	},
	// iife / global build
	// if doing this, add tp pkg.json
	// 		"browser": "dist/index.global.js",
	// add "iife" to format field like: ['esm', 'cjs', 'iife']
	// globalName: 'w3w3w', // for iife, but really who will use this...


	// DONT bundle wallet-specific libs
	external: [
		...CLIENT_PKGS,
	],

	// aka DO BUNDLE these:
	noExternal: [
		'algosdk',
		'buffer',
		'@thencc/any-wallet'
	],


	esbuildPlugins: [
		// needed to keep .map file down in size!
		excludeVendorFromSourceMapPlugin({ filter: /node_modules/ })
	],

	// entire esbuild config avail
	// esbuildOptions(options, context) {
	// 	// options.define.foo = 'bar';
	// 	options.alias = {
	// 	};
	// },


	platform: 'browser', // makes sure "crypto" isnt needed 
	// platform: 'neutral', // TODO should we do neutral? try but make sure all env tests pass + build size isnt crazy big...
	bundle: true, // TODO we shouldnt bundle our lib. assume frontends/final users will do that. (for dux w/out bundlers use jsdelvr )
	shims: true,

	// optimized config:
	keepNames: false,
	splitting: false,
	minify: true,
	treeshake: true,

	// dev/debug config:
	// keepNames: true,
	// splitting: true,
	// minify: false,
	// treeshake: false,
});