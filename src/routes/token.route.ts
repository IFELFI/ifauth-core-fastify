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

  fastify.get(`${basePath}/valid`, async (request, reply) => {
    const accessToken = request.headers.authorization?.split(' ')[1];

    if (accessToken === undefined) {
      throw fastify.httpErrors.unauthorized('Access token is required');
    }

    const result =
      await fastify.services.tokenService.verifyAccessToken(accessToken);

    if (result.valid === true) {
      const replyData: ReplyData = {
        message: 'Token is valid',
      };
      reply.code(200).send(replyData);
    } else if (result.valid === false && result.payload !== null) {
      const replyData: ReplyData = {
        message: 'Token is expired',
      };
      reply.code(401).send(replyData);
    } else {
      throw fastify.httpErrors.unauthorized('Access token is invalid');
    }
  });

  fastify.get(`${basePath}/refresh`, async (request, reply) => {
    let { accessToken, refreshToken } =
      fastify.services.tokenService.parseTokenPair(request);

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
