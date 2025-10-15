import { createTRPCRouter } from "@root/trpc/trpc";
import { authRouter } from "./routers/auth.route";
import { workspaceRouter } from "./routers/workspace.route";
import { dailyCoRouter } from "./routers/daily.route";
import { jobProfilesRouter } from "./routers/jobProfiles.route";
import { interviewsRouter } from "./routers/interviews.route";
import { emailsRouter } from "./routers/emails.route";
import { stripeRouter } from "./routers/stripe.route";
import { tixaeRouter } from "./routers/tixae.route";
import { adminRouter } from "./routers/admin.route";
import { qrInterviewsRouter } from "./routers/qr-interviews.route";
import { applicantRouter } from "./routers/applicant.route";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  workspace: workspaceRouter,
  daily: dailyCoRouter,
  jobProfiles: jobProfilesRouter,
  interviews: interviewsRouter,
  qrInterviews: qrInterviewsRouter,
  emails: emailsRouter,
  stripe: stripeRouter,
  tixae: tixaeRouter,
  admin: adminRouter,
  applicants: applicantRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
