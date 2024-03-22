import { FastifyInstance } from "fastify";
import { AccessTokenPayload } from "../interfaces/token.interface";
import { ReplyData } from "../interfaces/reply.interface";

export default async function (fastify: FastifyInstance) {

  const basePath = '/user';

  fastify.get(`${basePath}/logout`, async (request, reply) => {
    const accessToken = request.headers.authorization?.split(' ')[1];
    const unsignedRefreshCookie = request.unsignCookie(request.cookies.refresh ?? '');
    const refreshToken = unsignedRefreshCookie.value;

    if (accessToken === undefined) throw fastify.httpErrors.unauthorized("Access token is required");
    if (refreshToken === null) throw fastify.httpErrors.unauthorized("Refresh token is required");

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