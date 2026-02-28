import { describe, test, expect } from 'bun:test';
import { parseKeys, type KeyEvent } from '../src/input/stdin';

function bytes(...vals: number[]): Uint8Array {
	return new Uint8Array(vals);
}

function types(events: KeyEvent[]): string[] {
	return events.map(e => e.type);
}

describe('parseKeys', () => {
	test('printable ASCII', () => {
		const events = parseKeys(bytes(0x61, 0x62, 0x63)); // abc
		expect(types(events)).toEqual(['char', 'char', 'char']);
		expect(events.map(e => e.char)).toEqual(['a', 'b', 'c']);
	});

	test('ctrl+c', () => {
		expect(types(parseKeys(bytes(3)))).toEqual(['ctrl_c']);
	});

	test('enter', () => {
		expect(types(parseKeys(bytes(13)))).toEqual(['enter']);
	});

	test('backspace (127)', () => {
		expect(types(parseKeys(bytes(127)))).toEqual(['backspace']);
	});

	test('backspace (8)', () => {
		expect(types(parseKeys(bytes(8)))).toEqual(['backspace']);
	});

	test('tab', () => {
		expect(types(parseKeys(bytes(9)))).toEqual(['tab']);
	});

	test('ctrl+a = home', () => {
		expect(types(parseKeys(bytes(1)))).toEqual(['home']);
	});

	test('ctrl+e = end', () => {
		expect(types(parseKeys(bytes(5)))).toEqual(['end']);
	});

	test('ctrl+u = clear_line', () => {
		expect(types(parseKeys(bytes(21)))).toEqual(['clear_line']);
	});

	test('ctrl+k = kill_to_end', () => {
		expect(types(parseKeys(bytes(11)))).toEqual(['kill_to_end']);
	});

	test('ctrl+w = word_backspace', () => {
		expect(types(parseKeys(bytes(23)))).toEqual(['word_backspace']);
	});

	test('ctrl+l', () => {
		expect(types(parseKeys(bytes(12)))).toEqual(['ctrl_l']);
	});

	test('ctrl+n', () => {
		expect(types(parseKeys(bytes(14)))).toEqual(['ctrl_n']);
	});

	test('ctrl+o', () => {
		expect(types(parseKeys(bytes(15)))).toEqual(['ctrl_o']);
	});

	test('arrow up (ESC [ A)', () => {
		expect(types(parseKeys(bytes(27, 91, 65)))).toEqual(['up']);
	});

	test('arrow down (ESC [ B)', () => {
		expect(types(parseKeys(bytes(27, 91, 66)))).toEqual(['down']);
	});

	test('arrow right (ESC [ C)', () => {
		expect(types(parseKeys(bytes(27, 91, 67)))).toEqual(['right']);
	});

	test('arrow left (ESC [ D)', () => {
		expect(types(parseKeys(bytes(27, 91, 68)))).toEqual(['left']);
	});

	test('home (ESC [ H)', () => {
		expect(types(parseKeys(bytes(27, 91, 72)))).toEqual(['home']);
	});

	test('end (ESC [ F)', () => {
		expect(types(parseKeys(bytes(27, 91, 70)))).toEqual(['end']);
	});

	test('shift+tab (ESC [ Z)', () => {
		expect(types(parseKeys(bytes(27, 91, 90)))).toEqual(['shift_tab']);
	});

	test('delete (ESC [ 3 ~)', () => {
		expect(types(parseKeys(bytes(27, 91, 51, 126)))).toEqual(['delete']);
	});

	test('page up (ESC [ 5 ~)', () => {
		expect(types(parseKeys(bytes(27, 91, 53, 126)))).toEqual(['page_up']);
	});

	test('page down (ESC [ 6 ~)', () => {
		expect(types(parseKeys(bytes(27, 91, 54, 126)))).toEqual(['page_down']);
	});

	test('alt+enter = newline (ESC CR)', () => {
		expect(types(parseKeys(bytes(27, 13)))).toEqual(['newline']);
	});

	test('alt+b = word_left', () => {
		expect(types(parseKeys(bytes(27, 98)))).toEqual(['word_left']);
	});

	test('alt+f = word_right', () => {
		expect(types(parseKeys(bytes(27, 102)))).toEqual(['word_right']);
	});

	test('alt+backspace = word_backspace', () => {
		expect(types(parseKeys(bytes(27, 127)))).toEqual(['word_backspace']);
	});

	test('ctrl+right = word_right (ESC [ 1 ; 5 C)', () => {
		expect(types(parseKeys(bytes(27, 91, 49, 59, 53, 67)))).toEqual(['word_right']);
	});

	test('ctrl+left = word_left (ESC [ 1 ; 5 D)', () => {
		expect(types(parseKeys(bytes(27, 91, 49, 59, 53, 68)))).toEqual(['word_left']);
	});

	test('UTF-8 2-byte character', () => {
		const events = parseKeys(new Uint8Array([0xc3, 0xa9])); // e-acute
		expect(events.length).toBe(1);
		expect(events[0].type).toBe('char');
		expect(events[0].char).toBe('\u00e9');
	});

	test('UTF-8 3-byte character', () => {
		const events = parseKeys(new Uint8Array([0xe2, 0x9c, 0x93])); // checkmark
		expect(events.length).toBe(1);
		expect(events[0].char).toBe('\u2713');
	});

	test('UTF-8 4-byte character (emoji)', () => {
		const encoder = new TextEncoder();
		const events = parseKeys(encoder.encode('\u{1f600}')); // grinning face
		expect(events.length).toBe(1);
		expect(events[0].char).toBe('\u{1f600}');
	});

	test('paste detection: many chars collapsed', () => {
		// 20 printable chars = paste
		const input = new Uint8Array(20);
		for (let i = 0; i < 20; i++) input[i] = 0x61 + (i % 26);
		const events = parseKeys(input);
		expect(events.length).toBe(1);
		expect(events[0].type).toBe('paste');
		expect(events[0].text?.length).toBe(20);
	});

	test('mixed sequence: char + arrow + char', () => {
		const events = parseKeys(bytes(0x61, 27, 91, 67, 0x62)); // a, right, b
		expect(types(events)).toEqual(['char', 'right', 'char']);
	});
});
