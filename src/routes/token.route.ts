import { FastifyTypebox } from '../app';
import { ReplyData } from '../interfaces/reply.interface';
import { codeAuthSchema } from '../schema/auth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/token';

  fastify.get(
    `${basePath}/issue`,
    {
      schema: codeAuthSchema,
    },
    async (request, reply) => {
      const code = request.query.code;

      const { accessToken, refreshToken } =
        await fastify.services.tokenService.issueTokenPairByAuthCode(code);

      const replyData: ReplyData = {
        message: 'Token is issued',
      };

      reply
        .code(200)
        .setCookie('refresh', refreshToken)
        .header('Authorization', `Bearer ${accessToken}`)
        .send(replyData);
    },
  );

  fastify.get(`${basePath}/refresh`, async (request, reply) => {
    const { accessToken, refreshToken } =
      await fastify.services.tokenService.parseTokenPair(request);

    const result = await fastify.services.tokenService.validateOrRefresh({
      accessToken,
      refreshToken,
    });

    const replyData: ReplyData = {
      message: 'Token is refreshed',
    };

    reply
      .code(200)
      .setCookie('refresh', result.refreshToken)
      .header('Authorization', `Bearer ${result.accessToken}`)
      .send(replyData);
  });
}
