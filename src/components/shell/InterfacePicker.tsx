import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Laptop, Monitor } from "lucide-react";
import { Brand, GlassFrame, ThemeToggle, Tile, type GlassOS } from "../glass/Glass";

const STORAGE_KEY = "logifilm.interface";

/** The style that matches the computer the app runs on. */
export function systemInterface(): GlassOS {
  const os = window.platform?.os;
  if (os === "darwin") return "mac";
  if (os === "win32") return "win";
  return /Mac/i.test(navigator.userAgent) ? "mac" : "win";
}

function lastInterface(): GlassOS | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "mac" || stored === "win" ? stored : null;
  } catch {
    return null;
  }
}

const CHOICES: Array<{ os: GlassOS; title: string; text: string; icon: React.ReactNode; color: "blue" | "violet"; path: string }> = [
  {
    os: "mac",
    title: "macOS style",
    text: "Liquid glass, rounded corners and system blue. Calm and minimal.",
    icon: <Laptop />,
    color: "blue",
    path: "/mac",
  },
  {
    os: "win",
    title: "Windows 11 style",
    text: "Mica, colourful tiles and gradients. Bold and vivid.",
    icon: <Monitor />,
    color: "violet",
    path: "/windows",
  },
];

/** Start screen: lets the user choose the macOS or Windows 11 interface, on any computer. */
export default function InterfacePicker() {
  const navigate = useNavigate();
  const recommended = systemInterface();
  const last = lastInterface();

  const choose = (os: GlassOS, path: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, os);
    } catch {
      // Not remembered, but the choice still applies for this session.
    }
    navigate(path);
  };

  return (
    <GlassFrame os={last ?? recommended} centered>
      <div className="lf-topbar">
        <Brand />
        <ThemeToggle />
      </div>

      <div className="lf-start" style={{ minHeight: "auto", padding: "40px 0 8px" }}>
        <h1 style={{ fontSize: 38 }}>Choose your interface</h1>
        <p>Both styles have the same features. You can switch at any time from this screen.</p>
      </div>

      <div className="lf-picker">
        {CHOICES.map((choice, index) => (
          <motion.button
            key={choice.os}
            type="button"
            className={`lf-picker-card lf-picker-${choice.os}`}
            onClick={() => choose(choice.os, choice.path)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
            autoFocus={choice.os === (last ?? recommended)}
          >
            <div className="lf-picker-preview" aria-hidden="true">
              <span className="lf-picker-bar" />
              <span className="lf-picker-side" />
              <span className="lf-picker-hero" />
              <span className="lf-picker-row" />
              <span className="lf-picker-row" />
            </div>
            <div className="lf-picker-body">
              <Tile color={choice.color}>{choice.icon}</Tile>
              <div style={{ minWidth: 0 }}>
                <strong>{choice.title}</strong>
                <span>{choice.text}</span>
                <div className="lf-picker-badges">
                  {choice.os === recommended && <em className="lf-chip lf-c-green">Matches this computer</em>}
                  {choice.os === last && <em className="lf-chip lf-c-blue">Last used</em>}
                </div>
              </div>
              <ArrowRight className="lf-picker-arrow" />
            </div>
          </motion.button>
        ))}
      </div>
    </GlassFrame>
  );
}
