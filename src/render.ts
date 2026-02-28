// Toner's main entry point — mount a Svelte component to the terminal.
//
// Usage:
//   import { render } from 'toner'
//   const app = render(MyComponent, { props })

import { installGlobals } from './dom-proxy/globals.js';
import { TuiElement } from './dom-proxy/nodes.js';
import { createReactiveRenderer, type ReactiveRenderer, renderTree, createLayoutRenderer, type LayoutRenderer } from './renderer.js';

installGlobals();

const svelteClientPath = import.meta.resolve('svelte').replace('index-server.js', 'index-client.js');
// biome-ignore lint/complexity/noBannedTypes: dynamic import of svelte client runtime
const { mount, unmount } = (await import(svelteClientPath)) as { mount: Function; unmount: Function };

export interface Instance {
	component: any;
	target: TuiElement;
	renderToString: (cols?: number, rows?: number) => string;
	renderToStdout: (cols?: number, rows?: number) => void;
	reactive: (cols: number, rows: number) => ReactiveRenderer;
	layout: (cols: number, rows: number) => LayoutRenderer;
	unmount: () => void;
}

export function render(Component: any, props: Record<string, any> = {}): Instance {
	const target = new TuiElement('div');
	(globalThis as any).document.body.appendChild(target);

	const component = mount(Component, {
		target: target as any,
		props,
	});

	function renderToString(cols = 80, rows = 24): string {
		return renderTree(target, cols, rows);
	}

	function renderToStdout(cols?: number, rows?: number) {
		Bun.write(Bun.stdout, renderToString(cols ?? 80, rows ?? 24));
	}

	function reactive(cols: number, rows: number): ReactiveRenderer {
		return createReactiveRenderer(target, cols, rows);
	}

	function layout(cols: number, rows: number): LayoutRenderer {
		return createLayoutRenderer(target, cols, rows);
	}

	function destroy() {
		unmount(component);
		target.remove();
	}

	return { component, target, renderToString, renderToStdout, reactive, layout, unmount: destroy };
}

export { installGlobals } from './dom-proxy/globals.js';
export { TuiElement, TuiNode, TuiText } from './dom-proxy/nodes.js';
export { renderTree, renderWithLayout } from './renderer.js';
