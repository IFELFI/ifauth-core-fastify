import '@fastify/jwt';
import { tags } from 'typia';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayloadData | null;
  }
}
export interface AccessTokenPayloadData {
  uuidKey: string & tags.Format<'uuid'>;
  email: string & tags.Format<'email'>;
  nickname: string & tags.MinLength<4> & tags.MaxLength<36>;
  imageUrl: null | (string & tags.MaxLength<255>);
}

export interface AccessTokenPayload extends AccessTokenPayloadData {
  iat: number;
  exp: number;
  iss: string;
}

export interface RefreshTokenPayload {
  iat: number;
  exp: number;
  iss: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
