import { Type } from '@sinclair/typebox';
import { FastifyTypebox } from '../app';
import { oauthSchema } from '../schema/oauth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/oauth';

  fastify.get(
    `${basePath}/health`,
    {
      schema: {
        querystring: Type.Object({
          code: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      const code = request.query.code;
      if (!code) {
        reply.send('Invalid code');
        return;
      }
      reply.send(code);
    },
  );

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

      const testData = await fetch(
        'test'
      );
      reply.send(testData.body);

      reply.code(302).redirect(`${redirectUrl}?code=${code}`);
    },
  );
}
