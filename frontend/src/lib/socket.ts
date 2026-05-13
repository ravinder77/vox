import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

type SocketAckResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

function getSocketUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

export const socket = io(getSocketUrl(), {
  autoConnect: false,
  transports: ['websocket'],
  withCredentials: true,
});

export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socket.connected || socket.active) {
    socket.disconnect();
  }
}

function waitForSocketConnection() {
  if (socket.connected) {
    return Promise.resolve<void>(undefined);
  }

  connectSocket();

  return new Promise<void>((resolve, reject) => {
    function handleConnect() {
      cleanup();
      resolve(undefined);
    }

    function handleError(error: Error) {
      cleanup();
      reject(error);
    }

    function cleanup() {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleError);
    }

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleError);
  });
}

export async function emitSocketEvent<T>(eventName: string, payload: unknown): Promise<SocketAckResponse<T>> {
  await waitForSocketConnection();

  return new Promise<SocketAckResponse<T>>((resolve, reject) => {
    socket.timeout(5000).emit(eventName, payload, (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      if (!response?.success) {
        reject(new Error(response?.message || 'Realtime request failed'));
        return;
      }

      resolve(response);
    });
  });
}
