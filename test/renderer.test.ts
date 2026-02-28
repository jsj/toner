import { describe, test, expect } from 'bun:test';
import { TuiElement, TuiText, TuiComment } from '../src/dom-proxy/nodes';
import { renderTree, renderTextMutation, resolveStyleToken, getAnsiOpen } from '../src/renderer';

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
function stripAnsi(s: string): string {
	return s.replace(ANSI_RE, '');
}

describe('resolveStyleToken', () => {
	test('named foreground colors', () => {
		expect(resolveStyleToken('red')).toBe('31');
		expect(resolveStyleToken('green')).toBe('32');
		expect(resolveStyleToken('cyan')).toBe('36');
	});

	test('named background colors', () => {
		expect(resolveStyleToken('bgRed')).toBe('41');
		expect(resolveStyleToken('bgBlue')).toBe('44');
	});

	test('modifiers', () => {
		expect(resolveStyleToken('bold')).toBe('1');
		expect(resolveStyleToken('dim')).toBe('2');
		expect(resolveStyleToken('italic')).toBe('3');
		expect(resolveStyleToken('underline')).toBe('4');
		expect(resolveStyleToken('inverse')).toBe('7');
		expect(resolveStyleToken('strikethrough')).toBe('9');
	});

	test('hex colors', () => {
		expect(resolveStyleToken('#ff0000')).toBe('38;2;255;0;0');
		expect(resolveStyleToken('#0f0')).toBe('38;2;0;255;0');
	});

	test('hex background', () => {
		expect(resolveStyleToken('bg#0000ff')).toBe('48;2;0;0;255');
	});

	test('rgb()', () => {
		expect(resolveStyleToken('rgb(128, 64, 32)')).toBe('38;2;128;64;32');
	});

	test('ansi256()', () => {
		expect(resolveStyleToken('ansi256(196)')).toBe('38;5;196');
	});

	test('unknown returns null', () => {
		expect(resolveStyleToken('nonexistent')).toBeNull();
	});
});

describe('getAnsiOpen', () => {
	test('no style returns empty', () => {
		const el = new TuiElement('span');
		expect(getAnsiOpen(el)).toBe('');
	});

	test('single style', () => {
		const el = new TuiElement('span');
		el.setAttribute('data-style', 'bold');
		expect(getAnsiOpen(el)).toBe('\x1b[1m');
	});

	test('multiple styles joined', () => {
		const el = new TuiElement('span');
		el.setAttribute('data-style', 'bold;red');
		expect(getAnsiOpen(el)).toBe('\x1b[1;31m');
	});
});

describe('renderTree', () => {
	test('renders text content', () => {
		const root = new TuiElement('div');
		root.appendChild(new TuiText('hello'));
		const output = stripAnsi(renderTree(root, 80, 24));
		expect(output).toContain('hello');
	});

	test('skips comments', () => {
		const root = new TuiElement('div');
		root.appendChild(new TuiComment('hidden'));
		root.appendChild(new TuiText('visible'));
		const output = stripAnsi(renderTree(root, 80, 24));
		expect(output).toContain('visible');
		expect(output).not.toContain('hidden');
	});

	test('nested elements', () => {
		const root = new TuiElement('div');
		const span = new TuiElement('span');
		span.appendChild(new TuiText('inner'));
		root.appendChild(span);
		const output = stripAnsi(renderTree(root, 80, 24));
		expect(output).toContain('inner');
	});

	test('block elements create line breaks', () => {
		const root = new TuiElement('div');
		const div1 = new TuiElement('div');
		div1.appendChild(new TuiText('line1'));
		const div2 = new TuiElement('div');
		div2.appendChild(new TuiText('line2'));
		root.appendChild(div1);
		root.appendChild(div2);
		const output = stripAnsi(renderTree(root, 80, 24));
		expect(output).toContain('line1');
		expect(output).toContain('line2');
	});

	test('sets position mappings on text nodes', () => {
		const root = new TuiElement('div');
		const text = new TuiText('hello');
		root.appendChild(text);
		renderTree(root, 80, 24);
		expect(text._line).toBeGreaterThanOrEqual(0);
		expect(text._col).toBeGreaterThanOrEqual(0);
		expect(text._len).toBe(5);
	});

	test('respects column limit', () => {
		const root = new TuiElement('div');
		root.appendChild(new TuiText('a'.repeat(100)));
		const output = renderTree(root, 40, 24);
		const lines = output.split('\r\n');
		for (const line of lines) {
			const plain = stripAnsi(line);
			expect(plain.length).toBeLessThanOrEqual(40 + 10); // allow some ANSI margin
		}
	});
});

describe('renderTextMutation', () => {
	test('returns null when no position mapping', () => {
		const t = new TuiText('hello');
		expect(renderTextMutation(t, 80)).toBeNull();
	});

	test('returns ANSI after position mapping set', () => {
		const root = new TuiElement('div');
		const t = new TuiText('hello');
		root.appendChild(t);
		renderTree(root, 80, 24); // sets positions
		t._value = 'world';
		const ansi = renderTextMutation(t, 80);
		expect(ansi).not.toBeNull();
		expect(stripAnsi(ansi!)).toContain('world');
	});
});
