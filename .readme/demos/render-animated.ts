// Renders an animated toner component for a set duration then exits.
// Usage: bun run .readme/demos/render-animated.ts <ComponentName> [durationMs]

import { render } from '../../src/render';
import { createRenderLoop } from '../../src/render-loop';

const name = process.argv[2];
const duration = Number(process.argv[3]) || 3000;
if (!name) {
	console.error('Usage: bun run render-animated.ts <component-name> [durationMs]');
	process.exit(1);
}

const COLS = 80;
const ROWS = 24;
const ESC = '\x1b';
const CSI = `${ESC}[`;
const write = (s: string) => Bun.write(Bun.stdout, s);

const mod = await import(`./${name}.svelte`);
const app = render(mod.default, { width: COLS, height: ROWS });
await new Promise((r) => queueMicrotask(r));

const loop = createRenderLoop(
	app.target,
	COLS,
	ROWS,
	(frame) => write(frame),
);

// Clear screen, hide cursor
await write(`${CSI}2J${CSI}H${CSI}?25l`);
loop.render();
loop.start();

setTimeout(() => {
	loop.stop();
	write(`${CSI}?25h`);
	app.unmount();
	process.exit(0);
}, duration);
