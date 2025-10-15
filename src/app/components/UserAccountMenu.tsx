"use client";

import { useState } from "react";
import { useGAuth } from "@root/app/hooks/guath.hook";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { app } from "@root/app/firebase/clientFirebaseInit";
import { api } from "@root/trpc/react";
import { type Workspace } from "@root/shared/zod-schemas";
import {
  Plus,
  Moon,
  Sun,
  Settings,
  ChartBar,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@root/app/hooks/theme.hook";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  User,
  DropdownSection,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  useDisclosure,
} from "@heroui/react";
import { useTranslations } from "@root/app/providers/TranslationContext";

export default function UserAccountMenu({
  compact = false,
}: {
  compact?: boolean;
}) {
  const t = useTranslations("userMenu");
  const { gauthUser } = useGAuth();
  const {
    activeWorkspace,
    setActiveWorkspace,
    workspaces,
    refetchWorkspaces,
    createWorkspace,
  } = useActiveWorkspace();
  const { theme, setTheme, getEffectiveTheme } = useTheme();
  const {
    isOpen: isCreateModalOpen,
    onOpen: onCreateModalOpen,
    onOpenChange: onCreateModalOpenChange,
    onClose: onCreateModalClose,
  } = useDisclosure();
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const router = useRouter();

  // Check if user is admin
  const { data: userRole } = api.admin.getCurrentUserRole.useQuery(undefined, {
    enabled: !!gauthUser,
  });
  const isAdmin =
    userRole?.role === "ADMIN" || userRole?.role === "SUPER_ADMIN";
  // Handle logout
  const handleLogout = async () => {
    const auth = getAuth(app);
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSwitchWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || !gauthUser?.uid) return;

    await createWorkspace.mutateAsync({
      name: newWorkspaceName.trim(),
      ownerId: gauthUser.uid,
    });
  };

  if (!gauthUser) {
    return null;
  }

  return (
    <>
      <Dropdown>
        <DropdownTrigger>
          {compact ? (
            <Avatar
              src={gauthUser.photoURL}
              name={
                gauthUser.displayName?.charAt(0).toUpperCase() ||
                gauthUser.email?.charAt(0).toUpperCase() ||
                "U"
              }
            />
          ) : (
            <div className="flex items-center gap-3 p-3 bg-default-50 rounded-xl border border-default-200">
              <Avatar
                size="sm"
                src={gauthUser.photoURL || undefined}
                fallback={
                  gauthUser.displayName?.charAt(0).toUpperCase() ||
                  gauthUser.email?.charAt(0).toUpperCase() ||
                  "U"
                }
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {gauthUser.displayName || ""}
                </p>
                <p className="text-xs text-foreground-500 truncate">
                  {gauthUser.email || ""}
                </p>
              </div>
              <ChevronRight
                size={16}
                className="text-foreground-400 flex-shrink-0"
              />
            </div>
          )}
        </DropdownTrigger>

        <DropdownMenu
          aria-label={t("userAccountMenu", "User Account Menu")}
          variant="flat"
        >
          <DropdownSection showDivider aria-label={t("profile", "Profile")}>
            <DropdownItem
              key="profile"
              isReadOnly
              className="h-14 gap-2 opacity-100"
            >
              <User
                avatarProps={{
                  size: "sm",
                  src: gauthUser.photoURL || undefined,
                  name:
                    gauthUser.displayName?.charAt(0).toUpperCase() ||
                    gauthUser.email?.charAt(0).toUpperCase() ||
                    "U",
                }}
                classNames={{
                  name: "text-default-600",
                  description: "text-default-500",
                }}
                description={gauthUser.email || ""}
                name={gauthUser.displayName || ""}
              />
            </DropdownItem>
          </DropdownSection>

          <DropdownSection showDivider aria-label={t("general", "General")}>
            <DropdownItem
              key="theme"
              onPress={() =>
                setTheme(getEffectiveTheme() === "dark" ? "light" : "dark")
              }
              startContent={
                getEffectiveTheme() === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              }
            >
              {getEffectiveTheme() === "dark"
                ? t("lightMode", "Light Mode")
                : t("darkMode", "Dark Mode")}
            </DropdownItem>
            {/* Admin Panel & Analytics - Only show for admins */}
            {isAdmin ? (
              <>
                <DropdownItem
                  startContent={<Settings className="h-4 w-4" />}
                  key="admin"
                  onPress={() => router.push("/app/admin")}
                >
                  {t("adminPanel", "Admin Panel")}
                </DropdownItem>
                <DropdownItem
                  startContent={<ChartBar className="h-4 w-4" />}
                  key="analytics"
                  onPress={() => router.push("/app/analytics")}
                >
                  {t("analytics", "Analytics")}
                </DropdownItem>
              </>
            ) : null}
          </DropdownSection>

          <DropdownSection
            showDivider
            aria-label={t("workspaces", "Workspaces")}
          >
            <>
              {workspaces?.map((workspace) => (
                <DropdownItem
                  key={`workspace-${workspace.id}`}
                  onPress={() => handleSwitchWorkspace(workspace)}
                  className={
                    activeWorkspace?.id === workspace.id
                      ? "bg-content2 text-content1-foreground border border-primary/20"
                      : ""
                  }
                  startContent={
                    <div className="border rounded-md h-5 w-5 text-xs flex items-center justify-center">
                      {workspace.name.charAt(0)}
                    </div>
                  }
                >
                  {workspace.name}
                </DropdownItem>
              ))}
              <DropdownItem
                key="create-workspace"
                onPress={onCreateModalOpen}
                startContent={
                  <div className="border rounded-md h-5 w-5 flex items-center justify-center">
                    <Plus size={12} />
                  </div>
                }
              >
                {t("createWorkspace", "Create Workspace")}
              </DropdownItem>
            </>
          </DropdownSection>

          <DropdownItem
            startContent={<LogOut className="h-4 w-4" />}
            key="logout"
            onPress={handleLogout}
            color="danger"
          >
            {t("signOut", "Sign out")}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onOpenChange={onCreateModalOpenChange}
        size="md"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("createNewWorkspace", "Create New Workspace")}
              </ModalHeader>
              <ModalBody>
                <p className="text-small text-default-500">
                  {t(
                    "createWorkspaceDesc",
                    "Create a new workspace to start collaborating with your team.",
                  )}
                </p>
                <Input
                  label={t("workspaceName", "Workspace Name")}
                  placeholder={t("workspaceNamePlaceholder", "My Workspace")}
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  variant="bordered"
                  autoFocus
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  {t("cancel", "Cancel")}
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateWorkspace}
                  isDisabled={
                    !newWorkspaceName.trim() || createWorkspace.isPending
                  }
                  isLoading={createWorkspace.isPending}
                >
                  {t("createWorkspace", "Create Workspace")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
