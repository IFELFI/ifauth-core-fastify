import { FastifyInstance } from "fastify";
import { AccessTokenPayload } from "../interfaces/token.interface";
import { ReplyData } from "../interfaces/reply.interface";

export default async function (fastify: FastifyInstance) {

  const basePath = '/user';

  fastify.post(`${basePath}/logout`, async (request, reply) => {
    const accessToken = request.headers.authorization?.split(' ')[1] ?? '';
    const refreshToken = request.cookies.refresh ?? '';
    const result = await fastify.services.tokenService.validate({ accessToken, refreshToken })
    if (result === false) {
      const replyData: ReplyData = {
        success: false,
        message: 'Token is invalid',
      }
      reply.code(401).send(replyData);
    }
    const decoded = fastify.jwt.decode<AccessTokenPayload>(accessToken);
    if (decoded === null) throw fastify.httpErrors.unauthorized("Token is invalid");
    const logoutResult = await fastify.services.userService.logout(decoded.uuidKey);
    if (logoutResult === false) {
      const replyData: ReplyData = {
        success: false,
        message: 'Error logging out',
      }
      reply.code(500).send(replyData);
    } else {
      const replyData: ReplyData = {
        success: true,
        message: 'User logged out',
      }
      reply.code(200).send(replyData);
    }
  });
}