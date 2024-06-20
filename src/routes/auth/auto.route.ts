import { FastifyTypebox } from '../../app';
import { AuthReplyData } from '../../interfaces/reply.interface';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/auth/auto';

  fastify.get(`${basePath}/verify`, async (request, reply) => {
    const autoLoginCode =
      fastify.services.autoLoginService.parseAutoLoginCode(request);
    const address =
      request.headers['x-forwarded-for']?.toString() || request.ip;

    const newAutoLoginCode =
      await fastify.services.autoLoginService.verifyAutoLoginCode(
        autoLoginCode,
        address,
      );

    const replyData: AuthReplyData = {
      message: 'Auto login verified',
      code: newAutoLoginCode,
    };
    reply.code(200).send(replyData);
  });
}
