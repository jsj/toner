// Event-driven render loop.
// Schedules a render only when a DOM mutation marks the tree dirty.
// No polling. Zero CPU when idle. Coalesces multiple mutations per frame.
//
// Uses Synchronized Output protocol (DEC mode 2026) to prevent tearing.

import type { TuiNode } from './dom-proxy/nodes.js';
import { addMutationListener } from './dom-proxy/nodes.js';
import { renderWithLayout } from './renderer.js';

const SYNC_BEGIN = '\x1b[?2026h';
const SYNC_END = '\x1b[?2026l';

export interface RenderLoop {
	start: () => void;
	stop: () => void;
	markDirty: () => void;
	render: () => void;
	resize: (cols: number, rows: number) => void;
}

export function createRenderLoop(
	root: TuiNode,
	initialCols: number,
	initialRows: number,
	writeFn: (s: string) => void,
	fps = 30,
): RenderLoop {
	let cols = initialCols;
	let rows = initialRows;
	let dirty = false;
	let scheduled = false;
	let stopped = false;
	let removeListener: (() => void) | null = null;
	const frameMs = Math.round(1000 / fps);

	function render() {
		const frame = renderWithLayout(root, cols, rows);
		writeFn(`${SYNC_BEGIN}${frame}${SYNC_END}`);
		dirty = false;
	}

	function scheduleFrame() {
		if (scheduled || stopped) return;
		scheduled = true;
		setTimeout(() => {
			scheduled = false;
			if (dirty && !stopped) render();
		}, frameMs);
	}

	function markDirty() {
		dirty = true;
		scheduleFrame();
	}

	function start() {
		stopped = false;
		removeListener = addMutationListener(() => markDirty());
	}

	function stop() {
		stopped = true;
		if (removeListener) {
			removeListener();
			removeListener = null;
		}
	}

	function resize(c: number, r: number) {
		cols = c;
		rows = r;
		markDirty();
	}

	return { start, stop, markDirty, render, resize };
}
