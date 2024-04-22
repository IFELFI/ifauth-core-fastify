import { FastifyTypebox } from '../app';
import { ReplyData } from '../interfaces/reply.interface';
import { codeAuthSchema } from '../schema/auth.schema';

export default async function (fastify: FastifyTypebox) {
  const basePath = '/token';

  fastify.get(`${basePath}/issue`,{
    schema: codeAuthSchema,
    
  }, async (request, reply) => {
    const code = request.query.code
    
  });

  fastify.get(`${basePath}/validate`, async (request, reply) => {
    const { accessToken, refreshToken } =
      await fastify.services.tokenService.parseTokenPair(request);

    const result = await fastify.services.tokenService.validateAndRefresh({
      accessToken,
      refreshToken,
    });

    const replyData: ReplyData = {
      success: true,
      message: 'Token is valid and refreshed',
    };
    reply
      .code(200)
      .setCookie('refresh', result.refreshToken)
      .header('Authorization', `Bearer ${result.accessToken}`)
      .send(replyData);
  });
}
