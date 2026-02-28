// Minimal DOM proxy for Svelte 5's compiled output.
// Svelte's compiler emits calls to document.createElement, node.firstChild,
// node.cloneNode, etc. This module provides just enough of the DOM API for
// those calls to work, backed by a lightweight tree we control.

export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;
export const ELEMENT_NODE = 1;
export const DOCUMENT_FRAGMENT_NODE = 11;

let nextId = 1;

// Mutation callbacks — multiple listeners for text changes
export type MutationCallback = (node: TuiText, oldValue: string, newValue: string) => void;
let _onTextMutation: MutationCallback | null = null;
const _mutationListeners: Set<MutationCallback> = new Set();

export function setMutationCallback(cb: MutationCallback | null) {
	_onTextMutation = cb;
}

export function addMutationListener(cb: MutationCallback): () => void {
	_mutationListeners.add(cb);
	return () => {
		_mutationListeners.delete(cb);
	};
}

export class TuiNode {
	__id = nextId++;
	nodeType: number;
	parentNode: TuiNode | null = null;
	childNodes: TuiNode[] = [];
	__t: string | undefined;

	[key: string]: any;

	constructor(nodeType: number) {
		this.nodeType = nodeType;
	}

	get firstChild(): TuiNode | null {
		return this.childNodes[0] ?? null;
	}

	get lastChild(): TuiNode | null {
		return this.childNodes[this.childNodes.length - 1] ?? null;
	}

	get nextSibling(): TuiNode | null {
		if (!this.parentNode) return null;
		const siblings = this.parentNode.childNodes;
		const idx = siblings.indexOf(this);
		return siblings[idx + 1] ?? null;
	}

	get previousSibling(): TuiNode | null {
		if (!this.parentNode) return null;
		const siblings = this.parentNode.childNodes;
		const idx = siblings.indexOf(this);
		return idx > 0 ? siblings[idx - 1] : null;
	}

	appendChild(child: TuiNode): TuiNode {
		child.remove();
		child.parentNode = this;
		this.childNodes.push(child);
		return child;
	}

	removeChild(child: TuiNode): TuiNode {
		const idx = this.childNodes.indexOf(child);
		if (idx !== -1) {
			this.childNodes.splice(idx, 1);
			child.parentNode = null;
		}
		return child;
	}

	insertBefore(newChild: TuiNode, refChild: TuiNode | null): TuiNode {
		newChild.remove();
		newChild.parentNode = this;
		if (refChild === null) {
			this.childNodes.push(newChild);
		} else {
			const idx = this.childNodes.indexOf(refChild);
			if (idx !== -1) this.childNodes.splice(idx, 0, newChild);
			else this.childNodes.push(newChild);
		}
		return newChild;
	}

	append(...nodes: TuiNode[]) {
		for (const n of nodes) this.appendChild(n);
	}

	before(...nodes: TuiNode[]) {
		if (!this.parentNode) return;
		const siblings = this.parentNode.childNodes;
		const idx = siblings.indexOf(this);
		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i];
			n.remove();
			n.parentNode = this.parentNode;
			siblings.splice(idx + i, 0, n);
		}
	}

	after(...nodes: TuiNode[]) {
		if (!this.parentNode) return;
		const siblings = this.parentNode.childNodes;
		const idx = siblings.indexOf(this);
		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i];
			n.remove();
			n.parentNode = this.parentNode;
			siblings.splice(idx + 1 + i, 0, n);
		}
	}

	remove() {
		if (!this.parentNode) return;
		const siblings = this.parentNode.childNodes;
		const idx = siblings.indexOf(this);
		if (idx !== -1) siblings.splice(idx, 1);
		this.parentNode = null;
	}

	replaceWith(...nodes: TuiNode[]) {
		if (!this.parentNode) return;
		const parent = this.parentNode;
		const siblings = parent.childNodes;
		const idx = siblings.indexOf(this);
		this.parentNode = null;
		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i];
			n.remove();
			n.parentNode = parent;
			siblings.splice(idx + i, i === 0 ? 1 : 0, n);
		}
	}

	cloneNode(deep?: boolean): TuiNode {
		let clone: TuiNode;
		if (this instanceof TuiText) {
			clone = new TuiText(this.nodeValue);
		} else if (this instanceof TuiComment) {
			clone = new TuiComment(this.data);
		} else if (this instanceof TuiElement) {
			clone = new TuiElement(this.tagName, this.namespaceURI ?? undefined);
			for (const [k, v] of this.attributes) {
				(clone as TuiElement).attributes.set(k, v);
			}
		} else if (this instanceof TuiDocumentFragment) {
			clone = new TuiDocumentFragment();
		} else {
			clone = new TuiNode(this.nodeType);
		}
		if (deep) {
			for (const child of this.childNodes) {
				clone.appendChild(child.cloneNode(true));
			}
		}
		return clone;
	}

	set textContent(value: string) {
		this.childNodes = [];
		if (value !== '') {
			const text = new TuiText(value);
			text.parentNode = this;
			this.childNodes.push(text);
		}
	}

	get textContent(): string {
		return this.childNodes.map((c) => c.textContent).join('');
	}
}

export class TuiText extends TuiNode {
	_value: string;

