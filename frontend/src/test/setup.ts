import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// // Mock scrollIntoView globally (used in MessageList)
// window.HTMLElement.prototype.scrollIntoView = vi.fn();

Object.defineProperty(globalThis.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => {},
});
