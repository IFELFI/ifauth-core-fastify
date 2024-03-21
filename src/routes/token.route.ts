import { FastifyTypebox } from "../app";
import { ReplyData } from "../interfaces/reply.interface";

export default async function (fastify: FastifyTypebox) {

  const basePath = '/token';

  fastify.post(`${basePath}/validate`, async (request, reply) => {
    const accessToken = request.headers.authorization?.split(' ')[1];
    const unsignedRefreshCookie = request.unsignCookie(request.cookies.refresh ?? '');
    const refreshToken = unsignedRefreshCookie.value;

    if (accessToken === undefined) throw fastify.httpErrors.unauthorized("Access token is required");
    if (refreshToken === null) throw fastify.httpErrors.unauthorized("Refresh token is required");

    const result = await fastify.services.tokenService.validateAndRefresh({ accessToken, refreshToken });

    const replyData: ReplyData = {
      success: true,
      message: 'Token is valid and refreshed',
    }

    reply.code(200)
      .setCookie('refresh', result.refreshToken)
      .header('Authorization', `Bearer ${result.accessToken}`)
      .send(replyData);
  });
}