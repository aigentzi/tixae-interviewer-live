import { Loader2 } from "lucide-react";

export const FullScreenLoader = () => {
  return (
    <div className="min-h-screen flex justify-center items-center">
      <Loader2 className="w-10 h-10 animate-spin" />
    </div>
  );
};
