import { describe, expect, it, vi } from 'vitest';
import { formatConversationListTime } from './chat';

describe('formatConversationListTime', () => {
  it('returns now for explicit now values', () => {
    expect(formatConversationListTime('now')).toBe('now');
  });

  it('returns now for timestamps within the last minute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T10:00:30.000Z'));

    expect(formatConversationListTime('2026-03-24T10:00:00.000Z')).toBe('now');

    vi.useRealTimers();
  });

  it('returns a formatted time for older timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T10:05:00.000Z'));

    expect(formatConversationListTime('2026-03-24T10:00:00.000Z')).not.toBe('now');

    vi.useRealTimers();
  });

  it('preserves non-date strings', () => {
    expect(formatConversationListTime('Tue')).toBe('Tue');
  });
});