	_line: number = -1;
	_col: number = -1;
	_len: number = 0;

	constructor(value: string = '') {
		super(TEXT_NODE);
		this._value = value;
	}

	get nodeValue(): string {
		return this._value;
	}

	set nodeValue(v: string) {
		const old = this._value;
		this._value = v;
		if (old !== v) {
			if (_onTextMutation) _onTextMutation(this, old, v);
			for (const cb of _mutationListeners) cb(this, old, v);
		}
	}

	get textContent(): string {
		return this._value;
	}

	set textContent(value: string) {
		this.nodeValue = value;
	}

	cloneNode(): TuiText {
		return new TuiText(this._value);
	}
}

export class TuiComment extends TuiNode {
	data: string;

	constructor(data: string = '') {
		super(COMMENT_NODE);
		this.data = data;
	}

	get nodeValue(): string {
		return this.data;
	}

	get textContent(): string {
		return this.data;
	}

	cloneNode(): TuiComment {
		return new TuiComment(this.data);
	}
}

export class TuiElement extends TuiNode {
	tagName: string;
	nodeName: string;
	attributes: Map<string, string> = new Map();
	namespaceURI: string | null;

	constructor(tag: string, namespace?: string) {
		super(ELEMENT_NODE);
		this.tagName = tag.toUpperCase();
		this.nodeName = this.tagName;
		this.namespaceURI = namespace ?? 'http://www.w3.org/1999/xhtml';
	}

	getAttribute(key: string): string | null {
		return this.attributes.get(key) ?? null;
	}

	setAttribute(key: string, value: string) {
		this.attributes.set(key, value);
	}

	setAttributeNS(_ns: string, key: string, value: string) {
		this.attributes.set(key, value);
	}

	removeAttribute(key: string) {
		this.attributes.delete(key);
	}

	hasAttribute(key: string): boolean {
		return this.attributes.has(key);
	}

	querySelectorAll(_selector: string): TuiElement[] {
		return [];
	}

	get content(): TuiDocumentFragment {
		const frag = new TuiDocumentFragment();
		for (const child of this.childNodes) {
			frag.appendChild(child.cloneNode(true));
		}
		return frag;
	}

	set innerHTML(html: string) {
		this.childNodes = [];
		if (!html) return;
		parseHTML(html, this);
	}
}

export class TuiDocumentFragment extends TuiNode {
	constructor() {
		super(DOCUMENT_FRAGMENT_NODE);
	}

	cloneNode(deep?: boolean): TuiDocumentFragment {
		const clone = new TuiDocumentFragment();
		if (deep) {
			for (const child of this.childNodes) {
				clone.appendChild(child.cloneNode(true));
			}
		}
		return clone;
	}
}

function parseHTML(html: string, parent: TuiNode) {
	let i = 0;

	function parseChildren(target: TuiNode) {
		while (i < html.length) {
			if (html[i] === '<') {
				if (html[i + 1] === '/') {
					i = html.indexOf('>', i) + 1;
					return;
				}
				if (html[i + 1] === '!' && html[i + 2] === '-' && html[i + 3] === '-') {
					const end = html.indexOf('-->', i);
					const data = html.slice(i + 4, end);
					const comment = new TuiComment(data);
					comment.parentNode = target;
					target.childNodes.push(comment);
					i = end + 3;
					continue;
				}
				i++;
				let tagEnd = i;
				while (tagEnd < html.length && html[tagEnd] !== '>' && html[tagEnd] !== ' ' && html[tagEnd] !== '/') tagEnd++;
				const tag = html.slice(i, tagEnd);
				const el = new TuiElement(tag);
				el.parentNode = target;

				i = tagEnd;
				while (i < html.length && html[i] !== '>' && html[i] !== '/') {
					if (html[i] === ' ') {
						i++;
						let attrNameEnd = i;
						while (
							attrNameEnd < html.length &&
							html[attrNameEnd] !== '=' &&
							html[attrNameEnd] !== '>' &&
							html[attrNameEnd] !== ' ' &&
							html[attrNameEnd] !== '/'
						)
							attrNameEnd++;
						const attrName = html.slice(i, attrNameEnd);
						i = attrNameEnd;
						if (html[i] === '=') {
							i++;
							const quote = html[i];
							if (quote === '"' || quote === "'") {
								i++;
								const valEnd = html.indexOf(quote, i);
								el.setAttribute(attrName, html.slice(i, valEnd));
								i = valEnd + 1;
							}
						} else if (attrName) {
							el.setAttribute(attrName, '');
						}
					} else {
						i++;
					}
				}

				if (html[i] === '/') {
					i += 2;
					target.childNodes.push(el);
					continue;
				}
				i++;

				const voidTags = new Set([
					'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr',
				]);
				if (voidTags.has(tag.toLowerCase())) {
					target.childNodes.push(el);
					continue;
				}

				target.childNodes.push(el);
				parseChildren(el);
			} else {
				let textEnd = html.indexOf('<', i);
				if (textEnd === -1) textEnd = html.length;
				const text = html.slice(i, textEnd);
				if (text) {
					const textNode = new TuiText(text);
					textNode.parentNode = target;
					target.childNodes.push(textNode);
				}
				i = textEnd;
			}
		}
	}

	parseChildren(parent);
}
