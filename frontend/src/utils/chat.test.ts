import { describe, expect, it, vi } from 'vitest';
import {
  formatConversationListTime,
  formatNow,
  getLocalTimeLabel,
  getStatusClass,
  getStatusLabel,
} from './chat';

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

  it('returns empty text for blank values', () => {
    expect(formatConversationListTime('   ')).toBe('');
  });
});

describe('chat helpers', () => {
  it('returns status labels and classes', () => {
    expect(getStatusLabel('online')).toBe('Online now');
    expect(getStatusLabel('away')).toBe('Away');
    expect(getStatusLabel('offline')).toBe('Offline');
    expect(getStatusClass('online')).toBe('online');
    expect(getStatusClass('away')).toBe('away');
    expect(getStatusClass('offline')).toBe('offline');
  });

  it('formats current times and local time labels', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T10:05:00.000Z'));

    expect(formatNow()).toMatch(/^\d{2}:\d{2}/);
    expect(getLocalTimeLabel()).toMatch(/PST$/);

    vi.useRealTimers();
  });
});
