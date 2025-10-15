import { presetColorsKeys } from "@root/shared/zod-schemas";
import { createContext, Dispatch, SetStateAction } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextType {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  colorScheme: (typeof presetColorsKeys)[number];
  changeColorScheme: (colorScheme: (typeof presetColorsKeys)[number]) => void;
  getEffectiveTheme: () => "light" | "dark";
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);
