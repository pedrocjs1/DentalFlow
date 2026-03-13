import type { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../errors/app-error.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
}
