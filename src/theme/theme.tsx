import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Thème de l'application : "system" suit le réglage de l'ordinateur,
 * "light" et "dark" forcent un thème. La préférence est mémorisée localement.
 *
 * La classe `dark` est posée sur <html> : Tailwind (darkMode: "class")
 * et la feuille glass.css s'appuient dessus.
 */
export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = "logifilm.theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Stockage indisponible : on suit le système.
  }
  return "system";
}

function applyTheme(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.dataset.theme = isDark ? "dark" : "light";
  root.style.colorScheme = isDark ? "dark" : "light";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const query = media();
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  const isDark = preference === "dark" || (preference === "system" && systemDark);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      isDark,
      setPreference: (next) => {
        setPreferenceState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Préférence non mémorisée, mais appliquée pour la session.
        }
      },
    }),
    [preference, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return context;
}

/** Raccourci pour les pages qui ont seulement besoin de savoir si le thème est sombre. */
export function useIsDark() {
  return useTheme().isDark;
}
