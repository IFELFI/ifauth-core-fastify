import { FastifyTypebox } from "..";
import { LocalAuthController } from "../controllers/localAuth.controller";
import { localSignupSchema } from "../schema/auth.schema";

export default async function (fastify: FastifyTypebox) {

  const localAuthController = new LocalAuthController(fastify);

  fastify.post('/auth/signup/local', {
    schema: localSignupSchema,
  }, (req, res) => {

  });
}