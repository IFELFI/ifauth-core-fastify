import { FastifyTypebox } from "..";
import { signupSchema } from "../schema/auth.local.schema";

const baseUri = '/auth/local'

export default async function (fastify: FastifyTypebox) {
  fastify.post(baseUri + '/signup', {
    schema: signupSchema,
  }, (request, reply) => {
    reply.send({ message: 'Signup' })
  })
}