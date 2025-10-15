import { BarChart3 } from "lucide-react";

export function AnalyticsFooter() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <footer className="bottom-0 bg-background/95 border-t border-default-200 mt-8">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Tixae Analytics Dashboard</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated: {currentDate}
          </div>
        </div>
      </div>
    </footer>
  );
}
