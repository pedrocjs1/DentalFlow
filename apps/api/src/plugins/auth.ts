import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";

export async function authPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "change-me-in-production",
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    },
  });
}
