import { FastifyTypebox } from '../../app';
import { AuthReplyData, ReplyData } from '../../interfaces/reply.interface';
import { localLoginSchema, localSignupSchema } from '../../schema/auth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/auth/local';

  fastify.post(
    `${basePath}/signup`,
    {
      schema: localSignupSchema,
    },
    async (request, reply) => {
      const userId = await fastify.services.authLocalService.signup(
        request.body,
      );
      const code =
        await fastify.services.tokenService.issueAuthorizationCode(userId);

      const replyData: AuthReplyData = {
        message: 'User created',
        code: code,
      };
      reply.code(201).send(replyData);
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

      const replyData: AuthReplyData = {
        message: 'User logged in',
        code: code,
      };
      reply
        .code(200)
        .send(replyData);
    },
  );
}
