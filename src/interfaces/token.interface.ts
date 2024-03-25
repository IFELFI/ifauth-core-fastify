import '@fastify/jwt';

declare module '@fastify/jwt' {
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

export function isAccessTokenPayload(
  payload: any,
): payload is AccessTokenPayload {
  return (
    typeof payload.uuidKey === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.nickname === 'string' &&
    (typeof payload.imageUrl === 'string' || payload.imageUrl === null)
  );
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
