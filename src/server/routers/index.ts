import { router } from "../trpc";
import { studentRouter } from "./student";

export const appRouter = router({
  student: studentRouter,
});

export type AppRouter = typeof appRouter;
