import "@fastify/jwt";
import { FastifyJwtNamespace } from '@fastify/jwt';

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenPayload | null;
  }
}
export interface AccessTokenPayload {
  uuidKey: string;
  email: string;
  nickname: string;
  imageUrl: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
