import { TokenError } from "fast-jwt";
import { FastifyTypebox } from "..";
import { AccessTokenPayload } from "../interfaces/token.interface";
import { ReplyData } from "../interfaces/reply.interface";

export default async function (fastify: FastifyTypebox) {

  const basePath = '/token';

  fastify.post(`${basePath}/validate`, async (request, reply) => {
    return request.jwtVerify<AccessTokenPayload>()
    .then((decoded) => {
      const access = fastify.jwt.sign(decoded);
      const refresh = fastify.jwt.sign(decoded, { expiresIn: fastify.config.REFRESH_TOKEN_EXPIRATION});
      const replyData: ReplyData = {
        success: true,
        message: 'Token is valid',
        data: {
          accessToken: access,
          refreshToken: refresh,
        }
      }
      return reply.status(200).send(replyData);
    })
    .catch(async (err) => {
      request.jwtVerify<{}>({ onlyCookie: true })
      const decoded = await request.jwtDecode<AccessTokenPayload>();
      
      // add logic
    })
  });

}