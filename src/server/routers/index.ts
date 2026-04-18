import { router } from "../trpc";
import { studentRouter } from "./student";
import { meetingRouter } from "./meeting";
import { dashboardRouter } from "./dashboard";

export const appRouter = router({
  student: studentRouter,
  meeting: meetingRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
