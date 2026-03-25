import type { User } from '@prisma/client';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { Request } from 'express';

export type AuthUser = User;

export type ApiRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> = Request<P, ResBody, ReqBody, ReqQuery> & {
  authUser?: AuthUser;
};
