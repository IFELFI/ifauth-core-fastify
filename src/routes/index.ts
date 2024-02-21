import { FastifyTypebox } from "..";
import authLocal from "./localAuth.route";

export function registerRoutes(fastify: FastifyTypebox) {
  authLocal(fastify);
}