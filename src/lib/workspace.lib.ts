import { createId } from "@paralleldrive/cuid2";
import { db } from "@root/server/typedFirestore";
import { tixae } from "./tixae.lib";
import { AdminService } from "./admin.lib";

class Workspace {
  public async createWorkspace(input: {
    name: string;
    ownerId: string;
    email: string;
    stripeCustomerId?: string;
  }) {
    try {
      const now = new Date();

      console.log(`Starting workspace creation for user ${input.ownerId}`);

      // Create Tixae agent
      console.log("Creating Tixae agent...");
      const adminSettings = await AdminService.getAdminSettings();

      const selectedVoiceProfile =
        adminSettings.voiceProfiles.find(
          (profile) => profile.id === "default"
        ) || adminSettings.voiceProfiles[0];

      if (!selectedVoiceProfile) {
        throw new Error("No voice profile available in admin settings");
      }

      const tixaeAgent = await tixae.createAgent({
        title: input.name,
        description: input.name,
        globalPrompts: adminSettings.globalPrompts,
        greetingMessage: adminSettings.greetingMessage,
        voiceProfile: selectedVoiceProfile,
      });

      if (!tixaeAgent?.data?.ID) {
        throw new Error("Failed to create Tixae agent - no agent ID returned");
      }

      console.log(`Tixae agent created with ID: ${tixaeAgent.data.ID}`);

      const workspaceId = createId();
      const newWorkspace = {
        id: workspaceId,
        name: input.name,
        ownerId: input.ownerId,
        members: [input.email],
        createdAt: now,
        updatedAt: now,
        stripeCustomerId: input.stripeCustomerId,
        associatedAgentId: tixaeAgent.data.ID,
      };

      console.log(`Saving workspace to database with ID: ${workspaceId}`);
      await db.workspaces.ref(newWorkspace.id as any).set(newWorkspace);

      try {
        const userDoc = await db.users.get(input.ownerId as any);
        if (userDoc?.data) {
          const currentWorkspaceIds = userDoc.data.workspaceIds || [];
          if (!currentWorkspaceIds.includes(workspaceId)) {
            await db.users.update(input.ownerId as any, {
              workspaceIds: [...currentWorkspaceIds, workspaceId],
            });
            console.log(`Updated user ${input.ownerId} workspaceIds array`);
          }
        }
      } catch (error) {
        console.warn(`Failed to update user workspaceIds: ${error}`);
      }

      console.log(
        `Successfully created workspace ${workspaceId} for user ${input.ownerId}`
      );

      return newWorkspace;
    } catch (error) {
      console.error("Error in workspace.createWorkspace:", error);
      throw new Error(
        `Failed to create workspace: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export const workspace = new Workspace();
