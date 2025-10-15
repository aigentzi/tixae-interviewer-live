/**
 * Font usage patterns following Tixae design guidelines
 *
 * Primary Typeface: Poppins - Clean, geometric, modern
 * Secondary Typeface: Lexend - Wide letter spacing for readability
 */

export const FONT_CLASSES = {
  // Primary Font (Poppins) - Headers
  headings: {
    h1: "text-h1-poppins", // Poppins Bold, responsive
    h2: "text-h2-poppins", // Poppins Bold, responsive
    h3: "text-h3-poppins", // Poppins Semibold, responsive
    primary: "font-heading-primary", // Custom primary heading
    secondary: "font-heading-secondary", // Custom secondary heading
  },

  // Primary Font (Poppins) - UI Elements
  ui: {
    label: "font-ui-label", // Poppins Medium
    semibold: "font-ui-semibold", // Poppins Semibold
    button: "font-ui-semibold", // Poppins Semibold for buttons
  },

  // Primary Font (Poppins) - Body Text
  body: {
    text: "font-body-text", // Poppins Regular with proper line height
    regular: "font-poppins", // Just Poppins family
  },

  // Secondary Font (Lexend) - Brand & Specialized
  brand: {
    title: "text-brand-title", // Lexend Bold, large, with tracking
    subtitle: "text-brand-subtitle", // Lexend Medium with tracking
    heading: "font-brand", // Lexend with tracking
    subheading: "font-subheading", // Lexend Medium with tracking
  },

  // Secondary Font (Lexend) - Modals
  modal: {
    text: "font-modal", // Lexend with loose tracking
  },
} as const;

/**
 * Direct font family classes for custom usage
 */
export const FONT_FAMILIES = {
  poppins: "font-poppins",
  lexend: "font-lexend",
} as const;

/**
 * Simple usage examples - ready-to-use classes
 */
export const QUICK_FONTS = {
  // Headers
  mainTitle: "text-h1-poppins", // Main page title
  sectionTitle: "text-h2-poppins", // Section titles
  cardTitle: "text-h3-poppins", // Card/component titles

  // Brand elements
  brandTitle: "text-brand-title", // "Tixae Interviewer"
  brandSubtitle: "text-brand-subtitle", // Brand taglines

  // UI elements
  buttonText: "font-ui-semibold", // Button labels
  formLabel: "font-ui-label", // Form field labels
  bodyText: "font-body-text", // Paragraph text

  // Special
  modalTitle: "font-brand", // Modal headers
  modalBody: "font-modal", // Modal content
} as const;

/**
 * Type definitions for better TypeScript support
 */
export type FontClass = typeof FONT_CLASSES;
export type QuickFont = keyof typeof QUICK_FONTS;
