import { router } from "../trpc";
import { studentRouter } from "./student";
import { meetingRouter } from "./meeting";
import { dashboardRouter } from "./dashboard";
import { integrationRouter } from "./integration";

export const appRouter = router({
  student: studentRouter,
  meeting: meetingRouter,
  dashboard: dashboardRouter,
  integration: integrationRouter,
});

export type AppRouter = typeof appRouter;
