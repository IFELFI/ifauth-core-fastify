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
    let { accessToken, refreshToken } =
      await fastify.services.tokenService.parseTokenPair(request);
    
    const { valid, payload } = await fastify.services.tokenService.verify({
      accessToken,
      refreshToken,
    });

    if (!valid) {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await fastify.services.tokenService.refresh(payload);
      const replyData: ReplyData = {
        message: 'Token is refreshed',
      };

      reply
        .code(200)
        .setCookie('refresh', newRefreshToken)
        .header('Authorization', `Bearer ${newAccessToken}`)
        .send(replyData);
    }

    const replyData: ReplyData = {
      message: 'Token is valid',
    };

    reply
      .code(200)
      .setCookie('refresh', refreshToken)
      .header('Authorization', `Bearer ${accessToken}`)
      .send(replyData);
  });
}
