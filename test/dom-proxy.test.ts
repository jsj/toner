import { describe, test, expect, beforeEach } from 'bun:test';
import {
	TuiNode,
	TuiText,
	TuiElement,
	TuiComment,
	TuiDocumentFragment,
	TEXT_NODE,
	ELEMENT_NODE,
	COMMENT_NODE,
	DOCUMENT_FRAGMENT_NODE,
	setMutationCallback,
	addMutationListener,
} from '../src/dom-proxy/nodes';
import { collectText, debugTree, renderToTerminal } from '../src/dom-proxy/render';

describe('TuiNode', () => {
	test('has correct nodeType', () => {
		expect(new TuiText('hi').nodeType).toBe(TEXT_NODE);
		expect(new TuiElement('div').nodeType).toBe(ELEMENT_NODE);
		expect(new TuiComment('x').nodeType).toBe(COMMENT_NODE);
		expect(new TuiDocumentFragment().nodeType).toBe(DOCUMENT_FRAGMENT_NODE);
	});

	test('unique ids', () => {
		const a = new TuiNode(1);
		const b = new TuiNode(1);
		expect(a.__id).not.toBe(b.__id);
	});
});

describe('TuiText', () => {
	test('get/set nodeValue', () => {
		const t = new TuiText('hello');
		expect(t.nodeValue).toBe('hello');
		expect(t._value).toBe('hello');
		t.nodeValue = 'world';
		expect(t.nodeValue).toBe('world');
	});

	test('textContent aliases nodeValue', () => {
		const t = new TuiText('foo');
		expect(t.textContent).toBe('foo');
		t.textContent = 'bar';
		expect(t.nodeValue).toBe('bar');
	});

	test('cloneNode creates independent copy', () => {
		const t = new TuiText('original');
		const c = t.cloneNode();
		expect(c._value).toBe('original');
		c.nodeValue = 'changed';
		expect(t._value).toBe('original');
	});
});

describe('TuiElement', () => {
	test('tagName is uppercased', () => {
		expect(new TuiElement('div').tagName).toBe('DIV');
		expect(new TuiElement('Span').tagName).toBe('SPAN');
	});

	test('attributes get/set/remove/has', () => {
		const el = new TuiElement('div');
		el.setAttribute('data-style', 'bold');
		expect(el.getAttribute('data-style')).toBe('bold');
		expect(el.hasAttribute('data-style')).toBe(true);
		expect(el.getAttribute('missing')).toBeNull();
		el.removeAttribute('data-style');
		expect(el.hasAttribute('data-style')).toBe(false);
	});

	test('setAttributeNS stores attribute', () => {
		const el = new TuiElement('div');
		el.setAttributeNS('http://example.com', 'data-x', 'y');
		expect(el.getAttribute('data-x')).toBe('y');
	});

	test('innerHTML parses simple HTML', () => {
		const el = new TuiElement('div');
		el.innerHTML = '<span>hello</span>';
		expect(el.childNodes.length).toBe(1);
		expect((el.childNodes[0] as TuiElement).tagName).toBe('SPAN');
		expect(el.textContent).toBe('hello');
	});

	test('innerHTML handles comments', () => {
		const el = new TuiElement('div');
		el.innerHTML = '<!-- comment --><span>text</span>';
		expect(el.childNodes.length).toBe(2);
		expect(el.childNodes[0].nodeType).toBe(COMMENT_NODE);
	});

	test('innerHTML handles attributes', () => {
		const el = new TuiElement('div');
		el.innerHTML = '<span data-style="bold">text</span>';
		const span = el.childNodes[0] as TuiElement;
		expect(span.getAttribute('data-style')).toBe('bold');
	});

	test('content returns fragment clone of children', () => {
		const el = new TuiElement('template');
		el.appendChild(new TuiText('hi'));
		const content = el.content;
		expect(content.nodeType).toBe(DOCUMENT_FRAGMENT_NODE);
		expect(content.childNodes.length).toBe(1);
	});
});

