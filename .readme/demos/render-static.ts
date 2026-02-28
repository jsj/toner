// Renders a static toner component to stdout (with Yoga layout + borders) and exits.
// Usage: bun run .readme/demos/render-static.ts <ComponentName> [cols] [rows]

import { render } from '../../src/render';
import { renderWithLayout } from '../../src/renderer';

const name = process.argv[2];
const cols = Number(process.argv[3]) || 80;
const rows = Number(process.argv[4]) || 24;
if (!name) {
	console.error('Usage: bun run render-static.ts <component-name> [cols] [rows]');
	process.exit(1);
}

const mod = await import(`./${name}.svelte`);
const app = render(mod.default);
await new Promise((r) => queueMicrotask(r));
const output = renderWithLayout(app.target, cols, rows);
await Bun.write(Bun.stdout, output);
process.exit(0);
