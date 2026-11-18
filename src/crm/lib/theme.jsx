import React, { createContext, useContext, useEffect, useState } from "react";
import { httpClient } from "../../shared/api/httpClient";
import { tokenManager } from "../../shared/auth/tokenManager";

const THEME_STORAGE_KEY = "fitaval_theme";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => null,
  resolvedTheme: "light",
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "dark" || saved === "light" || saved === "system") {
        return saved;
      }
    }
    return "light";
  });

  const [resolvedTheme, setResolvedTheme] = useState("light");

  // Sync theme with backend if logged in
  useEffect(() => {
    const session = tokenManager.getSession();
    if (session?.token) {
      httpClient
        .get("/auth/user/settings/")
        .then((res) => {
          const dbTheme = res?.theme || res?.data?.theme;
          if (dbTheme && (dbTheme === "dark" || dbTheme === "light" || dbTheme === "system")) {
            setThemeState((current) => {
              if (current !== dbTheme) {
                try {
                  localStorage.setItem(THEME_STORAGE_KEY, dbTheme);
                } catch (e) {}
                return dbTheme;
              }
              return current;
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (currentTheme) => {
      let effective = currentTheme;
      if (currentTheme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        effective = prefersDark ? "dark" : "light";
      }

      setResolvedTheme(effective);

      if (effective === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme(theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.error("Failed to persist theme", e);
    }

    const session = tokenManager.getSession();
    if (session?.token) {
      httpClient.patch("/auth/user/settings/", { theme: newTheme }).catch(() => {
        httpClient.patch("/auth/me/", { theme: newTheme }).catch(() => {});
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
