import { FastifyTypebox } from "..";
import { localSignupSchema } from "../schema/auth.schema";

export default async function (fastify: FastifyTypebox) {

  const basePath = '/auth/local';

  fastify.get(`${basePath}/helloworld`, async (request, reply) => {
    reply.send({ hello: 'world' });
  });

  fastify.post(`${basePath}/signup`, {
    schema: localSignupSchema,
  }, async (request, reply) => {
    const result = await fastify.services.localAuthService.signup(request.body);
    reply.status(201).send({
      data: {
        uuidKey: result.uuid_key,
      }
    });
  });
}