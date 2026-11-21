import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Clock, KeyRound, LoaderCircle, LockKeyhole, LogOut, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { GlassFrame, Tile } from "./glass/Glass";
import {
  activateLicense,
  checkLicense,
  myAccessRequest,
  type AccessRequestStatus,
  type LicenseStatus,
} from "../services/license";

const reasonMessages: Record<string, string> = {
  invalid_key: "This licence key is invalid.",
  expired: "This licence has expired.",
  account_limit: "This licence has reached its account limit.",
  suspended: "This licence is suspended.",
  revoked: "This licence has been revoked.",
  not_activated: "This account needs to be activated.",
  authentication_required: "Sign in before activating the licence.",
};

export default function RequireLicense({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isMac = location.pathname.startsWith("/mac");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState<AccessRequestStatus | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function load(showSpinner = true) {
      if (showSpinner) setBusy(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setAuthenticated(Boolean(data.session));
        if (!data.session) return;

        const currentStatus = await checkLicense();
        if (!active) return;
        setStatus(currentStatus);
        if (!currentStatus.valid) {
          setMessage(reasonMessages[currentStatus.reason ?? ""] ?? "");
          // New accounts wait for an administrator: show where their request stands.
          const requestStatus = await myAccessRequest().catch(() => "none" as const);
          if (active) setRequest(requestStatus);
        }
      } catch {
        if (active) setMessage("The licence service is unavailable. Check your connection.");
      } finally {
        if (active) setBusy(false);
      }
    }

    load();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthenticated(Boolean(session));
      if (session) {
        void load(false);
      } else {
        setStatus(null);
      }
    });
    const refreshId = window.setInterval(() => {
      if (active) void load(false);
    }, 5 * 60 * 1000);

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.clearInterval(refreshId);
    };
  }, [reloadToken]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    setMessage("");

    try {
      const result = await activateLicense(key);
      setStatus(result);
      setKey("");
      if (!result.valid) {
        setMessage(reasonMessages[result.reason ?? ""] ?? "Activation refused.");
      }
    } catch {
      setMessage("Activation failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthenticated(false);
  }

  if (authenticated === false) {
    return <Navigate to={isMac ? "/mac/auth" : "/windows/auth"} replace />;
  }

  const os = isMac ? "mac" : "win";

  if (busy && !status) {
    return (
      <GlassFrame os={os} centered>
        <div className="lf-start" aria-busy="true">
          <LoaderCircle className="animate-spin" size={30} style={{ color: "var(--ink-3)" }} />
          <p>Checking licence…</p>
        </div>
      </GlassFrame>
    );
  }

  if (status?.valid) return <>{children}</>;

  const keyForm = (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label className="lf-label">
        <span>Licence key</span>
        <span className="lf-field" style={{ display: "block" }}>
          <KeyRound />
          <input
            className="lf-input"
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            placeholder="LOGIFILM-XXXXXXXX-XXXXXXXX"
            autoComplete="off"
            spellCheck={false}
            style={{ textTransform: "uppercase", fontFamily: "ui-monospace, monospace" }}
          />
        </span>
      </label>

      {message && request !== "pending" && request !== "rejected" && <div className="lf-alert" role="alert">{message}</div>}

      <button type="submit" className="lf-btn lf-btn-primary" disabled={busy || !key.trim()} style={{ padding: "11px 16px", fontSize: 14 }}>
        {busy ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
        Activate this account
      </button>
    </form>
  );

  const waiting = request === "pending";
  const declined = request === "rejected";

  return (
    <GlassFrame os={os} centered>
      <div className="lf-start">
        <section className="lf-auth-card" style={{ textAlign: "left" }}>
          {waiting ? (
            <>
              <Tile color="amber"><Clock /></Tile>
              <h2>Waiting for approval</h2>
              <p className="lf-muted" style={{ margin: "6px 0 18px", lineHeight: 1.5 }}>
                Your account has been created. An administrator needs to approve it before you can use Logifilm.
                You can close the app: your access opens as soon as it is approved.
              </p>
              <button type="button" className="lf-btn lf-btn-primary" onClick={() => setReloadToken((n) => n + 1)} disabled={busy} style={{ padding: "11px 16px", fontSize: 14, width: "100%" }}>
                {busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                Check again
              </button>
            </>
          ) : declined ? (
            <>
              <Tile color="red"><XCircle /></Tile>
              <h2>Request declined</h2>
              <p className="lf-muted" style={{ margin: "6px 0 18px", lineHeight: 1.5 }}>
                Your access request was not approved. Contact your administrator if you think this is a mistake.
              </p>
            </>
          ) : (
            <>
              <Tile color="violet"><LockKeyhole /></Tile>
              <h2>Activate Logifilm</h2>
              <p className="lf-muted" style={{ margin: "6px 0 18px", lineHeight: 1.5 }}>
                Enter the key provided with your licence. It will be linked to your account and work on all your computers.
              </p>
              {keyForm}
            </>
          )}

          {(waiting || declined) && (
            <div style={{ marginTop: 16 }}>
              {showKeyForm ? (
                keyForm
              ) : (
                <button type="button" className="lf-btn lf-btn-ghost lf-btn-sm" onClick={() => setShowKeyForm(true)}>
                  <KeyRound /> I have a licence key
                </button>
              )}
            </div>
          )}

          <button type="button" className="lf-btn lf-btn-ghost lf-btn-sm" onClick={signOut} style={{ marginTop: 16 }}>
            <LogOut /> Use another account
          </button>
        </section>
      </div>
    </GlassFrame>
  );
}
