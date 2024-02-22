import { localLoginSchema, localSignupSchema } from './../schema/auth.schema';
import { FastifyReplyTypebox, FastifyRequestTypebox, FastifyTypebox } from "..";
import { LocalAuthService } from "../services/localAuth.service";

export class LocalAuthController {
  #localAuthService: LocalAuthService;

  constructor(fastify: FastifyTypebox) {
    this.#localAuthService = new LocalAuthService(fastify);
  }

  public async signup(request: FastifyRequestTypebox<typeof localSignupSchema>, reply: FastifyReplyTypebox<typeof localSignupSchema>) {
    const data = request.body;
    const result = await this.#localAuthService.signup(data);
  }

  public async login(request: FastifyRequestTypebox<typeof localLoginSchema>, reply: FastifyReplyTypebox<typeof localLoginSchema>) {
    const data = request.body;
  }
}