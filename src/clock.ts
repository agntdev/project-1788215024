/** Single clock seam for timestamped records; tests may override it if needed. */
let current = () => new Date();
export function now(): Date { return current(); }
export function setClockForTest(clock: () => Date): void { current = clock; }
