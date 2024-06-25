import { FastifyTypebox } from '../app';
import { AuthReplyData, ReplyData } from '../interfaces/reply.interface';
import { codeAuthSchema } from '../schema/auth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/auto';

  fastify.get(`${basePath}/verify`, async (request, reply) => {
    const autoLoginCode =
      fastify.services.autoLoginService.parseAutoLoginCode(request);
    const SSID = fastify.services.userService.parseSSID(request);
    if (!SSID) {
      throw fastify.httpErrors.badRequest('SSID is required');
    }

    const { id: userId, code: newAutoCode } =
      await fastify.services.autoLoginService.verifyAutoLoginCode(
        autoLoginCode,
        SSID,
      );
    const authorizationCode =
      await fastify.services.tokenService.issueAuthorizationCode(userId);

    const replyData: AuthReplyData = {
      message: 'Auto login verified',
      code: authorizationCode,
    };
    reply.setCookie('AUTO', newAutoCode, {
      expires: new Date(
        Date.now() + fastify.config.AUTO_LOGIN_CODE_EXPIRATION * 1000,
      ),
    });
    reply.code(200).send(replyData);
  });

  fastify.get(
    `${basePath}/issue`,
    {
      schema: codeAuthSchema,
    },
    async (request, reply) => {
      const autoAuthCode = request.query.code;
      const SSID = fastify.services.userService.parseSSID(request);

      if (!SSID) {
        throw fastify.httpErrors.badRequest('SSID is required');
      }

      const code = await fastify.services.autoLoginService.issueCode(
        autoAuthCode,
        SSID,
      );

      const replyData: ReplyData = {
        message: 'Auto login code is issued',
      };

      reply
        .code(200)
        .setCookie('AUTO', code, {
          expires: new Date(
            Date.now() + fastify.config.AUTO_LOGIN_CODE_EXPIRATION * 1000,
          ),
        })
        .send(replyData);
    },
  );
}
