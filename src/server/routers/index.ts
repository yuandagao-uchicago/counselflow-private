import { router } from "../trpc";
import { studentRouter } from "./student";
import { meetingRouter } from "./meeting";
import { dashboardRouter } from "./dashboard";
import { integrationRouter } from "./integration";
import { milestoneRouter } from "./milestone";
import { reviewRouter } from "./review";

export const appRouter = router({
  student: studentRouter,
  meeting: meetingRouter,
  dashboard: dashboardRouter,
  integration: integrationRouter,
  milestone: milestoneRouter,
  review: reviewRouter,
});

export type AppRouter = typeof appRouter;
