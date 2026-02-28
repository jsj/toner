// Focus system — determines which component receives keystrokes.
// Stack-based: top of stack gets input. Push for modals/overlays, pop to return.

import type { KeyEvent } from './input/stdin.js';

export type KeyHandler = (event: KeyEvent) => boolean | undefined;

interface FocusEntry {
	id: string;
	handler: KeyHandler;
}

let stack: FocusEntry[] = [];
const registry = new Map<string, KeyHandler>();

export function registerFocusable(id: string, handler: KeyHandler) {
	registry.set(id, handler);
}

export function unregisterFocusable(id: string) {
	registry.delete(id);
	stack = stack.filter((e) => e.id !== id);
}

export function focus(id: string) {
	const handler = registry.get(id);
	if (!handler) return;
	stack = stack.filter((e) => e.id !== id);
	stack.push({ id, handler });
}

export function blur(id: string) {
	stack = stack.filter((e) => e.id !== id);
}

export function pushFocus(id: string) {
	focus(id);
}

export function popFocus(): string | null {
	const popped = stack.pop();
	return popped?.id ?? null;
}

export function getFocusedId(): string | null {
	return stack.length > 0 ? stack[stack.length - 1].id : null;
}

export function dispatch(event: KeyEvent): boolean {
	if (stack.length === 0) return false;
	const top = stack[stack.length - 1];
	return top.handler(event) ?? false;
}

export function cycleFocus(direction: 1 | -1 = 1) {
	const ids = [...registry.keys()];
	if (ids.length === 0) return;
	const currentId = getFocusedId();
	const currentIndex = currentId ? ids.indexOf(currentId) : -1;
	const nextIndex = (currentIndex + direction + ids.length) % ids.length;
	focus(ids[nextIndex]);
}

export function resetFocus() {
	stack = [];
	registry.clear();
}
