import { Static, Type } from '@sinclair/typebox';
import bcrypt from 'bcrypt';
import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    config: T;
  }
}

const schema = Type.Object({
  // Add your environment variables here
  HOST: Type.String({ default: 'localhost' }),
  PORT: Type.Integer({ minimum: 0, maximum: 65535, default: 3000 }),
  TOKEN_SECRET: Type.String(),
  COOKIE_SECRET: Type.String(),
  ACCESS_TOKEN_EXPIRATION: Type.Integer({ default: 60 * 5 }),
  REFRESH_TOKEN_EXPIRATION: Type.Integer({ default: 60 * 60 * 24 * 3 }),
  DATABASE_URL: Type.String(),
  REDIS_URL: Type.String({ default: 'redis://localhost:6379' }),
  SALT: Type.String({ default: bcrypt.genSaltSync(10) }),
  AUTH_CODE_EXPIRATION: Type.Integer({ default: 60 * 3 }),
});

type T = Static<typeof schema>;

export default schema;
