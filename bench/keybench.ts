// keybench — headless keystroke-to-render latency benchmark
//
// Measures: state change -> Svelte flush -> render -> ANSI string
// Run: bun run bench

import { installGlobals } from '../src/dom-proxy/globals';

installGlobals();

import Input from '../src/components/Input.svelte';
import Stream from '../src/components/Stream.svelte';
import { render } from '../src/render';
import { renderTree, renderTextMutation } from '../src/renderer';
import { setMutationCallback } from '../src/dom-proxy/nodes';

const args = process.argv.slice(2);
const maxP99 = Number(args[args.indexOf('--max-p99') + 1]) || Infinity;
const jsonOnly = args.includes('--json');
const iterations = Number(args[args.indexOf('--iterations') + 1]) || 1000;

const app = render(Input, { placeholder: '' });
const instance = app.component as any;

const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 the quick brown fox jumps over the lazy dog';

function stats(arr: number[]) {
	const sorted = [...arr].sort((a, b) => a - b);
	return {
		count: sorted.length,
		avg: Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 10) / 10,
		p50: Math.round(sorted[Math.floor(sorted.length * 0.5)] * 10) / 10,
		p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
		p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 10) / 10,
		max: Math.round(sorted[sorted.length - 1] * 10) / 10,
	};
}

// --- Full tree walk ---

for (let i = 0; i < 50; i++) {
	instance.insert('w');
	await new Promise((r) => queueMicrotask(r));
	renderTree(app.target, 80, 24);
}
instance.clear();
await new Promise((r) => queueMicrotask(r));

const fullWalkLatencies: number[] = [];
for (let i = 0; i < iterations; i++) {
	const char = chars[i % chars.length];
	const t0 = Bun.nanoseconds();
	instance.insert(char);
	await new Promise((r) => queueMicrotask(r));
	renderTree(app.target, 80, 24);
	fullWalkLatencies.push((Bun.nanoseconds() - t0) / 1000);
}

// --- Mutation-driven ---

instance.clear();
await new Promise((r) => queueMicrotask(r));
renderTree(app.target, 80, 24);

const mutationLatencies: number[] = [];
let _lastMutationAnsi = '';

for (let i = 0; i < iterations; i++) {
	const char = chars[i % chars.length];
	_lastMutationAnsi = '';

	setMutationCallback((node, _old, _new) => {
		const ansi = renderTextMutation(node, 80);
		if (ansi) _lastMutationAnsi = ansi;
	});

	const t0 = Bun.nanoseconds();
	instance.insert(char);
	await new Promise((r) => queueMicrotask(r));
	mutationLatencies.push((Bun.nanoseconds() - t0) / 1000);

	if (i % 100 === 0) {
		setMutationCallback(null);
		renderTree(app.target, 80, 24);
	}
}
setMutationCallback(null);

// --- Backspace ---

instance.clear();
await new Promise((r) => queueMicrotask(r));
for (let i = 0; i < iterations; i++) instance.insert(chars[i % chars.length]);
await new Promise((r) => queueMicrotask(r));

const backspaceLatencies: number[] = [];
for (let i = 0; i < iterations; i++) {
	const t0 = Bun.nanoseconds();
	instance.backspace();
	await new Promise((r) => queueMicrotask(r));
	renderTree(app.target, 80, 24);
	backspaceLatencies.push((Bun.nanoseconds() - t0) / 1000);
}

// --- Under load: keystroke while streaming ---

instance.clear();
await new Promise((r) => queueMicrotask(r));

const streamApp = render(Stream, {});
const streamInstance = streamApp.component as any;

const tokens = [
	'The ', 'quick ', 'brown ', 'fox ', 'jumps ', 'over ', 'the ', 'lazy ', 'dog. ',
	'Here ', 'is ', 'a ', 'code ', 'block:\n', '```\n', 'function ', 'hello() ', '{\n',
];

function renderBoth(): string {
	return renderTree(streamApp.target, 80, 12) + renderTree(app.target, 80, 12);
}

const loadLatencies: number[] = [];
let tokenIdx = 0;

for (let i = 0; i < iterations; i++) {
	streamInstance.append(tokens[tokenIdx % tokens.length]);
	tokenIdx++;
	await new Promise((r) => queueMicrotask(r));

	const t0 = Bun.nanoseconds();
	instance.insert(chars[i % chars.length]);
	await new Promise((r) => queueMicrotask(r));
	renderBoth();
	loadLatencies.push((Bun.nanoseconds() - t0) / 1000);
}

// --- Results ---

const fw = stats(fullWalkLatencies);
const mt = stats(mutationLatencies);
const bs = stats(backspaceLatencies);
const ld = stats(loadLatencies);

const results = {
	timestamp: new Date().toISOString(),
	iterations,
	fullWalk: fw,
	mutation: mt,
	backspace: bs,
	underLoad: ld,
	thresholds: { maxP99, keystrokeP99Pass: mt.p99 <= maxP99 },
	pass: mt.p99 <= maxP99,
};

if (jsonOnly) {
	console.log(JSON.stringify(results));
} else {
	console.log(`\ntoner keybench — keystroke-to-render latency\n`);
	console.log(`  full tree walk (${fw.count} iterations)`);
	console.log(`    avg: ${fw.avg}us | p50: ${fw.p50}us | p95: ${fw.p95}us | p99: ${fw.p99}us | max: ${fw.max}us`);
	console.log(`  mutation-driven (${mt.count} iterations)`);
	console.log(`    avg: ${mt.avg}us | p50: ${mt.p50}us | p95: ${mt.p95}us | p99: ${mt.p99}us | max: ${mt.max}us`);
	console.log(`  backspace (${bs.count} iterations)`);
	console.log(`    avg: ${bs.avg}us | p50: ${bs.p50}us | p95: ${bs.p95}us | p99: ${bs.p99}us | max: ${bs.max}us`);
	console.log(`  under load — keystroke while streaming (${ld.count} iterations)`);
	console.log(`    avg: ${ld.avg}us | p50: ${ld.p50}us | p95: ${ld.p95}us | p99: ${ld.p99}us | max: ${ld.max}us`);

	const degradation = (((ld.p99 - fw.p99) / fw.p99) * 100).toFixed(1);
	console.log(`\n  load degradation: ${degradation}% (p99: ${fw.p99}us idle -> ${ld.p99}us under load)`);

	if (maxP99 < Infinity) {
		console.log(`\n  threshold: p99 <= ${maxP99}us (mutation-driven)`);
		console.log(`  result: ${results.pass ? 'PASS' : 'FAIL'} (p99: ${mt.p99}us)`);
	}

	console.log(`\n  Note: these numbers measure Toner's own headless render path only.`);
	console.log(`  Not a comparative benchmark against other frameworks.\n`);
}

app.unmount();
streamApp.unmount();
process.exit(results.pass ? 0 : 1);
