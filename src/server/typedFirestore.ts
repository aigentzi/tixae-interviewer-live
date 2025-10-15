import {
  Interview,
  JobProfile,
  Email,
  User,
  Workspace,
  StripeOrderModel,
  AdminSettingsType,
  QrInterview,
  ApplicantType,
  KYCSession,
} from "@root/shared/zod-schemas";
import { schema, Typesaurus } from "typesaurus";
import { User as FirebaseUser } from "firebase/auth";

// import * as admin from "firebase-admin";

// // Because of hot-reloading, this file is executed multiple times by Next.js
// if (!admin.apps.length)
//   admin.initializeApp({
//     // If GOOGLE_APPLICATION_CREDENTIALS_JSON is set, use it to initialize the
//     // admin SDK.
//     ...(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && {
//       credential: admin.credential.cert(
//         JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
//       ),
//     }),
//   });

// // Export the admin client, so you can use it
// export { admin };

// Generate the db object from given schema that you can use to access
// Firestore, i.e.:
//   await db.get(userId)
export const db = schema(($) => ({
  users: $.collection<User, string>(),
  workspaces: $.collection<Workspace, string>(),
  jobProfiles: $.collection<JobProfile, string>(),
  interviews: $.collection<Interview, string>(),
  qrInterviews: $.collection<QrInterview, string>(),
  emails: $.collection<Email, string>(),
  orders: $.collection<StripeOrderModel, string>(),
  adminSettings: $.collection<AdminSettingsType, string>(),
  applicants: $.collection<ApplicantType, string>(),
  kycSessions: $.collection<KYCSession, string>(),
}));

// Infer schema type helper with shortcuts to types in your database:
//   function getUser(id: Schema["users"]["Id"]): Schema["users"]["Result"]
export type Schema = Typesaurus.Schema<typeof db>;

// Your model types:
