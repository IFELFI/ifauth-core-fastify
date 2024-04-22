import { FastifyTypebox } from '../app';
import { localLoginSchema } from '../schema/auth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/oauth';

  fastify.post(
    `${basePath}/local`,
    {
      schema: localLoginSchema,
    },
    async (request, reply) => {
      const userId = await fastify.services.authLocalService.login(
        request.body,
      );
      const code =
        await fastify.services.tokenService.issueAuthorizationCode(userId);

      reply.send({ code })
    },
  );
}
