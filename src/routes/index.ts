import { FastifyTypebox } from "..";
import authLocal from "./auth.local.route";

export function registerRoutes(fastify: FastifyTypebox) {
  authLocal(fastify);
}