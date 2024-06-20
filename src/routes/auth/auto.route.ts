import { FastifyTypebox } from '../../app';
import { AuthReplyData, ReplyData } from '../../interfaces/reply.interface';
import { codeAuthSchema } from '../../schema/auth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/auth/auto';

  fastify.get(`${basePath}/verify`, async (request, reply) => {
    const autoLoginCode =
      fastify.services.autoLoginService.parseAutoLoginCode(request);
    const address =
      request.headers['x-forwarded-for']?.toString() || request.ip;

    const { id: userId, code: newAutoCode } =
      await fastify.services.autoLoginService.verifyAutoLoginCode(
        autoLoginCode,
        address,
      );
    reply.setCookie('autoLogin', newAutoCode);

    const authorizationCode =
      await fastify.services.tokenService.issueAuthorizationCode(userId);

    const replyData: AuthReplyData = {
      message: 'Auto login verified',
      code: authorizationCode,
    };
    reply.code(200).send(replyData);
  });

  fastify.get(
    `${basePath}/issue`,
    {
      schema: codeAuthSchema,
    },
    async (request, reply) => {
      const autoAuthCode = request.query.code;
      const address =
        request.headers['x-forwarded-for']?.toString() || request.ip;
      const code = await fastify.services.autoLoginService.issueCode(
        autoAuthCode,
        address,
      );

      const replyData: ReplyData = {
        message: 'Auto login code is issued',
      };

      reply.code(200).setCookie('autoLogin', code).send(replyData);
    },
  );
}
