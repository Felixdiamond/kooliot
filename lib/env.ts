import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(16),
  CLOUD_SOLAR_API_KEY: z.string().min(1),
  INNOVEX_API_TOKEN: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  TASK_ASSIGNMENT_API_KEY: z.string().min(16).optional(),
});

export const env = EnvSchema.parse(process.env);
