import type { ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "../../theme/theme";

/** Variante visuelle : Windows 11 (coloré) ou macOS (sobre). */
export type GlassOS = "win" | "mac";

/** Couleurs disponibles pour les tuiles, statistiques et étiquettes. */
export type GlassColor = "blue" | "amber" | "violet" | "teal" | "green" | "pink" | "red" | "slate";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

/* ---------------- Cadre de page : fond, barre latérale, contenu ---------------- */
export function GlassFrame({
  os,
  sidebar,
  children,
  centered = false,
}: {
  os: GlassOS;
  /** Sans barre latérale (accueil, connexion), le contenu est centré. */
  sidebar?: ReactNode;
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={cx("lf lf-frame", os === "win" ? "lf-win" : "lf-mac")}>
      <div className="lf-wallpaper" aria-hidden="true" />
      {sidebar && <aside className="lf-sidebar">{sidebar}</aside>}
      <main className={cx("lf-main", centered && "lf-main-centered")}>{children}</main>
    </div>
  );
}

/** Pastille de couleur stable pour un texte (société, projet…). */
export function colorFor(value: string): GlassColor {
  return hashColor(value);
}

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="lf-brand">
      <span className="lf-logo">L</span>
      <div style={{ minWidth: 0 }}>
        <div>Logifilm</div>
        {subtitle && (
          <div className="lf-muted" style={{ fontSize: 12, fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

export function Tile({ color, children }: { color: GlassColor; children: ReactNode }) {
  return <span className={cx("lf-tile", `lf-c-${color}`)}>{children}</span>;
}

export function NavSection({ children }: { children: ReactNode }) {
  return <div className="lf-navsec">{children}</div>;
}

export function NavItem({
  icon,
  color,
  label,
  active = false,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  color: GlassColor;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx("lf-nav-item", active && "is-active")}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      <Tile color={color}>{icon}</Tile>
      <span>{label}</span>
    </button>
  );
}

export function SidebarFooter({ children }: { children: ReactNode }) {
  return <div className="lf-side-foot">{children}</div>;
}

/* ---------------- En-tête de page ---------------- */
export function Hero({
  crumbs,
  title,
  subtitle,
  actions,
}: {
  crumbs?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="lf-hero">
      <div style={{ minWidth: 0 }}>
        {crumbs && <div className="lf-crumbs">{crumbs}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="lf-actions">{actions}</div>}
    </header>
  );
}

/* ---------------- Chiffres clés ---------------- */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="lf-stats">{children}</div>;
}

export function StatCard({
  icon,
  color,
  value,
  label,
}: {
  icon: ReactNode;
  color: GlassColor;
  value: ReactNode;
  label: string;
}) {
  return (
    <div className={cx("lf-stat", `lf-c-${color}`)}>
      <Tile color={color}>{icon}</Tile>
      <div>
        <b>{value}</b>
        <small>{label}</small>
      </div>
    </div>
  );
}

/* ---------------- Panneau ---------------- */
export function Panel({
  title,
  actions,
  children,
  bodyClassName = "lf-panel-body",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="lf-panel">
      {(title || actions) && (
        <div className="lf-panel-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions && <div className="lf-actions">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ---------------- Personnes et départements ---------------- */
const PALETTE: GlassColor[] = ["violet", "blue", "teal", "amber", "pink", "green"];

function hashColor(value: string): GlassColor {
  let hash = 0;
  for (const char of value.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** Étiquette colorée : la couleur est stable pour un même département. */
export function DeptChip({ name }: { name?: string | null }) {
  const label = (name || "").trim();
  if (!label) return null;
  return <span className={cx("lf-chip", `lf-c-${hashColor(label)}`)}>{label}</span>;
}

export function Avatar({ first, last }: { first?: string | null; last?: string | null }) {
  const initials = `${(first || "").trim().charAt(0)}${(last || "").trim().charAt(0)}`.toUpperCase() || "?";
  const color = hashColor(`${first || ""}${last || ""}`);
  return (
    <span className={cx("lf-avatar", `lf-c-${color}`)} aria-hidden="true">
      {initials}
    </span>
  );
}

/* ---------------- Bascule Système / Clair / Sombre ---------------- */
const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: ReactNode }> = [
  { value: "system", label: "Auto", icon: <Monitor /> },
  { value: "light", label: "Light", icon: <Sun /> },
  { value: "dark", label: "Dark", icon: <Moon /> },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="lf-theme-toggle" role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          className={cx(preference === option.value && "is-active")}
          onClick={() => setPreference(option.value)}
          title={`Theme: ${option.label}`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
