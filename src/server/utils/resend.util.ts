import { Resend } from "resend";
import { db } from "@root/server/firebase";
import moment from "moment";
import emailTemplates from "@root/shared/emails";
import { brandingConfigurationScheme } from "@root/shared/zod-schemas";
import { z } from "zod";
import {
  getEmailTranslations,
  replaceEmailVariables,
} from "@root/lib/emailTranslations";

type BrandingConfig = z.infer<typeof brandingConfigurationScheme>;

// Initialize Resend for email sending
export const resend = new Resend(process.env.RESEND_API_KEY as string);

export async function sendAntiSpamEmail(input: {
  to: string;
  emailTemplate: keyof typeof emailTemplates;
  minutes?: number;
  locals?: { [key: string]: string };
}) {
  // Limit: max 5 emails in the defined time-window
  const WINDOW_MINUTES = input.minutes ?? 60 * 24; // default to 24 hours
  const LIMIT = 5;
  const windowStartTs = moment().subtract(WINDOW_MINUTES, "minutes").unix();

  try {
    // Fetch emails sent to this recipient within the time window
    const recentEmailsSnap = await db
      .collection("email")
      .where("email", "==", input.to)
      .where("ts", ">=", windowStartTs)
      .get();

    const emailsCount = recentEmailsSnap.size;

    if (emailsCount >= LIMIT) {
      const message = `Email limit of ${LIMIT} reached for ${input.to} in the last ${WINDOW_MINUTES} minutes.`;
      console.warn(message);

      if (emailsCount > LIMIT) {
        // Exceeded the limit — escalate by throwing an error
        throw new Error(
          `More than ${LIMIT} emails have been sent to ${input.to} within the last ${WINDOW_MINUTES} minutes.`
        );
      }

      // Exactly at the limit — gracefully exit without sending another email
      return { success: false, reason: "rate-limit-reached" } as const;
    }

    // Safe to send the email
    await resend.emails.send({
      from: process.env.RESEND_MAIN_FROM_EMAIL || "",
      to: input.to,
      subject:
        "[" +
        process.env.BRAND_NAME +
        "] " +
        emailTemplates[input.emailTemplate].subject,
      html: emailTemplates[input.emailTemplate].html(input.locals || {}),
    });

    // Record the email in the database
    await db.collection("email").add({
      email: input.to,
      ts: moment().unix(),
    });

    return { success: true } as const;
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error } as const;
  }
}

