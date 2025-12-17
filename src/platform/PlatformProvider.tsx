import { createContext, useContext, useEffect, useState } from "react";

type Platform = "mac" | "win";
type Ctx = { platform: Platform; setPlatform: (p: Platform) => void };

const PlatformCtx = createContext<Ctx>({ platform: "mac", setPlatform: () => {} });

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [platform, setPlatform] = useState<Platform>("mac");

  useEffect(() => {
    document.documentElement.setAttribute("data-platform", platform);
    document.body.style.fontFamily =
      platform === "mac"
        ? "ui-sans-serif, -apple-system, 'SF Pro', 'Segoe UI', Roboto, Helvetica, Arial"
        : "'Segoe UI', system-ui, Roboto, Helvetica, Arial";
  }, [platform]);

  return (
    <PlatformCtx.Provider value={{ platform, setPlatform }}>
      {children}
    </PlatformCtx.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformCtx);
}
