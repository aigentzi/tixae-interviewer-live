// Common button styles used across onboarding components
export const BUTTON_STYLES = {
  primary:
    "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-4 rounded-xl text-lg",
  secondary:
    "w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-4 rounded-xl text-lg",
  outline:
    "w-full text-gray-600 border-gray-300 hover:bg-gray-50 py-3 rounded-xl",
} as const;

// Common card and section styles
export const CARD_STYLES = "p-8 bg-white shadow-2xl rounded-3xl border-0";
export const SECTION_STYLES = "max-w-3xl mx-auto";

// Common color styles for consistency
export const COLOR_STYLES = {
  primary: "text-primary",
  primaryBg: "bg-primary",
  primaryHover: "hover:bg-primary/90",
  primaryLight: "bg-primary/10",
  primaryBorder: "border-primary",
} as const;

// Sample questions shown in step 3 (English fallback)
// For translated questions, use the useSampleQuestions hook instead
export const SAMPLE_QUESTIONS = [
  "What attracted you to this role and our company?",
  "How do you approach problem-solving at work?",
  "What's a job achievement you're most proud of?",
  "How do you handle your tasks when under pressure?",
] as const;
