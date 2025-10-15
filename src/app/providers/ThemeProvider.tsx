"use client";

import { ReactNode, useContext, useEffect, useState } from "react";
import { ThemeContext, Theme } from "../contexts/theme.context";
import { presetColorsKeys } from "@root/shared/zod-schemas";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [colorScheme, setColorScheme] =
    useState<(typeof presetColorsKeys)[number]>("purple");

  useEffect(() => {
    setColorScheme("purple");
    setTheme("light");
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(...presetColorsKeys);
    root.classList.add(colorScheme);

    localStorage.setItem("colorScheme", colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const changeColorScheme = (
    colorScheme: (typeof presetColorsKeys)[number]
  ) => {
    const root = window.document.documentElement;
    root.classList.remove(...presetColorsKeys);
    root.classList.add(colorScheme);

    setColorScheme(colorScheme);
  };

  const getEffectiveTheme = (): "light" | "dark" => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme === "dark" ? "dark" : "light";
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        colorScheme,
        changeColorScheme,
        getEffectiveTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
