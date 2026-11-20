import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../theme/theme";
import { installedInterface, systemInterface } from "./InterfacePicker";

const HEIGHT = "40px";

/** Native window-button colours (Windows/Linux overlay) for each style and theme. */
const OVERLAY = {
  win: { color: "#a21caf", symbolColor: "#ffffff" },
  macLight: { color: "#eef2fb", symbolColor: "#4a5160" },
  macDark: { color: "#0b0d14", symbolColor: "#e5e7eb" },
};

/**
 * Title bar drawn by the app in the frameless Electron window:
 * a gradient bar in the Windows 11 style, a quiet bar in the macOS style.
 * Not shown in a regular browser (development preview).
 */
export default function AppTitleBar() {
  const { pathname } = useLocation();
  const { isDark } = useTheme();
  const platform = window.platform;
  const visible = Boolean(platform?.isElectron);
  const isDarwin = platform?.os === "darwin";
  const style = installedInterface() ?? (pathname.startsWith("/windows") ? "win" : pathname.startsWith("/mac") ? "mac" : systemInterface());

  // Reserve the bar's height for every page while it is shown.
  useEffect(() => {
    if (!visible) return;
    document.documentElement.style.setProperty("--lf-titlebar-h", HEIGHT);
    return () => {
      document.documentElement.style.removeProperty("--lf-titlebar-h");
    };
  }, [visible]);

  // Match the native minimise / maximise / close buttons to the bar.
  useEffect(() => {
    if (!visible || isDarwin) return;
    const colors = style === "win" ? OVERLAY.win : isDark ? OVERLAY.macDark : OVERLAY.macLight;
    window.electron?.setTitleBarColors?.(colors);
  }, [visible, isDarwin, style, isDark]);

  if (!visible) return null;

  return (
    <div
      className={`lf-titlebar lf-titlebar-${style}${isDarwin ? " is-darwin" : " is-overlay"}`}
      role="banner"
    >
      <span className="lf-logo">L</span>
      <span>Logifilm</span>
    </div>
  );
}
