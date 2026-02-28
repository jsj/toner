// Raw stdin key event parser. Supports UTF-8, alt/ctrl combos, CSI sequences.

export interface KeyEvent {
	type:
		| 'char'
		| 'paste'
		| 'enter'
		| 'newline'
		| 'backspace'
		| 'delete'
		| 'left'
		| 'right'
		| 'up'
		| 'down'
		| 'home'
		| 'end'
		| 'page_up'
		| 'page_down'
		| 'word_left'
		| 'word_right'
		| 'word_backspace'
		| 'kill_line'
		| 'kill_to_end'
		| 'clear_line'
		| 'tab'
		| 'shift_tab'
		| 'ctrl_c'
		| 'ctrl_l'
		| 'ctrl_n'
		| 'ctrl_o'
		| 'unknown';
	char?: string;
	text?: string;
}

export function parseKeys(bytes: Uint8Array): KeyEvent[] {
	const events: KeyEvent[] = [];
	let i = 0;

	while (i < bytes.length) {
		const b = bytes[i];

		if (b === 3) { events.push({ type: 'ctrl_c' }); i++; continue; }
		if (b === 1) { events.push({ type: 'home' }); i++; continue; }
		if (b === 5) { events.push({ type: 'end' }); i++; continue; }
		if (b === 21) { events.push({ type: 'clear_line' }); i++; continue; }
		if (b === 11) { events.push({ type: 'kill_to_end' }); i++; continue; }
		if (b === 23) { events.push({ type: 'word_backspace' }); i++; continue; }
		if (b === 12) { events.push({ type: 'ctrl_l' }); i++; continue; }
		if (b === 14) { events.push({ type: 'ctrl_n' }); i++; continue; }
		if (b === 15) { events.push({ type: 'ctrl_o' }); i++; continue; }
		if (b === 9) { events.push({ type: 'tab' }); i++; continue; }
		if (b === 13) { events.push({ type: 'enter' }); i++; continue; }
		if (b === 127 || b === 8) { events.push({ type: 'backspace' }); i++; continue; }

		if (b === 27) {
			if (i + 1 < bytes.length && bytes[i + 1] === 13) {
				events.push({ type: 'newline' });
				i += 2;
				continue;
			}

			if (i + 1 < bytes.length && bytes[i + 1] >= 32 && bytes[i + 1] < 127 && !(bytes[i + 1] === 91)) {
				const ch = bytes[i + 1];
				i += 2;
				if (ch === 98) { events.push({ type: 'word_left' }); continue; }
				if (ch === 102) { events.push({ type: 'word_right' }); continue; }
				if (ch === 127) { events.push({ type: 'word_backspace' }); continue; }
				continue;
			}

			if (i + 1 < bytes.length && bytes[i + 1] === 127) {
				events.push({ type: 'word_backspace' });
				i += 2;
				continue;
			}

			if (i + 1 < bytes.length && bytes[i + 1] === 91) {
				i += 2;
				if (i >= bytes.length) { events.push({ type: 'unknown' }); continue; }

				const code = bytes[i];

				if (code === 90) { events.push({ type: 'shift_tab' }); i++; continue; }
				if (code === 65) { events.push({ type: 'up' }); i++; continue; }
				if (code === 66) { events.push({ type: 'down' }); i++; continue; }
				if (code === 67) { events.push({ type: 'right' }); i++; continue; }
				if (code === 68) { events.push({ type: 'left' }); i++; continue; }
				if (code === 72) { events.push({ type: 'home' }); i++; continue; }
				if (code === 70) { events.push({ type: 'end' }); i++; continue; }

				if (code === 49 && i + 2 < bytes.length && bytes[i + 1] === 59) {
					const mod = bytes[i + 2];
					if (i + 3 < bytes.length) {
						const dir = bytes[i + 3];
						i += 4;
						if ((mod === 53 || mod === 51) && dir === 67) { events.push({ type: 'word_right' }); continue; }
						if ((mod === 53 || mod === 51) && dir === 68) { events.push({ type: 'word_left' }); continue; }
						continue;
					}
				}

				if (code === 51 && i + 1 < bytes.length && bytes[i + 1] === 126) { events.push({ type: 'delete' }); i += 2; continue; }
				if (code === 53 && i + 1 < bytes.length && bytes[i + 1] === 126) { events.push({ type: 'page_up' }); i += 2; continue; }
				if (code === 54 && i + 1 < bytes.length && bytes[i + 1] === 126) { events.push({ type: 'page_down' }); i += 2; continue; }

				while (i < bytes.length && bytes[i] >= 0x20 && bytes[i] <= 0x3f) i++;
				if (i < bytes.length) i++;
				continue;
			}

			i++;
			continue;
		}

		if (b >= 0xc0) {
			let len = 1;
			if ((b & 0xe0) === 0xc0) len = 2;
			else if ((b & 0xf0) === 0xe0) len = 3;
			else if ((b & 0xf8) === 0xf0) len = 4;

			if (i + len <= bytes.length) {
				const char = new TextDecoder().decode(bytes.slice(i, i + len));
				events.push({ type: 'char', char });
				i += len;
				continue;
			}
		}

		if (b >= 32 && b < 127) {
			events.push({ type: 'char', char: String.fromCharCode(b) });
			i++;
			continue;
		}

		i++;
	}

	if (events.length > 8 && events.every((e) => e.type === 'char')) {
		const text = events.map((e) => e.char).join('');
		return [{ type: 'paste', text }];
	}

	return events;
}

export function enterRawMode() {
	Bun.spawnSync(['stty', 'raw', '-echo'], { stdin: 'inherit' });
}

export function exitRawMode() {
	Bun.spawnSync(['stty', 'sane'], { stdin: 'inherit' });
}
