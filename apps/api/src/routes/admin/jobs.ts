import type { FastifyInstance } from "fastify";
import { adminMiddleware } from "../../middleware/admin-middleware.js";
import { getJobStatuses } from "../../jobs/scheduler.js";

export async function adminJobRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/admin/jobs/status", {
    preHandler: [adminMiddleware],
    handler: async () => {
      const jobs = getJobStatuses();
      return {
        redis: jobs.length > 0,
        jobs,
      };
    },
  });
}
