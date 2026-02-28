// toner — Svelte for interactive command-line apps

// Core render API
export { render, type Instance } from './render.js';

// DOM proxy
export { installGlobals } from './dom-proxy/globals.js';
export { TuiNode, TuiText, TuiElement, TuiComment, TuiDocumentFragment } from './dom-proxy/nodes.js';
export type { MutationCallback } from './dom-proxy/nodes.js';

// Renderer
export {
	renderTree,
	renderWithLayout,
	renderTextMutation,
	createReactiveRenderer,
	createLayoutRenderer,
	resolveStyleToken,
	getAnsiOpen,
	type ReactiveRenderer,
	type LayoutRenderer,
} from './renderer.js';

// Render loop
export { createRenderLoop, type RenderLoop } from './render-loop.js';

// Input
export { parseKeys, enterRawMode, exitRawMode, type KeyEvent } from './input/stdin.js';

// Focus
export {
	registerFocusable,
	unregisterFocusable,
	focus,
	blur,
	pushFocus,
	popFocus,
	getFocusedId,
	dispatch,
	cycleFocus,
	resetFocus,
	type KeyHandler,
} from './focus.js';

// Highlight
export { highlight, highlightSync, resolveLanguage, prewarm } from './highlight.js';

// Debug
export { debug, debugTree, debugLayout } from './debug.js';
