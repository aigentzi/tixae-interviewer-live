import { Badge } from "@root/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface AnalyticsHeaderProps {
  gauthUser: any;
}

export function AnalyticsHeader({ gauthUser }: AnalyticsHeaderProps) {
  return (
    <header>
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              User Analytics
            </h1>
            <p className="text-muted-foreground">
              Monitor user engagement and activity
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {gauthUser?.displayName || "Admin User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {gauthUser?.email}
              </p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                {gauthUser?.photoURL ? (
                  <img
                    src={gauthUser.photoURL}
                    alt="Admin"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary font-semibold">
                    {gauthUser?.displayName?.charAt(0) ||
                      gauthUser?.email?.charAt(0) ||
                      "A"}
                  </span>
                )}
              </div>
              <Badge
                color="secondary"
                variant="default"
                className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-xs"
              >
                <TrendingUp className="h-3 w-3" />
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
