import { FastifyInstance } from 'fastify';
import { AccessTokenPayload } from '../interfaces/token.interface';
import { ReplyData } from '../interfaces/reply.interface';

export default async function (fastify: FastifyInstance) {
  const basePath = '/user';

  fastify.get(`${basePath}/logout`, async (request, reply) => {
    const { accessToken, refreshToken } =
      await fastify.services.tokenService.parseTokenPair(request);

    const result = await fastify.services.tokenService.validate({
      accessToken,
      refreshToken,
    });
    if (result === false) {
      const replyData: ReplyData = {
        message: 'Token is invalid',
      };
      reply.code(401).send(replyData);
    }
    const decoded = fastify.jwt.decode<AccessTokenPayload>(accessToken);
    if (decoded === null)
      throw fastify.httpErrors.unauthorized('Token is invalid');
    const logoutResult = await fastify.services.userService.logout(
      decoded.uuidKey,
    );
    if (logoutResult === false) {
      const replyData: ReplyData = {
        message: 'Error logging out',
      };
      reply.code(500).send(replyData);
    } else {
      const replyData: ReplyData = {
        message: 'User logged out',
      };
      reply.code(200).send(replyData);
    }
  });

  fastify.delete(`${basePath}`, async (request, reply) => {
    const { accessToken, refreshToken } =
      await fastify.services.tokenService.parseTokenPair(request);

    const result = await fastify.services.tokenService.validate({
      accessToken,
      refreshToken,
    });
    if (result === false) {
      const replyData: ReplyData = {
        message: 'Token is invalid',
      };
      reply.code(401).send(replyData);
    }
    const decoded = fastify.jwt.decode<AccessTokenPayload>(accessToken);
    if (decoded === null)
      throw fastify.httpErrors.unauthorized('Token is invalid');
    const deleteResult = await fastify.services.userService.deleteUser(
      decoded.uuidKey,
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
