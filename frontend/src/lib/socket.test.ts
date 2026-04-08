import { beforeEach, describe, expect, it, vi } from 'vitest';

const socketMock = {
  connected: false,
  active: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  timeout: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => socketMock),
}));

describe('socket helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    socketMock.connected = false;
    socketMock.active = false;
    socketMock.connect.mockReset();
    socketMock.disconnect.mockReset();
    socketMock.on.mockReset();
    socketMock.off.mockReset();
    socketMock.timeout.mockReset();
  });

  it('connects and disconnects only when needed', async () => {
    const { connectSocket, disconnectSocket } = await import('./socket');

    connectSocket();
    expect(socketMock.connect).toHaveBeenCalledTimes(1);

    socketMock.connected = true;
    connectSocket();
    expect(socketMock.connect).toHaveBeenCalledTimes(1);

    disconnectSocket();
    expect(socketMock.disconnect).toHaveBeenCalledTimes(1);
  });

  it('emits events immediately when already connected', async () => {
    socketMock.connected = true;
    socketMock.timeout.mockReturnValue({
      emit: (_eventName: string, _payload: unknown, callback: (error: unknown, response: unknown) => void) =>
        callback(null, { success: true, data: { ok: true } }),
    });

    const { emitSocketEvent } = await import('./socket');
    const response = await emitSocketEvent('typing:update', { isTyping: true });

    expect(response).toEqual({ success: true, data: { ok: true } });
    expect(socketMock.connect).not.toHaveBeenCalled();
  });

  it('waits for connect before emitting and rejects failed responses', async () => {
    socketMock.timeout.mockReturnValue({
      emit: (_eventName: string, _payload: unknown, callback: (error: unknown, response: unknown) => void) =>
        callback(null, { success: false, message: 'Nope' }),
    });
    socketMock.on.mockImplementation((event: string, handler: () => void) => {
      if (event === 'connect') {
        handler();
      }
    });

    const { emitSocketEvent } = await import('./socket');

    await expect(emitSocketEvent('typing:update', { isTyping: true })).rejects.toThrow('Nope');
    expect(socketMock.connect).toHaveBeenCalled();
  });

  it('rejects when socket acknowledgement returns an error', async () => {
    socketMock.connected = true;
    socketMock.timeout.mockReturnValue({
      emit: (_eventName: string, _payload: unknown, callback: (error: unknown, response: unknown) => void) =>
        callback(new Error('Timed out'), undefined),
    });

    const { emitSocketEvent } = await import('./socket');

    await expect(emitSocketEvent('typing:update', { isTyping: true })).rejects.toThrow('Timed out');
  });
});
