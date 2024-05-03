import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';
import sveltePreprocess from 'svelte-preprocess'

const production = !process.env.ROLLUP_WATCH;

const plugins = ({cssOutput}) => ([
	svelte({
		compilerOptions: {
			// enable run-time checks when not in production
			dev: !production,
		},
		preprocess: sveltePreprocess()
	}),

	css({ output: cssOutput}),

	// If you have external dependencies installed from
	// npm, you'll most likely need these plugins. In
	// some cases you'll need additional configuration -
	// consult the documentation for details:
	// https://github.com/rollup/plugins/tree/master/packages/commonjs
	resolve({
		browser: true,
		dedupe: ['svelte']
	}),
	commonjs(),

	// If we're building for production (npm run build
	// instead of npm run dev), minify
	production && terser()
])


export default [
	{
		input: 'scripts/front-end/saisie-especes.js',
		output: {
			sourcemap: true,
			format: 'es',
			file: 'build/bundle-saisie-especes.js'
		},
		plugins: plugins({cssOutput: 'bundle-saisie-especes.css'}),
		watch: {
			clearScreen: false
		}
	},
	{
		input: 'scripts/front-end/suivi.js',
		output: {
			sourcemap: true,
			format: 'es',
			file: 'build/bundle-suivi.js'
		},
		plugins: plugins({cssOutput: 'bundle-suivi.css'}),
		watch: {
			clearScreen: false
		}
	}
]
