// Toner demo — interactive terminal input with keystroke latency display.
// Run: bun run examples/demo.ts

import { installGlobals } from '../src/dom-proxy/globals';

installGlobals();

import { render } from '../src/render';
import { createLayoutRenderer } from '../src/renderer';
import { parseKeys, enterRawMode, exitRawMode } from '../src/input/stdin';

// Dynamic import so Svelte plugin compiles it
const { default: Demo } = await import('./DemoApp.svelte');

const ESC = '\x1b';
const CSI = `${ESC}[`;
const write = (s: string) => Bun.write(Bun.stdout, s);

let cols = 80;
let rows = 24;
function refreshTermSize() {
	const result = Bun.spawnSync(['stty', 'size'], { stdin: 'inherit' });
	const [r, c] = result.stdout.toString().trim().split(' ').map(Number);
	cols = c || 80;
	rows = r || 24;
}
refreshTermSize();

const app = render(Demo, { width: cols, height: rows });
await new Promise((r) => queueMicrotask(r));
const instance = app.component as any;

const lr = createLayoutRenderer(app.target, cols, rows);

process.on('SIGWINCH', () => {
	refreshTermSize();
	lr.recompute();
	write(lr.render());
});

const latencies: number[] = [];
let keystrokeCount = 0;

function computeStats() {
	if (latencies.length === 0) return null;
	const sorted = [...latencies].sort((a, b) => a - b);
	return {
		count: keystrokeCount,
		avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
		p50: sorted[Math.floor(sorted.length * 0.5)],
		p95: sorted[Math.floor(sorted.length * 0.95)],
		p99: sorted[Math.floor(sorted.length * 0.99)],
		max: sorted[sorted.length - 1],
	};
}

enterRawMode();
await write(`${CSI}?1049h${CSI}?25l`);
write(lr.render());

const stdin = Bun.stdin.stream();
const reader = stdin.getReader();

try {
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;

		const t0 = Bun.nanoseconds();
		const events = parseKeys(value);
		let ops = 0;

		for (const event of events) {
			switch (event.type) {
				case 'ctrl_c': throw 'exit';
				case 'char': instance.insert(event.char); ops++; break;
				case 'backspace': instance.backspace(); ops++; break;
				case 'left': instance.moveLeft(); ops++; break;
				case 'right': instance.moveRight(); ops++; break;
				case 'home': instance.home(); ops++; break;
				case 'end': instance.end(); ops++; break;
				case 'enter': instance.clear(); ops++; break;
			}
		}

		if (ops === 0) continue;

		await new Promise((r) => queueMicrotask(r));
		write(lr.render());

		const elapsed = (Bun.nanoseconds() - t0) / 1000;
		keystrokeCount += ops;
		latencies.push(elapsed);

		const stats = computeStats();
		if (stats) instance.updateStats(stats);
		await new Promise((r) => queueMicrotask(r));
		write(lr.render());
	}
} catch (e) {
	if (e !== 'exit') throw e;
} finally {
	exitRawMode();
	await write(`${CSI}?25h${CSI}?1049l`);

	const stats = computeStats();
	if (stats) {
		console.log(`\nToner Demo — Results`);
		console.log(`  Keystrokes: ${stats.count}`);
		console.log(`  Latency avg: ${stats.avg.toFixed(1)}us | p50: ${stats.p50.toFixed(1)}us | p95: ${stats.p95.toFixed(1)}us | p99: ${stats.p99.toFixed(1)}us | max: ${stats.max.toFixed(1)}us`);
		console.log(`  Ink/React: ~33,000-53,000us | Target: <5,000us`);
		if (stats.p99 < 5000) console.log(`  Sub-5ms p99 achieved!`);
	}
}
