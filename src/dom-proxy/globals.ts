// Register minimal DOM globals so Svelte's compiled output can run.

import { ELEMENT_NODE, TEXT_NODE, TuiComment, TuiDocumentFragment, TuiElement, TuiNode, TuiText } from './nodes.js';

const elementProto = {
	__click: undefined,
	__className: undefined,
	__attributes: null,
	__style: undefined,
	__e: undefined,
	__svelte_meta: null,
	nodeType: ELEMENT_NODE,
};

const textProto = {
	__t: undefined,
	nodeType: TEXT_NODE,
};

const nodeProto = {};

Object.defineProperty(nodeProto, 'firstChild', {
	get(this: TuiNode) {
		return this.firstChild;
	},
	configurable: true,
});
Object.defineProperty(nodeProto, 'nextSibling', {
	get(this: TuiNode) {
		return this.nextSibling;
	},
	configurable: true,
});

const doc = {
	createDocumentFragment(): TuiDocumentFragment {
		return new TuiDocumentFragment();
	},
	createTextNode(value: string): TuiText {
		return new TuiText(value);
	},
	createComment(data: string): TuiComment {
		return new TuiComment(data);
	},
	createElementNS(namespace: string, tag: string, _options?: any): TuiElement {
		return new TuiElement(tag, namespace);
	},
	createElement(tag: string): TuiElement {
		return new TuiElement(tag);
	},
	importNode(node: TuiNode, deep: boolean): TuiNode {
		return node.cloneNode(deep);
	},
	body: new TuiElement('body'),
	documentElement: new TuiElement('html'),
	head: new TuiElement('head'),
	querySelectorAll() {
		return [];
	},
	addEventListener() {},
	removeEventListener() {},
};

const win = {
	document: doc,
	navigator: { userAgent: 'Toner/1.0' },
	trustedTypes: undefined,
	addEventListener() {},
	removeEventListener() {},
	getComputedStyle() {
		return {};
	},
	__svelte: { uid: 1 },
	CustomEvent:
		globalThis.CustomEvent ??
		class CustomEvent extends Event {
			detail: any;
			constructor(type: string, opts?: any) {
				super(type, opts);
				this.detail = opts?.detail;
			}
		},
	Event: globalThis.Event,
};

const nav = win.navigator;

export function installGlobals() {
	const g = globalThis as any;

	g.document ??= doc;
	g.window ??= win;
	g.navigator ??= nav;
	g.Element ??= TuiElement;
	g.Node ??= TuiNode;
	g.Text ??= TuiText;
	g.Comment ??= TuiComment;
	g.DocumentFragment ??= TuiDocumentFragment;
	g.HTMLElement ??= TuiElement;
	g.SVGElement ??= TuiElement;
	g.MathMLElement ??= TuiElement;

	if (!g.Element.prototype) g.Element.prototype = elementProto;
	if (!g.Text.prototype) g.Text.prototype = textProto;
	if (!g.Node.prototype) g.Node.prototype = nodeProto;
}
