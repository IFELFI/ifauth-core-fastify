import { FastifyTypebox } from '../../app';
import { AuthReplyData } from '../../interfaces/reply.interface';
import { localLoginSchema, localSignupSchema } from '../../schema/auth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/auth/local';

  /**
   * Disable signup for now
   * This method needs more validation and security
   */
  fastify.post(
    `${basePath}/signup`,
    {
      schema: localSignupSchema,
    },
    async (request, reply) => {
      reply.forbidden('Signup is disabled for now.');
      // const userId = await fastify.services.authLocalService.signup(
      //   request.body,
      // );
      // const code =
      //   await fastify.services.tokenService.issueAuthorizationCode(userId);

      // const replyData: AuthReplyData = {
      //   message: 'User created',
      //   code: code,
      // };
      // reply.code(201).send(replyData);
    },
  );

  fastify.post(
    `${basePath}/login`,
    {
      schema: localLoginSchema,
    },
    async (request, reply) => {
      const userId = await fastify.services.authLocalService.login(
        request.body,
      );
      const code =
        await fastify.services.tokenService.issueAuthorizationCode(userId);

      let replyData: AuthReplyData = {
        message: 'User logged in',
        code: code,
      };
      if (request.body.auto) {
        const autoAuthCode =
          await fastify.services.autoLoginService.issueAuthorizationCode(
            userId,
          );
        replyData.autoAuthCode = autoAuthCode;
      }

      const SSID = fastify.services.userService.parseSSID(request);
      const verifySSID = await fastify.services.userService.verifySSID(
        userId,
        SSID,
      );
      if (!verifySSID) {
        const newSSID = await fastify.services.userService.issueSSID(userId);
        reply.setCookie('SSID', newSSID, {
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      }

      reply.code(200).send(replyData);
    },
  );
}
