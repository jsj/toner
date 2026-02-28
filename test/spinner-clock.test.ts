import { describe, test, expect } from 'bun:test';
import { subscribe, currentFrame, currentIndex } from '../src/components/spinner-clock';

describe('spinner-clock', () => {
	test('currentFrame returns a braille character', () => {
		const frame = currentFrame();
		expect(frame.length).toBe(1);
		// Braille characters are in U+2800-U+28FF range
		const code = frame.charCodeAt(0);
		expect(code).toBeGreaterThanOrEqual(0x2800);
		expect(code).toBeLessThanOrEqual(0x28ff);
	});

	test('currentIndex returns a number', () => {
		const idx = currentIndex();
		expect(typeof idx).toBe('number');
		expect(idx).toBeGreaterThanOrEqual(0);
		expect(idx).toBeLessThan(10);
	});

	test('subscribe returns unsubscribe function', () => {
		const unsub = subscribe(() => {});
		expect(typeof unsub).toBe('function');
		unsub();
	});

	test('subscriber fires on tick', async () => {
		let called = 0;
		const unsub = subscribe(() => { called++; });
		await new Promise((r) => setTimeout(r, 200)); // 80ms interval, so ~2 ticks
		unsub();
		expect(called).toBeGreaterThan(0);
	});

	test('multiple subscribers all fire', async () => {
		let a = 0;
		let b = 0;
		const unsub1 = subscribe(() => { a++; });
		const unsub2 = subscribe(() => { b++; });
		await new Promise((r) => setTimeout(r, 200));
		unsub1();
		unsub2();
		expect(a).toBeGreaterThan(0);
		expect(b).toBeGreaterThan(0);
	});

	test('timer stops when all unsubscribed', async () => {
		const unsub = subscribe(() => {});
		unsub();
		const before = currentIndex();
		await new Promise((r) => setTimeout(r, 200));
		const after = currentIndex();
		// Should not have advanced (or only by 1 if there was a race)
		expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
	});
});
