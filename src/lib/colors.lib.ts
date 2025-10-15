/**
 * TIXAE Interviewer Brand Colors
 * Official color palette and usage guidelines
 */

export const TIXAE_COLORS = {
  // Core Brand Colors
  brand: {
    charcoal: "#1E1E1E", // Primary background/text
    darkPurple: "#421566", // Primary - Call-to-action elements
    cloudWhite: "#FAFAFA", // Background, cards
    peach: "#D46686", // Secondary - CTA, links, outlines
    coolGray: "#B1B5BD", // Subtext, UI border lines
  },

  // State/Signal Colors
  states: {
    successGreen: "#38B48B", // Interview completed, OK messages
    warningYellow: "#FFD666", // Confirmation, caution prompts
    errorRed: "#D64545", // Validation, system errors
  },
} as const;

/**
 * CSS Variable Mapping
 * How brand colors map to Tailwind CSS variables
 */
export const COLOR_MAPPING = {
  primary: "darkPurple", // --primary → Dark Purple #421566
  secondary: "peach", // --secondary → Peach #D46686
  default: "coolGray", // --default → Cool Gray #B1B5BD
  success: "successGreen", // --success → Success Green #38B48B
  warning: "warningYellow", // --warning → Warning Yellow #FFD666
  danger: "errorRed", // --danger → Error Red #D64545
  background: {
    light: "cloudWhite", // Light theme background
    dark: "charcoal", // Dark theme background
  },
  foreground: {
    light: "charcoal", // Light theme text
    dark: "cloudWhite", // Dark theme text
  },
} as const;

/**
 * Usage Guidelines
 */
export const COLOR_USAGE = {
  primary: {
    color: TIXAE_COLORS.brand.darkPurple,
    usage: "Call-to-action buttons, accent elements, brand highlights",
    examples: [
      "Start Interview button",
      "Primary navigation links",
      "Key metrics",
    ],
  },
  secondary: {
    color: TIXAE_COLORS.brand.peach,
    usage: "Secondary actions, links, outlines, supporting elements",
    examples: ["Secondary buttons", "Navigation links", "Form field borders"],
  },
  default: {
    color: TIXAE_COLORS.brand.coolGray,
    usage: "UI borders, subtext, disabled elements",
    examples: ["Card borders", "Placeholder text", "Disabled form fields"],
  },
  success: {
    color: TIXAE_COLORS.states.successGreen,
    usage: "Success messages, completed states, positive feedback",
    examples: ["Interview completed", "Form submitted", "Success alerts"],
  },
  warning: {
    color: TIXAE_COLORS.states.warningYellow,
    usage: "Caution prompts, confirmation dialogs, important notices",
    examples: ["Delete confirmation", "Unsaved changes", "Warning alerts"],
  },
  danger: {
    color: TIXAE_COLORS.states.errorRed,
    usage: "Error messages, validation failures, destructive actions",
    examples: ["Form validation errors", "Delete buttons", "Error alerts"],
  },
} as const;

/**
 * Tailwind CSS Class Utilities
 * Pre-built class combinations for common use cases
 */
export const TIXAE_CLASSES = {
  // Buttons
  buttons: {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
    success: "bg-success text-success-foreground hover:opacity-90",
    warning: "bg-warning text-warning-foreground hover:opacity-90",
    danger: "bg-danger text-danger-foreground hover:opacity-90",
    ghost:
      "bg-transparent border border-default-300 text-foreground hover:bg-default-100",
  },

  // Cards
  cards: {
    default: "bg-content2 border border-default-200 rounded-lg",
    elevated: "bg-content1 border border-default-200 rounded-lg shadow-sm",
    interactive:
      "bg-content2 border border-default-200 rounded-lg hover:border-default-300 transition-colors",
  },

  // Text
  text: {
    primary: "text-foreground",
    secondary: "text-foreground-700",
    body: "text-foreground-600",
    muted: "text-foreground-500",
    disabled: "text-foreground-400",
    link: "text-secondary hover:text-secondary-600 transition-colors",
  },

  // Alerts/Messages
  alerts: {
    success:
      "bg-success-50 border border-success-200 text-success-foreground rounded-lg p-4",
    warning:
      "bg-warning-50 border border-warning-200 text-warning-foreground rounded-lg p-4",
    error:
      "bg-danger-50 border border-danger-200 text-danger-foreground rounded-lg p-4",
    info: "bg-default-50 border border-default-200 text-default-foreground rounded-lg p-4",
  },
} as const;

/**
 * Type definitions
 */
export type TixaeColor =
  | keyof typeof TIXAE_COLORS.brand
  | keyof typeof TIXAE_COLORS.states;
export type ColorVariant = keyof typeof COLOR_MAPPING;
export type ButtonVariant = keyof typeof TIXAE_CLASSES.buttons;
export type CardVariant = keyof typeof TIXAE_CLASSES.cards;
export type TextVariant = keyof typeof TIXAE_CLASSES.text;
export type AlertVariant = keyof typeof TIXAE_CLASSES.alerts;
