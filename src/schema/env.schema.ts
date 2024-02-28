import { Static, Type } from "@sinclair/typebox";
import 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    config: T
  }
}

const schema = Type.Object({
  // Add your environment variables here
  PORT: Type.Integer({ minimum: 0, maximum: 65535, default: 3000 }),
  TOKEN_SECRET: Type.String(),
  COOKIE_SECRET: Type.String(),
  ACCESS_TOKEN_EXPIRATION: Type.String({ default: "5m" }), 
  REFRESH_TOKEN_EXPIRATION: Type.String({ default: "1d" }),
  DATABASE_URL: Type.String(),
  REDIS_HOST: Type.String({ default: "localhost" }),
  REDIS_PORT: Type.Integer({ minimum: 0, maximum: 65535, default: 6379 }),
  API_URI: Type.String({ default: "/ifauth" }),
})

type T = Static<typeof schema>

export default schema;