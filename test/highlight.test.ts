import { describe, test, expect } from 'bun:test';
import { highlightSync, resolveLanguage } from '../src/highlight';

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
function stripAnsi(s: string): string {
	return s.replace(ANSI_RE, '');
}

describe('resolveLanguage', () => {
	test('resolves file extensions', () => {
		expect(resolveLanguage('ts')).toBe('typescript');
		expect(resolveLanguage('js')).toBe('javascript');
		expect(resolveLanguage('py')).toBe('python');
		expect(resolveLanguage('rs')).toBe('rust');
		expect(resolveLanguage('go')).toBe('go');
	});

	test('resolves language names', () => {
		expect(resolveLanguage('typescript')).toBe('typescript');
		expect(resolveLanguage('python')).toBe('python');
		expect(resolveLanguage('golang')).toBe('go');
		expect(resolveLanguage('shell')).toBe('bash');
	});

	test('case insensitive', () => {
		expect(resolveLanguage('TypeScript')).toBe('typescript');
		expect(resolveLanguage('PYTHON')).toBe('python');
	});

	test('returns null for unknown', () => {
		expect(resolveLanguage('brainfuck')).toBeNull();
	});
});

describe('highlightSync', () => {
	test('returns lines for unknown language', () => {
		const lines = highlightSync('hello\nworld', 'unknown');
		expect(lines).toEqual(['hello', 'world']);
	});

	test('highlights keywords in typescript', () => {
		const lines = highlightSync('const x = 42;', 'typescript');
		expect(lines.length).toBe(1);
		// Should contain ANSI codes
		expect(lines[0]).not.toBe('const x = 42;');
		// Plain text should be preserved
		expect(stripAnsi(lines[0])).toBe('const x = 42;');
	});

	test('highlights strings', () => {
		const lines = highlightSync('const s = "hello";', 'javascript');
		expect(lines[0]).toContain('\x1b[32m'); // green for strings
	});

	test('highlights comments', () => {
		const lines = highlightSync('// comment', 'typescript');
		expect(lines[0]).toContain('\x1b[90m'); // gray for comments
	});

	test('highlights python keywords', () => {
		const lines = highlightSync('def foo():', 'python');
		expect(stripAnsi(lines[0])).toBe('def foo():');
		expect(lines[0]).toContain('\x1b[35m'); // magenta for keywords
	});

	test('highlights numbers', () => {
		const lines = highlightSync('x = 42', 'javascript');
		expect(lines[0]).toContain('\x1b[33m'); // yellow for numbers
	});

	test('multi-line code', () => {
		const code = 'function hello() {\n  return "world";\n}';
		const lines = highlightSync(code, 'javascript');
		expect(lines.length).toBe(3);
		expect(stripAnsi(lines.join('\n'))).toBe(code);
	});
});
