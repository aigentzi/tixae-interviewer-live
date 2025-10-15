import { getAppUrl } from "./utils";

const emailTemplates: {
  [key: string]: {
    subject: string;
    html: (locals: { [key: string]: string }) => string;
  };
} = {
  welcome: {
    subject: "Welcome to our platform",
    html: (locals: { [key: string]: string }) => `
    <p>Welcome to our platform, ${locals.name}!</p>
    `,
  },
  requestOTP: {
    subject: "Your Authentication Code",
    html: (locals: { [key: string]: string }) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Your Authentication Code</h1>
      <p>Use the following code to sign in:</p>
      <div style="background-color: #f4f4f4; padding: 24px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">${locals.otp}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
    </div>
    `,
  },
  invoicePaid: {
    subject: "Your invoice has been paid successfully",
    html: (locals: { [key: string]: string }) => `
    <p>Your invoice has been paid successfully for ${locals.why}.</p>
    <p>You can view the invoice <a href="${locals.invoicePermanentLink
      }">here</a>.</p>
    <p>If you have any questions, please contact us at ${locals.brandEmail || "interviewer.support@tixae.ai"
      }.</p>
    `,
  },
  interviewCreated: {
    subject: "Interview Created With Tixae Interview",
    html: (locals: {
      [key: string]: string;
    }) => `You have created an interview for ${locals.jobProfileName} with ${locals.workspaceName
    }.
            Room Link: ${getAppUrl()}/meeting/room/${locals.interviewId}`,
  },
  workspaceInvitation: {
    subject: "You have been invited to a workspace",
    html: (locals: { [key: string]: string }) => `
    <p>You have been invited to a workspace by ${locals.workspaceOwner}.</p>
    <p>Please login to your account to accept the invitation.</p>
    <p>Workspace Name: ${locals.workspaceName}</p>
    <a href="${locals.workspaceUrl}" target="_blank">
      <button
        style="
          background-color: #007bff;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          text-decoration: none;
          display: inline-block;
          margin-top: 20px;
        "
      >
        Accept Invitation
      </button>
    </a>`,
  },
};

export default emailTemplates;
