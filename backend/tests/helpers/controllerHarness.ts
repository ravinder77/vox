import { jest } from '@jest/globals';

export function createMockResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status: jest.fn((code: number) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload: unknown) => {
      response.body = payload;
      return response;
    }),
    cookie: jest.fn(() => response),
    clearCookie: jest.fn(() => response),
    set: jest.fn(() => response),
  };

  return response;
}

export async function flushAsyncHandler() {
  await new Promise((resolve) => setImmediate(resolve));
}