export async function sendInterviewInvitation(input: {
  to: string;
  interviewerName: string;
  jobTitle: string;
  workspaceName: string;
  meetingLink: string;
  duration: number;
  startTime?: Date;
  level?: string;
  brandingConfig?: BrandingConfig | null;
  emailTemplate?: {
    subject?: string | null;
    greeting?: string | null;
    introText?: string | null;
    closingText?: string | null;
    buttonText?: string | null;
    preparationTips?: string[] | null;
  } | null;
  language?: string; // User's selected language
}) {
  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  // Extract branding information with fallbacks (avoid mentioning workspace by default)
  const hasCustomBranding = input.brandingConfig?.customBranding;
  const brandLogo = input.brandingConfig?.logo;
  const brandName = input.brandingConfig?.name || "";

  // Get translations for the user's language (or fallback to English)
  const translations = getEmailTranslations(input.language || "en");

  // Extract email template with fallbacks to translations
  const emailSubject = input.emailTemplate?.subject || translations.subject;
  const emailGreeting = input.emailTemplate?.greeting || translations.greeting;
  const emailIntroText =
    input.emailTemplate?.introText || translations.introText;
  const emailClosingText =
    input.emailTemplate?.closingText || translations.closingText;
  const emailButtonText =
    input.emailTemplate?.buttonText || translations.buttonText;
  const emailPreparationTips =
    input.emailTemplate?.preparationTips || translations.preparationTips;

  // Template variables for replacement
  const variables = {
    jobTitle: input.jobTitle,
    workspaceName: input.workspaceName,
    interviewerName: input.interviewerName,
    level: input.level || "",
    duration: input.duration.toString(),
  };

  // Replace variables in template text
  const replaceVariables = (text: string) => {
    return replaceEmailVariables(text, variables);
  };

  const scheduledInfo = input.startTime
    ? `
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e9ecef;">
      <h3 style="color: #333; margin: 0 0 12px 0; font-size: 18px;">📅 ${
        translations.scheduledInterview
      }</h3>
      <p style="margin: 0; color: #666; font-size: 15px;"><strong>${
        translations.dateTime
      }:</strong> ${formatDateTime(input.startTime)}</p>
      <p style="margin: 8px 0 0 0; color: #666; font-size: 15px;"><strong>${
        translations.duration
      }:</strong> ${input.duration} ${translations.minutes}</p>
    </div>
    `
    : `
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e9ecef;">
      <h3 style="color: #333; margin: 0 0 12px 0; font-size: 18px;">⏰ ${
        translations.scheduledInterview
      }</h3>
      <p style="margin: 0; color: #666; font-size: 15px;">${replaceVariables(
        translations.introText
      )}</p>
      <p style="margin: 8px 0 0 0; color: #666; font-size: 15px;"><strong>${
        translations.duration
      }:</strong> ${input.duration} ${translations.minutes}</p>
    </div>
    `;

  // Header section with conditional branding
  const headerSection =
    hasCustomBranding && brandLogo
      ? `
    <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eee;">
      <img src="${brandLogo}" alt="${
          brandName || "Brand"
        } Logo" style="max-height: 80px; max-width: 250px; margin-bottom: 20px;" />
      <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">${
        translations.invitationTitle
      }</h1>
      ${
        brandName
          ? `<p style="color: #666; margin: 12px 0 0 0; font-size: 16px;">${brandName}</p>`
          : ""
      }
    </div>
    `
      : `
    <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eee;">
      <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">${
        translations.invitationTitle
      }</h1>
      ${
        brandName
          ? `<p style="color: #666; margin: 12px 0 0 0; font-size: 16px;">${brandName}</p>`
          : ""
      }
    </div>
    `;

  // Footer section
  const footerSection = `
    <div style="text-align: center; color: #999; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="margin: 0 0 8px 0;">${translations.thankYou}</p>
      <p style="margin: 0;">${translations.needHelp} ${translations.contactUs}.</p>
      <p style="margin: 8px 0 0 0;">${translations.bestRegards}, ${brandName} ${translations.team}</p>
    </div>
    `;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${translations.invitationTitle}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 30px; background-color: #fff;">

      ${headerSection}

      <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); margin-bottom: 20px; border: 1px solid #f0f0f0;">

        <p style="font-size: 17px; margin-bottom: 25px; color: #333;">${emailGreeting}</p>

        <p style="font-size: 17px; margin-bottom: 25px; color: #333; line-height: 1.6;">
          ${replaceVariables(emailIntroText)}
        </p>

        ${scheduledInfo}

        <div style="background-color: #fafafa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e9ecef;">
          <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">📋 ${
            translations.interviewDetails
          }</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600; width: 120px;">${
                translations.position
              }:</td>
              <td style="padding: 8px 0; color: #333;">${input.jobTitle}</td>
            </tr>
            ${
              input.level
                ? `<tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 600;">${translations.level}:</td>
                    <td style="padding: 8px 0; color: #333;">${input.level}</td>
                  </tr>`
                : ""
            }
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: 600;">${
                translations.interviewer
              }:</td>
              <td style="padding: 8px 0; color: #333;">${
                input.interviewerName
              }</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${input.meetingLink}"
             style="background-color: #333; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; border: none; box-shadow: 0 3px 8px rgba(0,0,0,0.15); transition: all 0.2s ease;">
            ${emailButtonText}
          </a>
        </div>

        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e9ecef;">
          <h4 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">💡 ${
            translations.preparationTitle
          }:</h4>
          <ul style="color: #666; margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.7;">
            ${emailPreparationTips.map((tip) => `<li>${tip}</li>`).join("")}
          </ul>
        </div>

        <p style="font-size: 15px; color: #666; margin-top: 30px; text-align: center;">
          ${emailClosingText}
        </p>

      </div>

      ${footerSection}

    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_MAIN_FROM_EMAIL || "",
      to: [input.to],
      subject: replaceVariables(emailSubject),
      html: emailHtml,
    });

    if (error) {
      console.error("Error sending interview invitation:", error);
      return { success: false, error };
    }

    console.log("Interview invitation sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send interview invitation:", error);
    return { success: false, error };
  }
}

// Generate a random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
