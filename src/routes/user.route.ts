import { FastifyInstance } from 'fastify';
import { ReplyData } from '../interfaces/reply.interface';

export default async function (fastify: FastifyInstance) {
  const basePath = '/user';

  fastify.get(`${basePath}/profile`, async (request, reply) => {
    const accessToken = request.headers.authorization?.split(' ')[1];
    if (accessToken === undefined)
      throw fastify.httpErrors.unauthorized('Access token is required');

    const { valid, payload } =
      await fastify.services.tokenService.verifyAccessToken(accessToken);

    if (!valid && payload !== null)
      throw fastify.httpErrors.unauthorized(
        'Access token needs to be refreshed',
      );

    if (payload === null)
      throw fastify.httpErrors.unauthorized(
        'Access token needs to be refreshed',
      );

    const profile = await fastify.services.userService.getProfile(
      payload.uuidKey,
    );

    const replyData: ReplyData = {
      message: 'User profile found',
      data: profile,
    };
    reply.code(200).send(replyData);
  });

  fastify.get(`${basePath}/logout`, async (request, reply) => {
    const accessToken = request.headers.authorization?.split(' ')[1];
    if (accessToken) {
      const { valid, payload } =
        await fastify.services.tokenService.verifyAccessToken(accessToken)
      if (valid && payload) {
        await fastify.services.userService.logout(payload.uuidKey);
      }
    }

    const autoCode =
      fastify.services.autoLoginService.parseAutoLoginCode(request);
    if (autoCode) {
      await fastify.services.autoLoginService.deleteAutoLoginCode(autoCode);
    }

    const replyData: ReplyData = {
      message: 'User logged out',
    };
    reply.setCookie('REF', '', { expires: new Date(0) });
    reply.setCookie('AUTO', '', { expires: new Date(0) });
    reply.code(200).send(replyData);
  });

  fastify.delete(`${basePath}`, async (request, reply) => {
    const accessToken = request.headers.authorization?.split(' ')[1];
    if (accessToken === undefined)
      throw fastify.httpErrors.unauthorized('Access token is required');

    const { valid, payload } =
      await fastify.services.tokenService.verifyAccessToken(accessToken);

    if (!valid && payload !== null)
      throw fastify.httpErrors.unauthorized(
        'Access token needs to be refreshed',
      );

    if (payload === null)
      throw fastify.httpErrors.unauthorized('Access token is invalid error');

    const deleteResult = await fastify.services.userService.deleteUser(
      payload.uuidKey,
    );
    if (deleteResult === false) {
      const replyData: ReplyData = {
        message: 'Error deleting user',
      };
      reply.code(500).send(replyData);
    } else {
      const replyData: ReplyData = {
        message: 'User deleted',
      };
      reply.code(200).send(replyData);
    }
  });
}
