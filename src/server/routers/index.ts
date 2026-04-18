import { router } from "../trpc";
import { studentRouter } from "./student";
import { meetingRouter } from "./meeting";

export const appRouter = router({
  student: studentRouter,
  meeting: meetingRouter,
});

export type AppRouter = typeof appRouter;
