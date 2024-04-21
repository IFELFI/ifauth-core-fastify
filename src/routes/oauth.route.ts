import { Type } from '@sinclair/typebox';
import { FastifyTypebox } from '../app';
import { oauthSchema } from '../schema/oauth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/oauth';

  fastify.post(
    `${basePath}/local`,
    {
      schema: oauthSchema,
    },
    async (request, reply) => {
      const userId = await fastify.services.authLocalService.login(
        request.body,
      );
      const code =
        await fastify.services.tokenService.issueAuthorizationCode(userId);
      const redirectUrl = request.query.redirectUrl;

      reply.code(302).redirect(`${redirectUrl}?code=${code}`);
    },
  );
}
