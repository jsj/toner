// Global spinner clock — all spinners share one phase.
// Mounting a new spinner picks up the current frame, not frame 0.

const FRAMES = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2807', '\u280f'];
const INTERVAL = 80;

let frameIndex = 0;
let refCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners: Set<() => void> = new Set();

function tick() {
	frameIndex = (frameIndex + 1) % FRAMES.length;
	for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
	listeners.add(fn);
	refCount++;
	if (refCount === 1) {
		timer = setInterval(tick, INTERVAL);
	}
	return () => {
		listeners.delete(fn);
		refCount--;
		if (refCount === 0 && timer) {
			clearInterval(timer);
			timer = null;
		}
	};
}

export function currentFrame(): string {
	return FRAMES[frameIndex];
}

export function currentIndex(): number {
	return frameIndex;
}
