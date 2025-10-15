interface OnboardingCompletionScreenProps {
  title?: string;
  subtitle?: string;
}

export const OnboardingCompletionScreen = ({
  title = "Setting up your company profile...",
  subtitle = "We're preparing everything for your first interview experience",
}: OnboardingCompletionScreenProps) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/10 to-secondary/10 p-8 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 mx-auto">
            <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary"></div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">{subtitle}</p>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-primary/70 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-primary/70 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    </div>
  );
};
