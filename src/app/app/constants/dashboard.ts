export const DASHBOARD_CONSTANTS = {
  RECENT_INTERVIEWS_LIMIT: 3,
  LOADING_SPINNER_SIZE: 8,
  VIEWPORT_HEIGHT_OFFSET: 70,
  MAX_CONTAINER_WIDTH: "7xl",
  GRID_BREAKPOINTS: {
    MOBILE: 1,
    DESKTOP: 3,
    TABLET: 2,
  },
  SPACING: {
    SECTION_GAP: 6,
    CARD_GAP: 8,
    CONTENT_PADDING: 6,
  },
} as const;

export const LOADING_MESSAGES = {
  WORKSPACE: "Loading your company profile...",
  JOB_PROFILES: "Loading your positions...",
  INTERVIEWS: "Loading your interviews...",
  APPLICANTS: "Loading your applicants...",
  DEFAULT: "Loading...",
} as const;
