"use client";

import { useState } from "react";
import { api } from "@root/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Button } from "@root/components/ui/button";
import { Badge } from "@root/components/ui/badge";
import { Label } from "@root/components/ui/label";
import InlineNotification from "@root/app/components/InlineNotification";
import { UserRole } from "@root/shared/zod-schemas";
import { Trash2, UserPlus } from "lucide-react";
import { Input, Select, SelectItem } from "@heroui/react";

interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: Date;
}

export function UserManagementTab() {
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<UserRole>("ADMIN");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const {
    data: admins,
    isLoading,
    refetch,
  } = api.admin.getAllAdmins.useQuery();
  const { data: currentUserRole } = api.admin.getCurrentUserRole.useQuery();

  const addAdminMutation = api.admin.addAdminByEmail.useMutation({
    onSuccess: (data) => {
      setNotification({ type: "success", message: data.message });
      setNewAdminEmail("");
      refetch();
    },
    onError: (error) => {
      setNotification({
        type: "error",
        message: `Failed to add admin: ${error.message}`,
      });
    },
  });

  const removeAdminMutation = api.admin.removeAdmin.useMutation({
    onSuccess: (data) => {
      setNotification({ type: "success", message: data.message });
      refetch();
    },
    onError: (error) => {
      setNotification({
        type: "error",
        message: `Failed to remove admin: ${error.message}`,
      });
    },
  });

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      setNotification({
        type: "error",
        message: "Please enter an email address",
      });
      return;
    }

    await addAdminMutation.mutateAsync({
      email: newAdminEmail.trim(),
      role: newAdminRole,
    });
  };

  const handleRemoveAdmin = async (userId: string) => {
    await removeAdminMutation.mutateAsync({ userId });
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "danger";
      case "ADMIN":
        return "default";
      case "USER":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "ADMIN":
        return "Admin";
      case "USER":
        return "User";
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading users...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isCurrentUserSuperAdmin = currentUserRole?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Add New Admin */}
      {isCurrentUserSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Admin
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Promote a user to admin by entering their email address. Works
              with any Firebase Auth user.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  isDisabled={addAdminMutation.isPending}
                />
              </div>
              <div className="w-40">
                <Label htmlFor="role">Role</Label>
                <Select
                  selectedKeys={[newAdminRole]}
                  onSelectionChange={(value) =>
                    setNewAdminRole(value.currentKey as UserRole)
                  }
                >
                  <SelectItem key="ADMIN">Admin</SelectItem>
                  <SelectItem key="SUPER_ADMIN">Super Admin</SelectItem>
                </Select>
              </div>
              <Button
                onPress={handleAddAdmin}
                isDisabled={addAdminMutation.isPending || !newAdminEmail.trim()}
              >
                Add Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Admins */}
      <Card>
        <CardHeader>
          <CardTitle>Current Admins</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage admin users in the system.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading admins...</div>
            </div>
          ) : !admins || admins.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No admins found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => {
                const isCurrentUser =
                  currentUserRole && admin.id === currentUserRole.userId;

                return (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 border border-default-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">
                          {admin.name || admin.email}
                        </h4>
                        <Badge
                          color={getRoleBadgeVariant(admin.role)}
                          variant="default"
                        >
                          {getRoleDisplayName(admin.role)}
                        </Badge>
                        {isCurrentUser && (
                          <Badge
                            color="secondary"
                            variant="default"
                            className="text-xs"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {admin.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Since: {new Date(admin.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {isCurrentUserSuperAdmin && !isCurrentUser && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => handleRemoveAdmin(admin.id)}
                        isDisabled={removeAdminMutation.isPending}
                        className="border border-default-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Admin Permissions:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                <strong>Admin:</strong> Can modify global admin settings and
                system configuration
              </li>
              <li>
                <strong>Super Admin:</strong> Full system access including user
                role management
              </li>
            </ul>
            {!isCurrentUserSuperAdmin && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Note: Only Super Admins can manage admin users
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
