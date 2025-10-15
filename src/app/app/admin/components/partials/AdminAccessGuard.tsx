"use client";

import { ReactNode } from "react";
import { api } from "@root/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { ShieldX } from "lucide-react";
import { Alert } from "@heroui/react";

interface AdminAccessGuardProps {
  children: ReactNode;
}

export function AdminAccessGuard({ children }: AdminAccessGuardProps) {
  const {
    data: userRole,
    isLoading,
    error,
  } = api.admin.getCurrentUserRole.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">
                Checking admin permissions...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert color="danger">
              Unable to verify admin permissions. Please ensure you're logged in
              and try again.
            </Alert>
            <div className="mt-4 text-sm text-muted-foreground">
              Error: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    !userRole ||
    (userRole.role !== "ADMIN" && userRole.role !== "SUPER_ADMIN")
  ) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert color="danger">
              You don't have admin privileges to access this page. Admin or
              Super Admin role is required.
            </Alert>

            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-medium">Your current role:</h4>
                <p className="text-sm text-muted-foreground">
                  {userRole?.role || "USER"}
                </p>
              </div>

              <div>
                <h4 className="font-medium">To get admin access:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                  <li>• Contact your system administrator</li>
                  <li>• Request admin privileges from an existing admin</li>
                  <li>
                    • If you're setting up the system for the first time, use
                    the set-first-admin script
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
