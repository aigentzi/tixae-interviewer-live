"use client";

import {
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { AppSearch } from "@root/app/components/AppSearch";
import { useGAuth } from "@root/app/hooks/guath.hook";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import { Switch } from "@heroui/react";
import { api } from "@root/trpc/react";
import {
  AlertTriangleIcon,
  TrashIcon,
  UserPlusIcon,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import { useTranslations } from "@root/app/providers/TranslationContext";

export default function WorkspaceManagement() {
  const t = useTranslations("settings");
  const { gauthUser } = useGAuth();
  const {
    activeWorkspace,
    workspaces,
    refetchWorkspaces: refetchWorkspacesContext,
    setActiveWorkspace,
  } = useActiveWorkspace();
  const [workspaceNameToSearch, setWorkspaceNameToSearch] = useState("");
  const {
    isOpen: isDeleteDialogOpen,
    onOpen: onDeleteDialogOpen,
    onOpenChange: onDeleteDialogOpenChange,
  } = useDisclosure();
  const {
    isOpen: isAddMemberModalOpen,
    onOpen: onAddMemberModalOpen,
    onOpenChange: onAddMemberModalOpenChange,
  } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchField, setSearchField] = useState("");
  const [inviteNewMember, setInviteNewMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(null);
  const {
    isOpen: isDeleteWorkspaceDialogOpen,
    onOpen: onDeleteWorkspaceDialogOpen,
    onOpenChange: onDeleteWorkspaceDialogOpenChange,
  } = useDisclosure();
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  // Query to list workspaces by name
  const {
    data: workspacesList,
    isLoading: isSearching,
    refetch: refetchWorkspaces,
  } = api.workspace.listByName.useQuery(
    { workspaceName: workspaceNameToSearch },
    { enabled: !!workspaceNameToSearch }
  );

  // Mutation to delete workspaces by name
  const deleteWorkspacesByName = api.workspace.deleteByName.useMutation({
    onSuccess: (result) => {
      setIsDeleting(false);
      onDeleteDialogOpenChange();
      refetchWorkspaces();

      if (result.deletedCount > 0) {
        setNotification({
          type: "success",
          message: t(
            "successfullyDeleted",
            "Successfully deleted {{count}} workspace(s)"
          ).replace("{{count}}", result.deletedCount.toString()),
        });
      } else {
        setNotification({
          type: "info",
          message: t("noWorkspacesFound", "No workspaces found with that name"),
        });
      }
    },
    onError: (error) => {
      setIsDeleting(false);
      setNotification({
        type: "error",
        message:
          t("failedToDeleteWorkspaces", "Failed to delete workspaces") +
          ": " +
          error.message,
      });
    },
  });

  // Mutation to reset onboarding for testing
  const resetOnboardingMutation = api.workspace.update.useMutation({
    onSuccess: () => {
      setNotification({
        type: "success",
        message: t(
          "onboardingResetSuccessfully",
          "Onboarding reset successfully!"
        ),
      });
    },
    onError: (error) => {
      setNotification({
        type: "error",
        message:
          t("failedToResetOnboarding", "Failed to reset onboarding") +
          ": " +
          error.message,
      });
    },
  });

  const { data: allUsers } = api.auth.getAllUsers.useQuery(
    {
      search: searchField,
    },
    {
      enabled: searchField.length > 2,
    }
  );

  const { data: users, refetch: refetchUsers } =
    api.workspace.getMembers.useQuery(
      {
        workspaceId: activeWorkspace?.id || "",
      },
      {
        enabled: !!activeWorkspace?.id,
      }
    );

  const { mutate: addMember } = api.workspace.addMemberInvitation.useMutation({
    onSuccess: () => {
      setNotification({
        type: "success",
        message: t(
          "memberInvitationSentSuccessfully",
          "Member invitation sent successfully"
        ),
      });
      refetchUsers();
      refetchWorkspacesContext();
    },
    onError: (error) => {
      setNotification({
        type: "error",
        message:
          t(
            "failedToSendMemberInvitation",
            "Failed to send member invitation"
          ) +
          ": " +
          error.message,
      });
    },
  });

  const { mutate: removeMember } = api.workspace.removeMember.useMutation({
    onSuccess: () => {
      setNotification({
        type: "success",
        message: t("memberRemovedSuccessfully", "Member removed successfully"),
      });
      refetchUsers();
    },
    onError: (error) => {
      setNotification({
        type: "error",
        message:
          t("failedToRemoveMember", "Failed to remove member") +
          ": " +
          error.message,
      });
    },
  });

  const { mutate: acceptInvitation } =
    api.workspace.acceptInvitation.useMutation({
      onSuccess: () => {
        setNotification({
          type: "success",
          message: t(
            "invitationAcceptedSuccessfully",
            "Invitation accepted successfully"
          ),
        });
        refetchWorkspacesContext();
      },
      onError: (error) => {
        setNotification({
          type: "error",
          message:
            t("failedToAcceptInvitation", "Failed to accept invitation") +
            ": " +
            error.message,
        });
      },
    });

  const { mutate: rejectInvitation } =
    api.workspace.rejectInvitation.useMutation({
      onSuccess: () => {
        setNotification({
          type: "success",
          message: t(
            "invitationRejectedSuccessfully",
            "Invitation rejected successfully"
          ),
        });
        refetchWorkspacesContext();
      },
      onError: (error) => {
        setNotification({
          type: "error",
          message:
            t("failedToRejectInvitation", "Failed to reject invitation") +
            ": " +
            error.message,
        });
      },
    });

  // Removed getUserByEmail query as we're now using AppSearch with debounced search

  const handleDeleteWorkspaces = () => {
    if (!workspaceNameToSearch.trim()) {
      setNotification({
        type: "error",
        message: t("pleaseEnterWorkspaceName", "Please enter a workspace name"),
      });
      return;
    }

    setIsDeleting(true);
    deleteWorkspacesByName.mutate({
      workspaceName: workspaceNameToSearch,
    });
  };

  const handleSearchWorkspaces = () => {
    if (!workspaceNameToSearch.trim()) {
      setNotification({
        type: "error",
        message: t(
          "pleaseEnterWorkspaceNameToSearch",
          "Please enter a workspace name to search"
        ),
      });
      return;
    }
    refetchWorkspaces();
  };

  const handleResetOnboarding = () => {
    if (!activeWorkspace?.id) {
      setNotification({
        type: "error",
        message: t("noActiveWorkspaceFound", "No active workspace found"),
      });
      return;
    }

    resetOnboardingMutation.mutate({
      workspaceId: activeWorkspace.id,
      settings: {
        ...activeWorkspace.settings,
        onboardingCompleted: false,
      },
    });
  };

  const handleAddMember = (member: {
    uid: string;
    email: string;
    displayName: string;
  }) => {
    if (!activeWorkspace?.id) {
      setNotification({
        type: "error",
        message: t("noActiveWorkspaceFound", "No active workspace found"),
      });
      return;
    }

    if (!member.uid) {
      setNotification({
        type: "error",
        message: t("pleaseSelectUserToAdd", "Please select a user to add"),
      });
      return;
    }

    addMember({
      workspaceId: activeWorkspace.id,
      memberEmail: member.email,
    });

    // Reset the form after adding
    setSelectedUser(null);
    setSearchField("");
  };

  const handleInviteNewMember = (email: string) => {
    if (!email) {
      setNotification({
        type: "error",
        message: t(
          "pleaseEnterEmailToInvite",
          "Please enter an email to invite"
        ),
      });
      return;
    }

    addMember({
      workspaceId: activeWorkspace?.id || "",
      memberEmail: email,
    });

    setSelectedUser(null);
  };

  const handleRemoveMember = (memberId: string) => {
    if (!activeWorkspace?.id) {
      setNotification({
        type: "error",
        message: t("noActiveWorkspaceFound", "No active workspace found"),
      });
      return;
    }

    removeMember({
      workspaceId: activeWorkspace.id,
      memberId,
    });
  };

  const handleUserSelect = (email: string) => {
    const user = allUsers?.users?.find((u) => u.email === email);
    if (user) {
      setSelectedUser({
        uid: user.id, // The id field is the Firebase UID
        email: user.email,
        displayName: user.name || user.email,
      });
      setSearchField(user.email);
    }
  };

  const { mutate: transferOwnership } =
    api.workspace.transferOwnership.useMutation({
      onSuccess: () => {
        setNotification({
          type: "success",
          message: t(
            "workspaceOwnershipTransferredSuccessfully",
            "Workspace ownership transferred successfully"
          ),
        });
        refetchUsers();
        refetchWorkspacesContext();
      },
      onError: (error) => {
        setNotification({
          type: "error",
          message:
            t("failedToTransferOwnership", "Failed to transfer ownership") +
            ": " +
            error.message,
        });
      },
    });

  const { mutate: deleteCurrentWorkspace } =
    api.workspace.deleteCurrentWorkspace.useMutation({
      onSuccess: (result) => {
        setIsDeletingWorkspace(false);
        onDeleteWorkspaceDialogOpenChange();

        setNotification({
          type: "success",
          message: t(
            "workspaceDeletedSuccessfully",
            "Workspace deleted successfully"
          ),
        });

        // Switch to the recommended workspace if available
        if (result.switchToWorkspaceId) {
          const newWorkspace = workspaces.find(
            (ws) => ws.id === result.switchToWorkspaceId
          );
          if (newWorkspace) {
            setActiveWorkspace(newWorkspace);
          }
        }

        // Refetch workspaces to update the list
        refetchWorkspacesContext();
      },
      onError: (error) => {
        setIsDeletingWorkspace(false);
        setNotification({
          type: "error",
          message:
            t("failedToDeleteWorkspace", "Failed to delete workspace") +
            ": " +
            error.message,
        });
      },
    });

  const handleTransferOwnership = (memberId: string) => {
    if (!activeWorkspace?.id) return;
    transferOwnership({
      workspaceId: activeWorkspace.id,
      newOwnerId: memberId,
    });
  };

  const handleCloseAddMemberModal = () => {
    setSelectedUser(null);
    setSearchField("");
    setInviteNewMember(false);
    onAddMemberModalOpenChange();
  };

  const handleDeleteCurrentWorkspace = () => {
    if (!activeWorkspace?.id) {
      setNotification({
        type: "error",
        message: t("noActiveWorkspaceFound", "No active workspace found"),
      });
      return;
    }

    setIsDeletingWorkspace(true);
    deleteCurrentWorkspace({
      workspaceId: activeWorkspace.id,
    });
  };

  // Check if user can delete the current workspace
  const canDeleteWorkspace = useMemo(() => {
    if (!activeWorkspace || !gauthUser) return false;

    // Only owners can delete workspaces
    const isOwner = activeWorkspace.ownerId === gauthUser.uid;

    // Must have more than one accessible workspace
    const accessibleWorkspaces = workspaces.filter((workspace) => {
      const memberRole = workspace.memberRoles?.[gauthUser.email || ""];
      return (
        workspace.ownerId === gauthUser.uid ||
        (memberRole && memberRole !== "PENDING")
      );
    });

    return isOwner && accessibleWorkspaces.length > 1;
  }, [activeWorkspace, gauthUser, workspaces]);

  return (
    <div className="w-full max-w-none space-y-8">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Pending Invitations */}
      {workspaces
        .filter(
          (workspace) =>
            workspace.memberRoles?.[gauthUser?.email || ""] === "PENDING"
        )
        .map((workspace) => (
          <div
            key={workspace.id}
            className="bg-blue-50 border border-blue-200 rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {t(
                    "invitationToJoin",
                    "Invitation to join {{name}} workspace"
                  ).replace("{{name}}", workspace.name)}
                </h3>
                <p className="text-blue-700 mb-4">
                  {t(
                    "youHaveBeenInvited",
                    "You have been invited to join {{name}} as a member."
                  ).replace("{{name}}", workspace.name)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  color="primary"
                  onClick={() =>
                    acceptInvitation({ workspaceId: workspace.id })
                  }
                >
                  {t("acceptInvitation", "Accept Invitation")}
                </Button>
                <Button
                  variant="bordered"
                  onClick={() =>
                    rejectInvitation({ workspaceId: workspace.id })
                  }
                >
                  {t("rejectInvitation", "Reject Invitation")}
                </Button>
              </div>
            </div>
          </div>
        ))}

      {/* Member Management Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header with Add Member Button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-gray-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t("memberList", "Member List")}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {users?.length || 0} {t("members", "members")} in this workspace
              </p>
            </div>
          </div>
          <Button
            color="primary"
            size="sm"
            startContent={<UserPlusIcon className="w-4 h-4" />}
            onPress={onAddMemberModalOpen}
          >
            {t("addMember", "Add Member")}
          </Button>
        </div>

        {/* Members Table */}
        <div className="p-6">
          {users && users.length > 0 ? (
            <Table
              aria-label="Workspace members table"
              className="w-full"
              removeWrapper
            >
              <TableHeader>
                <TableColumn className="text-left">
                  {t("email", "Email")}
                </TableColumn>
                <TableColumn className="text-left">
                  {t("role", "Role")}
                </TableColumn>
                <TableColumn className="text-right">
                  {t("actions", "Actions")}
                </TableColumn>
              </TableHeader>
              <TableBody items={users}>
                {(user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "OWNER"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {/* Transfer ownership button */}
                        {gauthUser?.uid === activeWorkspace?.ownerId &&
                          user.id !== activeWorkspace?.ownerId && (
                            <Button
                              variant="bordered"
                              size="sm"
                              onPress={() => handleTransferOwnership(user.id)}
                            >
                              {t("transferOwnership", "Transfer Ownership")}
                            </Button>
                          )}

                        {/* Remove member button */}
                        {user.id !== activeWorkspace?.ownerId && (
                          <Button
                            variant="light"
                            size="sm"
                            color="danger"
                            onPress={() => handleRemoveMember(user.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("noMembersFound", "No members found")}
              </h3>
              <p className="text-sm text-gray-500">
                {t("addFirstMember", "Add your first member to get started")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      {canDeleteWorkspace && (
        <div className="bg-white border border-red-200 rounded-lg">
          <div className="p-6 border-b border-red-200">
            <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5" />
              {t("dangerZone", "Danger Zone")}
            </h3>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t("deleteWorkspace", "Delete Workspace")}
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  {t(
                    "deleteWorkspaceDescription",
                    "Permanently delete this workspace and all its data. This action cannot be undone."
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {users?.length || 0} {t("members", "members")} •{" "}
                  {t("workspaceName", "Workspace:")} {activeWorkspace?.name}
                </p>
              </div>
              <Button
                color="danger"
                variant="bordered"
                size="sm"
                isDisabled={isDeletingWorkspace}
                startContent={<TrashIcon className="w-4 h-4" />}
                onPress={onDeleteWorkspaceDialogOpen}
              >
                {t("delete", "Delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info when deletion is not available */}
      {!canDeleteWorkspace &&
        activeWorkspace &&
        gauthUser?.uid === activeWorkspace.ownerId && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <AlertTriangleIcon className="w-4 h-4 inline mr-2" />
              {t(
                "cannotDeleteLastWorkspace",
                "You cannot delete your last workspace. Create another workspace first."
              )}
            </p>
          </div>
        )}

      {/* Bulk Delete Section - Only show if there are workspaces to delete */}
      {workspacesList && workspacesList.workspaces.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangleIcon className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                {t("dangerZone", "Danger Zone")}
              </h3>
              <p className="text-red-600 mb-4">
                {t(
                  "permanentlyDeleteAllWorkspaces",
                  'Permanently delete all workspaces with the name "{{name}}"'
                ).replace("{{name}}", workspaceNameToSearch)}
              </p>

              <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-red-800 mb-2">
                  {t(
                    "thisActionCannotBeUndone",
                    "⚠️ This action cannot be undone"
                  )}
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>
                    {t(
                      "thisWillPermanentlyDelete",
                      "• This will permanently delete {{count}} workspace(s)"
                    ).replace(
                      "{{count}}",
                      workspacesList.workspaces.length.toString()
                    )}
                  </li>
                  <li>
                    {t(
                      "allDataWillBeLost",
                      "• All data associated with these workspaces will be lost"
                    )}
                  </li>
                  <li>
                    {t(
                      "onlyWorkspacesYouOwnWillBeDeleted",
                      "• Only workspaces you own will be deleted"
                    )}
                  </li>
                </ul>
              </div>

              <Button
                color="danger"
                variant="solid"
                isDisabled={isDeleting}
                startContent={<TrashIcon className="w-4 h-4" />}
                onPress={onDeleteDialogOpen}
              >
                {t("deleteWorkspaces", "Delete {{count}} Workspace(s)").replace(
                  "{{count}}",
                  workspacesList.workspaces.length.toString()
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        size="lg"
        isOpen={isAddMemberModalOpen}
        onOpenChange={handleCloseAddMemberModal}
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <UserPlusIcon className="w-5 h-5" />
                  {t("addMember", "Add Member")}
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-6">
                  {/* Toggle between invite new vs existing user */}
                  <div className="flex items-center justify-between bg-gray-100 rounded-lg p-4">
                    <Label
                      className="text-sm font-medium"
                      htmlFor="inviteNewMember"
                    >
                      {t("inviteNewMember", "Invite new member")}
                    </Label>
                    <Switch
                      isSelected={inviteNewMember}
                      size="sm"
                      onValueChange={(value) => setInviteNewMember(value)}
                      id="inviteNewMember"
                    />
                  </div>

                  {inviteNewMember ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          {t("email", "Email")}
                        </Label>
                        <Input
                          value={selectedUser?.email || ""}
                          variant="bordered"
                          color="primary"
                          onValueChange={(value) =>
                            setSelectedUser({
                              uid: selectedUser?.uid || "",
                              email: value,
                              displayName: selectedUser?.displayName || "",
                            })
                          }
                          placeholder={t(
                            "enterEmailToInvite",
                            "Enter email to invite"
                          )}
                          className="w-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AppSearch
                        searchList={allUsers?.users || []}
                        searchField={searchField}
                        setSearchField={setSearchField}
                        onUserSelect={handleUserSelect}
                        label={t("searchMembers", "Search Members")}
                      />

                      {selectedUser && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                              <span className="text-green-800 font-medium text-sm">
                                {selectedUser.displayName
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-green-900">
                                {selectedUser.displayName}
                              </p>
                              <p className="text-sm text-green-700">
                                {selectedUser.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="bordered" onPress={handleCloseAddMemberModal}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button
                  color="primary"
                  isDisabled={
                    inviteNewMember ? !selectedUser?.email : !selectedUser?.uid
                  }
                  onPress={() => {
                    if (inviteNewMember) {
                      handleInviteNewMember(selectedUser?.email || "");
                    } else {
                      selectedUser && handleAddMember(selectedUser);
                    }
                    handleCloseAddMemberModal();
                  }}
                >
                  {inviteNewMember
                    ? t("inviteMember", "Invite Member")
                    : t("addMember", "Add Member")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Current Workspace Confirmation Modal */}
      <Modal
        size="md"
        isOpen={isDeleteWorkspaceDialogOpen}
        onOpenChange={onDeleteWorkspaceDialogOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("deleteWorkspace", "Delete Workspace")}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    {t(
                      "confirmDeleteWorkspace",
                      "Are you sure you want to delete"
                    )}{" "}
                    <strong className="text-gray-900">
                      "{activeWorkspace?.name}"
                    </strong>
                    ?
                  </p>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800 font-medium">
                      {t("warning", "Warning:")}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {t(
                        "deleteWarning",
                        "This will permanently delete all workspace data and remove access for all members. This action cannot be undone."
                      )}
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="bordered"
                  onPress={() => onClose()}
                  isDisabled={isDeletingWorkspace}
                >
                  {t("cancel", "Cancel")}
                </Button>
                <Button
                  variant="solid"
                  color="danger"
                  onPress={handleDeleteCurrentWorkspace}
                  isDisabled={isDeletingWorkspace}
                  isLoading={isDeletingWorkspace}
                >
                  {t("deleteWorkspace", "Delete Workspace")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        size="lg"
        scrollBehavior="inside"
        isOpen={isDeleteDialogOpen}
        onOpenChange={onDeleteDialogOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("confirmWorkspaceDeletion", "Confirm Workspace Deletion")}
              </ModalHeader>
              <ModalBody className="scrollbar-thin">
                {t(
                  "areYouAbsolutelySure",
                  "Are you absolutely sure you want to delete"
                )}{" "}
                <strong>
                  {t("countWorkspaces", "{{count}} workspace(s)").replace(
                    "{{count}}",
                    workspacesList?.workspaces.length.toString() || "0"
                  )}
                </strong>{" "}
                {t("namedWorkspace", 'named "{{name}}"?').replace(
                  "{{name}}",
                  workspaceNameToSearch
                )}
                <br />
                <br />
                {t(
                  "thisActionCannotBeUndoneAndWillRemove",
                  "This action cannot be undone and will permanently remove:"
                )}
                <ul className="mt-2 ml-4 list-disc">
                  <li>{t("allWorkspaceData", "All workspace data")}</li>
                  <li>
                    {t(
                      "associatedInterviewsAndProfiles",
                      "Associated interviews and profiles"
                    )}
                  </li>
                  <li>
                    {t(
                      "settingsAndConfigurations",
                      "Settings and configurations"
                    )}
                  </li>
                </ul>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="bordered"
                  onPress={() => onClose()}
                  isDisabled={isDeleting}
                >
                  {t("cancel", "Cancel")}
                </Button>
                <Button
                  variant="solid"
                  color="danger"
                  onPress={handleDeleteWorkspaces}
                  isDisabled={isDeleting}
                  isLoading={isDeleting}
                >
                  {t("yesDeleteAll", "Yes, Delete All")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
