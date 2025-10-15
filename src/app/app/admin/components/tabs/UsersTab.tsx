"use client";

import { useMemo, useState } from "react";
import { api } from "@root/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Input } from "@heroui/react";
import { Badge } from "@root/components/ui/badge";
import { ChangePlanModal } from "../ChangePlanModal";

export function UsersTab() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, refetch } = api.admin.getUsersWithPlans.useQuery({
    limit: 200,
    search,
  });

  const users = data?.users || [];

  const handlePlanBadgeClick = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleModalSuccess = () => {
    refetch(); // Refresh the users list to show updated plan
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Input
            label="Search users"
            placeholder="name or email..."
            value={search}
            onValueChange={setSearch}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 border border-default-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate max-w-[70%]">
                      {u.name || u.email}
                    </div>
                    <Badge
                      variant="default"
                      color={u.plan?.name ? "primary" : "secondary"}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handlePlanBadgeClick(u)}
                    >
                      {u.plan?.name || "Free"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {u.email}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Since:{" "}
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Plan Modal */}
      {selectedUser && (
        <ChangePlanModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          user={selectedUser}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
