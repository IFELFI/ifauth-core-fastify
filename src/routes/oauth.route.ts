import { FastifyTypebox } from '../app';
import { ReplyData } from '../interfaces/reply.interface';
import { oauthSchema } from '../schema/oauth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/oauth';

  fastify.post(
    `${basePath}/local`,
    {
      schema: oauthSchema,
    },
    async (request, reply) => {
      const result = await fastify.services.authLocalService.login(
        request.body,
      );
      const redirectUrl = request.query.redirectUrl;
      const replyData: ReplyData = {
        success: true,
        message: 'User logged in',
      };
    },
  );
}
