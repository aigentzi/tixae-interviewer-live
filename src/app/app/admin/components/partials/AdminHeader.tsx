import { Badge } from "@root/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface AdminHeaderProps {
  hasUnsavedChanges: boolean;
}

export function AdminHeader({ hasUnsavedChanges }: AdminHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage system configuration and settings
          </p>
        </div>
        <Badge variant="default">Admin Access</Badge>
      </div>

      {/* Unsaved Changes Alert */}
      {hasUnsavedChanges && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">You have unsaved changes</span>
          </div>
        </div>
      )}
    </div>
  );
}
