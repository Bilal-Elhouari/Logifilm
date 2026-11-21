import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import { FileText, LoaderCircle, Lock, Mail, Users, Wallet } from "lucide-react";
import { GlassFrame, ThemeToggle, Tile, type GlassOS } from "../glass/Glass";

export type AuthMode = "login" | "signup";

export type AuthViewModel = {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  loading: boolean;
  errorMsg: string;
  onLogin: (event: FormEvent) => void;
  onSignup: (event: FormEvent) => void;
};

const FEATURES: Array<{ icon: ReactNode; color: "violet" | "teal" | "green"; title: string; text: string }> = [
  { icon: <Users />, color: "violet", title: "Crew", text: "Starter forms, Excel and PDF exports." },
  { icon: <FileText />, color: "teal", title: "Contracts", text: "Contracts generated and stored per project." },
  { icon: <Wallet />, color: "green", title: "Payroll", text: "Invoices created from the payroll file." },
];

export default function AuthView({ os, vm }: { os: GlassOS; vm: AuthViewModel }) {
  const isLogin = vm.mode === "login";
  // Le message après inscription est une information, pas une erreur.
  const isInfo = vm.errorMsg.startsWith("Account created");

  return (
    <GlassFrame os={os} centered>
      <div className="lf-auth">
        <motion.section
          className="lf-auth-intro"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="lf-auth-logo">L</div>
          <h1>Logifilm</h1>
          <p>Film crew, contracts and payroll management, all in one place.</p>
          <ul>
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <Tile color={feature.color}>{feature.icon}</Tile>
                <div>
                  <strong>{feature.title}</strong>
                  <span>{feature.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          className="lf-auth-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="lf-segment lf-auth-tabs" role="tablist" aria-label="Sign in or sign up">
            <button type="button" role="tab" aria-selected={isLogin} className={isLogin ? "is-active" : ""} onClick={() => vm.setMode("login")}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={!isLogin} className={!isLogin ? "is-active" : ""} onClick={() => vm.setMode("signup")}>
              Create account
            </button>
          </div>

          <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
          <p className="lf-muted" style={{ margin: "4px 0 18px" }}>
            {isLogin ? "Sign in to access your companies and projects." : "An administrator approves new accounts before first use."}
          </p>

          <form onSubmit={isLogin ? vm.onLogin : vm.onSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="lf-label">
              <span>Email address</span>
              <span className="lf-field" style={{ display: "block" }}>
                <Mail />
                <input
                  className="lf-input"
                  type="email"
                  autoComplete="email"
                  value={vm.email}
                  onChange={(event) => vm.setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </span>
            </label>
            <label className="lf-label">
              <span>Password</span>
              <span className="lf-field" style={{ display: "block" }}>
                <Lock />
                <input
                  className="lf-input"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={vm.password}
                  onChange={(event) => vm.setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </span>
            </label>

            {vm.errorMsg && (
              <div className={isInfo ? "lf-info" : "lf-alert"} role={isInfo ? "status" : "alert"}>
                {vm.errorMsg}
              </div>
            )}

            <button type="submit" className="lf-btn lf-btn-primary" disabled={vm.loading} style={{ padding: "11px 16px", fontSize: 14, marginTop: 4 }}>
              {vm.loading && <LoaderCircle className="animate-spin" />}
              {isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <div style={{ marginTop: 18 }}>
            <ThemeToggle />
          </div>
        </motion.section>
      </div>
    </GlassFrame>
  );
}
