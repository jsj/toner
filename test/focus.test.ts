import { describe, test, expect, beforeEach } from 'bun:test';
import {
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
} from '../src/focus';
import type { KeyEvent } from '../src/input/stdin';

const makeEvent = (type: KeyEvent['type']): KeyEvent => ({ type });

beforeEach(() => {
	resetFocus();
});

describe('focus system', () => {
	test('no focused id initially', () => {
		expect(getFocusedId()).toBeNull();
	});

	test('register and focus', () => {
		registerFocusable('input', () => true);
		focus('input');
		expect(getFocusedId()).toBe('input');
	});

	test('focus unregistered id is no-op', () => {
		focus('unknown');
		expect(getFocusedId()).toBeNull();
	});

	test('blur removes from stack', () => {
		registerFocusable('input', () => true);
		focus('input');
		blur('input');
		expect(getFocusedId()).toBeNull();
	});

	test('stack order: last focused wins', () => {
		registerFocusable('a', () => true);
		registerFocusable('b', () => true);
		focus('a');
		focus('b');
		expect(getFocusedId()).toBe('b');
	});

	test('pushFocus and popFocus', () => {
		registerFocusable('main', () => true);
		registerFocusable('modal', () => true);
		pushFocus('main');
		pushFocus('modal');
		expect(getFocusedId()).toBe('modal');

		const popped = popFocus();
		expect(popped).toBe('modal');
		expect(getFocusedId()).toBe('main');
	});

	test('popFocus on empty stack returns null', () => {
		expect(popFocus()).toBeNull();
	});

	test('dispatch sends to top of stack', () => {
		const received: KeyEvent[] = [];
		registerFocusable('input', (e) => { received.push(e); return true; });
		focus('input');

		const handled = dispatch(makeEvent('enter'));
		expect(handled).toBe(true);
		expect(received.length).toBe(1);
		expect(received[0].type).toBe('enter');
	});

	test('dispatch returns false when stack empty', () => {
		expect(dispatch(makeEvent('enter'))).toBe(false);
	});

	test('unregisterFocusable removes from registry and stack', () => {
		registerFocusable('input', () => true);
		focus('input');
		unregisterFocusable('input');
		expect(getFocusedId()).toBeNull();
		// Re-focus should be no-op since unregistered
		focus('input');
		expect(getFocusedId()).toBeNull();
	});

	test('cycleFocus moves through registered focusables', () => {
		registerFocusable('a', () => true);
		registerFocusable('b', () => true);
		registerFocusable('c', () => true);

		cycleFocus(1);
		expect(getFocusedId()).toBe('a');
		cycleFocus(1);
		expect(getFocusedId()).toBe('b');
		cycleFocus(1);
		expect(getFocusedId()).toBe('c');
		cycleFocus(1); // wraps
		expect(getFocusedId()).toBe('a');
	});

	test('cycleFocus backwards', () => {
		registerFocusable('a', () => true);
		registerFocusable('b', () => true);
		focus('b');
		cycleFocus(-1);
		expect(getFocusedId()).toBe('a');
	});

	test('cycleFocus with no focusables is no-op', () => {
		cycleFocus(1);
		expect(getFocusedId()).toBeNull();
	});
});