describe('tree operations', () => {
	let root: TuiElement;

	beforeEach(() => {
		root = new TuiElement('div');
	});

	test('appendChild sets parent and adds to childNodes', () => {
		const child = new TuiText('hello');
		root.appendChild(child);
		expect(root.childNodes.length).toBe(1);
		expect(child.parentNode).toBe(root);
	});

	test('appendChild moves node from previous parent', () => {
		const parent1 = new TuiElement('div');
		const parent2 = new TuiElement('div');
		const child = new TuiText('hello');
		parent1.appendChild(child);
		parent2.appendChild(child);
		expect(parent1.childNodes.length).toBe(0);
		expect(parent2.childNodes.length).toBe(1);
		expect(child.parentNode).toBe(parent2);
	});

	test('remove detaches from parent', () => {
		const child = new TuiText('x');
		root.appendChild(child);
		child.remove();
		expect(root.childNodes.length).toBe(0);
		expect(child.parentNode).toBeNull();
	});

	test('before inserts siblings', () => {
		const a = new TuiText('a');
		const b = new TuiText('b');
		const c = new TuiText('c');
		root.appendChild(a);
		root.appendChild(c);
		c.before(b);
		expect(root.childNodes.map(n => (n as TuiText)._value)).toEqual(['a', 'b', 'c']);
	});

	test('after inserts siblings', () => {
		const a = new TuiText('a');
		const b = new TuiText('b');
		const c = new TuiText('c');
		root.appendChild(a);
		root.appendChild(c);
		a.after(b);
		expect(root.childNodes.map(n => (n as TuiText)._value)).toEqual(['a', 'b', 'c']);
	});

	test('replaceWith swaps nodes', () => {
		const a = new TuiText('a');
		const b = new TuiText('b');
		root.appendChild(a);
		a.replaceWith(b);
		expect(root.childNodes.length).toBe(1);
		expect((root.childNodes[0] as TuiText)._value).toBe('b');
	});

	test('firstChild / lastChild / nextSibling / previousSibling', () => {
		const a = new TuiText('a');
		const b = new TuiText('b');
		const c = new TuiText('c');
		root.append(a, b, c);
		expect(root.firstChild).toBe(a);
		expect(root.lastChild).toBe(c);
		expect(a.nextSibling).toBe(b);
		expect(b.nextSibling).toBe(c);
		expect(c.nextSibling).toBeNull();
		expect(c.previousSibling).toBe(b);
		expect(a.previousSibling).toBeNull();
	});

	test('textContent setter clears children and sets text', () => {
		root.appendChild(new TuiText('old'));
		root.appendChild(new TuiText('stuff'));
		root.textContent = 'new';
		expect(root.childNodes.length).toBe(1);
		expect(root.textContent).toBe('new');
	});

	test('textContent setter with empty string clears', () => {
		root.appendChild(new TuiText('x'));
		root.textContent = '';
		expect(root.childNodes.length).toBe(0);
	});

	test('cloneNode deep copies tree', () => {
		const span = new TuiElement('span');
		span.appendChild(new TuiText('hello'));
		root.appendChild(span);
		const clone = root.cloneNode(true);
		expect(clone.childNodes.length).toBe(1);
		expect((clone.childNodes[0] as TuiElement).tagName).toBe('SPAN');
		expect(clone.textContent).toBe('hello');
		// Mutating clone doesn't affect original
		(clone.childNodes[0] as TuiElement).appendChild(new TuiText(' world'));
		expect(root.textContent).toBe('hello');
	});
});

describe('mutation callbacks', () => {
	test('setMutationCallback fires on nodeValue change', () => {
		const calls: [string, string][] = [];
		setMutationCallback((node, oldVal, newVal) => {
			calls.push([oldVal, newVal]);
		});

		const t = new TuiText('before');
		t.nodeValue = 'after';

		expect(calls).toEqual([['before', 'after']]);
		setMutationCallback(null);
	});

	test('no callback when value unchanged', () => {
		const calls: string[] = [];
		setMutationCallback(() => calls.push('fired'));

		const t = new TuiText('same');
		t.nodeValue = 'same';

		expect(calls.length).toBe(0);
		setMutationCallback(null);
	});

	test('addMutationListener returns unsubscribe', () => {
		const calls: string[] = [];
		const unsub = addMutationListener(() => calls.push('heard'));

		const t = new TuiText('a');
		t.nodeValue = 'b';
		expect(calls.length).toBe(1);

		unsub();
		t.nodeValue = 'c';
		expect(calls.length).toBe(1);
	});

	test('multiple listeners all fire', () => {
		const calls1: string[] = [];
		const calls2: string[] = [];
		const unsub1 = addMutationListener(() => calls1.push('1'));
		const unsub2 = addMutationListener(() => calls2.push('2'));

		const t = new TuiText('x');
		t.nodeValue = 'y';

		expect(calls1.length).toBe(1);
		expect(calls2.length).toBe(1);
		unsub1();
		unsub2();
	});
});

describe('collectText', () => {
	test('extracts text from nested tree', () => {
		const root = new TuiElement('div');
		const span = new TuiElement('span');
		span.appendChild(new TuiText('hello'));
		root.appendChild(span);
		root.appendChild(new TuiText(' world'));
		expect(collectText(root)).toBe('hello world');
	});

	test('skips comments', () => {
		const root = new TuiElement('div');
		root.appendChild(new TuiComment('skip'));
		root.appendChild(new TuiText('visible'));
		expect(collectText(root)).toBe('visible');
	});
});

describe('debugTree', () => {
	test('produces readable output', () => {
		const root = new TuiElement('div');
		root.appendChild(new TuiText('hi'));
		const output = debugTree(root);
		expect(output).toContain('<div>');
		expect(output).toContain('TEXT: "hi"');
		expect(output).toContain('</div>');
	});
});
