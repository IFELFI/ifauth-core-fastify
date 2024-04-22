import { FastifyTypebox } from '../../app';
import { ReplyData } from '../../interfaces/reply.interface';
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
      const { accessToken, refreshToken } =
        await fastify.services.tokenService.issueTokenPairByUserId(userId);
      const replyData: ReplyData = {
        success: true,
        message: 'User created',
      };
      reply
        .code(201)
        .setCookie('refresh', refreshToken)
        .header('Authorization', `Bearer ${accessToken}`)
        .send(replyData);
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
      const { accessToken, refreshToken } =
        await fastify.services.tokenService.issueTokenPairByUserId(userId);
      const replyData: ReplyData = {
        success: true,
        message: 'User logged in',
      };
      reply
        .code(200)
        .setCookie('refresh', refreshToken)
        .header('Authorization', `Bearer ${accessToken}`)
        .send(replyData);
    },
  );
}
