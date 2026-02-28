// Bun plugin that compiles .svelte files on import.
// Forces client-side output so we get mount(), not server rendering.

import { plugin } from 'bun';

plugin({
	name: 'svelte',
	setup(build) {
		build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
			const { compile } = await import('svelte/compiler');
			const source = await Bun.file(path).text();
			const name = path.split('/').pop()!.replace('.svelte', '');
			const result = compile(source, {
				generate: 'client',
				dev: false,
				css: 'external',
				name,
				filename: path,
			});
			return {
				contents: result.js.code,
				loader: 'js',
			};
		});

		build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
			const { compileModule } = await import('svelte/compiler');
			const source = await Bun.file(path).text();
			const transpiler = new Bun.Transpiler({ loader: 'ts', target: 'browser' });
			const js = transpiler.transformSync(source);
			const result = compileModule(js, {
				generate: 'client',
				dev: false,
				filename: path,
			});
			return {
				contents: result.js.code,
				loader: 'js',
			};
		});
	},
});
