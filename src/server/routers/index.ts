import { router } from "../trpc";
import { studentRouter } from "./student";
import { meetingRouter } from "./meeting";
import { dashboardRouter } from "./dashboard";
import { integrationRouter } from "./integration";
import { milestoneRouter } from "./milestone";
import { reviewRouter } from "./review";
import { documentRouter } from "./document";
import { schoolRouter } from "./school";
import { applicationRouter } from "./application";
import { meetingRequestRouter } from "./meetingRequest";
import { publicMeetingRouter } from "./publicMeeting";

export const appRouter = router({
  student: studentRouter,
  meeting: meetingRouter,
  dashboard: dashboardRouter,
  integration: integrationRouter,
  milestone: milestoneRouter,
  review: reviewRouter,
  document: documentRouter,
  school: schoolRouter,
  application: applicationRouter,
  meetingRequest: meetingRequestRouter,
  publicMeeting: publicMeetingRouter,
});

export type AppRouter = typeof appRouter;
