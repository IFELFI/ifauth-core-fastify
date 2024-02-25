import { FastifyTypebox } from "..";
import { TokenReplyData } from "../interfaces/reply.interface";
import { localSignupSchema } from "../schema/auth.schema";

export default async function (fastify: FastifyTypebox) {

  const basePath = '/auth/local';

  fastify.post(`${basePath}/signup`, {
    schema: localSignupSchema,
  }, async (request, reply) => {
    const result = await fastify.services.localAuthService.signup(request.body);
    const ReplyData: TokenReplyData = {
      success: true,
      message: 'User created',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }
    }
    reply.status(201).send(ReplyData);
  });

  fastify.post(`${basePath}/login`, async (request, reply) => {
  });
}