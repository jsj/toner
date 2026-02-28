import { describe, test, expect } from 'bun:test';

// Load the svelte plugin so .svelte imports compile correctly in tests
import '../src/svelte-plugin';

import { installGlobals } from '../src/dom-proxy/globals';

installGlobals();

// render.ts calls installGlobals + imports svelte client at module level.
// We must import it after globals are installed.
const { render } = await import('../src/render');

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
function stripAnsi(s: string): string {
	return s.replace(ANSI_RE, '');
}

describe('render() integration', () => {
	test('mounts Input component and renders', async () => {
		const Input = (await import('../src/components/Input.svelte')).default;
		const app = render(Input, { placeholder: 'Type here...' });
		await new Promise((r) => queueMicrotask(r));

		const output = stripAnsi(app.renderToString(80, 24));
		expect(output).toContain('Type here...');

		app.unmount();
	});

	test('Input insert and render', async () => {
		const Input = (await import('../src/components/Input.svelte')).default;
		const app = render(Input, { placeholder: '' });
		const input = app.component as any;
		await new Promise((r) => queueMicrotask(r));

		input.insert('h');
		input.insert('i');
		await new Promise((r) => queueMicrotask(r));

		const output = stripAnsi(app.renderToString(80, 24));
		expect(output).toContain('hi');

		app.unmount();
	});

	test('Input clear resets', async () => {
		const Input = (await import('../src/components/Input.svelte')).default;
		const app = render(Input, { placeholder: 'empty' });
		const input = app.component as any;
		await new Promise((r) => queueMicrotask(r));

		input.insert('x');
		await new Promise((r) => queueMicrotask(r));
		input.clear();
		await new Promise((r) => queueMicrotask(r));

		const output = stripAnsi(app.renderToString(80, 24));
		expect(output).toContain('empty');

		app.unmount();
	});

	test('Stream component append and render', async () => {
		const Stream = (await import('../src/components/Stream.svelte')).default;
		const app = render(Stream, {});
		const stream = app.component as any;
		await new Promise((r) => queueMicrotask(r));

		stream.append('hello ');
		stream.append('world');
		await new Promise((r) => queueMicrotask(r));

		const output = stripAnsi(app.renderToString(80, 24));
		expect(output).toContain('hello world');

		app.unmount();
	});

	test('Box layout renders children', async () => {
		// Dynamic import to get Svelte compiled component
		const Box = (await import('../src/components/Box.svelte')).default;
		const app = render(Box, {});
		await new Promise((r) => queueMicrotask(r));

		// Box alone renders an empty div — just verify it doesn't crash
		const output = app.renderToString(80, 24);
		expect(output).toBeDefined();

		app.unmount();
	});
});

describe('render() with layout', () => {
	test('layout renderer produces output without crash', async () => {
		const Stream = (await import('../src/components/Stream.svelte')).default;
		const app = render(Stream, {});
		const stream = app.component as any;
		await new Promise((r) => queueMicrotask(r));

		stream.append('layout test');
		await new Promise((r) => queueMicrotask(r));

		const lr = app.layout(80, 24);
		const output = lr.render();
		expect(output).toBeDefined();
		expect(typeof output).toBe('string');

		// Recompute should not crash
		lr.recompute();
		const output2 = lr.render();
		expect(output2).toBeDefined();

		// renderToString (simple tree walk) should contain the text
		const simple = stripAnsi(app.renderToString(80, 24));
		expect(simple).toContain('layout test');

		app.unmount();
	});
});
