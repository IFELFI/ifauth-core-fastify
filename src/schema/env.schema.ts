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
})

type T = Static<typeof schema>

export default schema;