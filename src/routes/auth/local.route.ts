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

      if (request.body.autoLogin) {
        const addr =
          request.headers['x-forwarded-for']?.toString() || request.ip;
        fastify.log.info(`Auto login request from ${addr}`);
        const autoLoginCode =
          await fastify.services.autoLoginService.issueAutoLoginCode(
            userId,
            addr,
          );
        reply.setCookie('autoLogin', autoLoginCode);
      }

      const replyData: AuthReplyData = {
        message: 'User logged in',
        code: code,
      };
      reply.code(200).send(replyData);
    },
  );
}
