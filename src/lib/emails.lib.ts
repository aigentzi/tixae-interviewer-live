import { db } from "@root/server/typedFirestore";
import { Email } from "@root/shared/zod-schemas";
import { batch } from "typesaurus";
import { ServiceError } from "./service-error.lib";

export class EmailsService {
  /**
   * Get all emails from the database
   *
   * @returns
   *    All emails
   */
  static async getEmails(workspaceId: string): Promise<Email[]> {
    try {
      const emails = await db.emails.query(($) =>
        $.field("workspaceId").eq(workspaceId)
      );
      return emails.map((email) => email.data);
    } catch (error) {
      throw new ServiceError(
        "Failed to get emails",
        "[EmailsService::getEmails()]"
      );
    }
  }

  /**
   * Get all emails by interview id from the database
   *
   * @param interviewId
   *    The interview id
   *
   * @returns
   *    All emails by interview id
   */
  static async getEmailsByInterviewId(
    interviewId: string,
    workspaceId: string
  ): Promise<Email[]> {
    try {
      const emails = await db.emails.query(($) => [
        $.field("interviewId").eq(interviewId),
        $.field("workspaceId").eq(workspaceId),
      ]);
      return emails.map((email) => email.data);
    } catch (error) {
      throw new ServiceError(
        `Failed to get emails by interview id: ${interviewId}`,
        "[EmailsService::getEmailsByInterviewId()]"
      );
    }
  }

  /**
   * Get all emails by job profile id from the database
   *
   * @param jobProfileId
   *    The job profile id
   *
   * @returns
   *    All emails by job profile id
   */
  static async getEmailsByJobProfileId(
    jobProfileId: string,
    workspaceId: string
  ): Promise<Email[]> {
    try {
      const emails = await db.emails.query(($) => [
        $.field("jobProfileId").eq(jobProfileId),
        $.field("workspaceId").eq(workspaceId),
      ]);
      return emails.map((email) => email.data);
    } catch (error) {
      throw new ServiceError(
        `Failed to get emails by job profile id: ${jobProfileId}`,
        "[EmailsService::getEmailsByJobProfileId()]"
      );
    }
  }

  /**
   * Get all emails by interview id and job profile id
   *
   * @param interviewId
   *    The interview id
   *
   * @param jobProfileId
   *    The job profile id
   *
   * @returns
   *    All emails that have the given interview id and job profile id
   */
  static async getEmailsWithInterviewAndJobProfile(
    interviewId: string,
    jobProfileId: string,
    workspaceId: string
  ): Promise<Email[]> {
    try {
      const email = await db.emails.query(($) => [
        $.field("interviewId").eq(interviewId),
        $.field("jobProfileId").eq(jobProfileId),
        $.field("workspaceId").eq(workspaceId),
      ]);
      return email.map((email) => email.data);
    } catch (error) {
      throw new ServiceError(
        `Failed to get emails with interview id: ${interviewId} and job profile id: ${jobProfileId}`,
        "[EmailsService::getEmailsWithInterviewAndJobProfile()]"
      );
    }
  }

  /**
   * Get an email by id from the database
   *
   * @param id
   *    The id of the email
   *
   * @returns
   *    The email or undefined if not found
   */
  static async getEmailById(
    id: string,
    workspaceId: string
  ): Promise<Email | undefined> {
    try {
      const email = await db.emails.query(($) => [
        $.field("id").eq(id),
        $.field("workspaceId").eq(workspaceId),
      ]);

      if (email.length === 0) {
        return undefined;
      }

      return email[0].data;
    } catch (error) {
      throw new ServiceError(
        `Failed to get email by id: ${id}`,
        "[EmailsService::getEmailById()]"
      );
    }
  }

  /**
   * Create a new email in the database
   *
   * @param email
   *    The email to create
   *
   * @returns
   *    The id of the created email
   */
  static async createEmail(email: Email): Promise<string> {
    try {
      const newEmail = await db.emails.add(email);

      await db.emails.update(newEmail.id, {
        id: newEmail.id,
      });

      return newEmail.id;
    } catch (error) {
      throw new ServiceError(
        `Failed to create email: ${email}`,
        "[EmailsService::createEmail()]"
      );
    }
  }

  /**
   * Update an email in the database
   *
   * @param email
   *    The email to update
   */
  static async updateEmail(email: Email): Promise<string> {
    try {
      await db.emails.update(email.id!, email);

      return email.id!;
    } catch (error) {
      throw new ServiceError(
        `Failed to update email: ${email}`,
        "[EmailsService::updateEmail()]"
      );
    }
  }

  /**
   * Delete an email from the database
   *
   * @param emailId
   *    The id of the email to delete
   */
  static async deleteEmail(
    emailId: string,
    workspaceId: string
  ): Promise<string> {
    try {
      const email = await db.emails.get(emailId);

      if (!email) {
        throw new ServiceError(
          `Email not found: ${emailId}`,
          "[EmailsService::deleteEmail()]"
        );
      }

      if (email.data.workspaceId !== workspaceId) {
        throw new ServiceError(
          `Email not found: ${emailId} for workspace: ${workspaceId}`,
          "[EmailsService::deleteEmail()]"
        );
      }

      await db.emails.remove(emailId);

      return emailId;
    } catch (error) {
      throw new ServiceError(
        `Failed to delete email: ${emailId}`,
        "[EmailsService::deleteEmail()]"
      );
    }
  }

  /**
   * Bulk create emails in the database
   *
   * @param emails
   *    The emails to create
   */
  static async bulkCreateEmails(
    jobProfileId: string,
    emails: string[],
    workspaceId: string
  ): Promise<string[]> {
    try {
      const $ = batch(db);

      const emailIds: string[] = [];

      for (const email of emails) {
        const id = await db.emails.id();
        emailIds.push(id);
        $.emails.set(id, {
          email,
          jobProfileId,
          workspaceId,
          id,
        });
      }

      await $();

      return emailIds;
    } catch (error) {
      throw new ServiceError(
        `Failed to bulk create emails: ${emails.join(", ")}`,
        "[EmailsService::bulkCreateEmails()]"
      );
    }
  }
}
