import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, LoaderCircle, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  activateLicense,
  checkLicense,
  getDeviceInfo,
  type DeviceInfo,
  type LicenseStatus,
} from "../services/license";

const reasonMessages: Record<string, string> = {
  invalid_key: "Cette cle de licence est incorrecte.",
  expired: "Cette licence a expire.",
  device_limit: "Cette licence a atteint sa limite d'appareils.",
  suspended: "Cette licence est suspendue.",
  revoked: "Cette licence a ete revoquee.",
  not_activated: "Cette installation doit etre activee.",
  authentication_required: "Connectez-vous avant d'activer la licence.",
};

export default function RequireLicense({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isMac = location.pathname.startsWith("/mac");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setAuthenticated(Boolean(data.session));
        if (!data.session) return;

        const currentDevice = await getDeviceInfo();
        if (!active) return;
        setDevice(currentDevice);
        const currentStatus = await checkLicense(currentDevice.id);
        if (!active) return;
        setStatus(currentStatus);
        if (!currentStatus.valid) {
          setMessage(reasonMessages[currentStatus.reason ?? ""] ?? "");
        }
      } catch {
        if (active) setMessage("Le service de licence est indisponible. Verifiez Supabase.");
      } finally {
        if (active) setBusy(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!device || !key.trim()) return;
    setBusy(true);
    setMessage("");

    try {
      const result = await activateLicense(key, device);
      setStatus(result);
      setKey("");
      if (!result.valid) {
        setMessage(reasonMessages[result.reason ?? ""] ?? "Activation refusee.");
      }
    } catch {
      setMessage("Activation impossible. Verifiez la configuration Supabase.");
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

  if (busy && !status) {
    return (
      <div className={`grid h-screen place-items-center ${isMac ? "bg-[#111217]" : "bg-[#080d18]"}`}>
        <LoaderCircle className="animate-spin text-white/70" size={30} />
      </div>
    );
  }

  if (status?.valid) return <>{children}</>;

  const cardClass = isMac
    ? "rounded-3xl border border-white/20 bg-white/10 backdrop-blur-3xl"
    : "rounded-md border border-white/15 bg-[#20252f]";
  const inputClass = isMac ? "rounded-xl bg-white/10" : "rounded-sm bg-[#151a23]";
  const buttonClass = isMac ? "rounded-full bg-[#007aff]" : "rounded-sm bg-[#0067c0]";

  return (
    <div
      className={`grid min-h-screen place-items-center p-6 text-white ${isMac ? "bg-[linear-gradient(180deg,#191b22,#0d0e12)]" : "bg-[#080d18]"}`}
      style={{ fontFamily: isMac ? "'SF Pro Display', -apple-system, system-ui" : "'Segoe UI', system-ui" }}
    >
      <section className={`w-full max-w-md p-7 shadow-2xl ${cardClass}`}>
        <div className={`mb-5 grid h-12 w-12 place-items-center ${isMac ? "rounded-2xl bg-white/15" : "rounded-sm bg-[#0067c0]/25"}`}>
          <LockKeyhole size={24} />
        </div>
        <h1 className="text-xl font-semibold">Activer Logifilm</h1>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Entrez la cle fournie avec votre licence. Cette activation sera liee a cette installation.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-xs font-semibold uppercase text-white/50">Cle de licence</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={17} />
            <input
              value={key}
              onChange={(event) => setKey(event.target.value.toUpperCase())}
              placeholder="LOGIFILM-CLIENT-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              className={`h-11 w-full border border-white/15 pl-10 pr-3 text-sm uppercase outline-none focus:border-blue-400 ${inputClass}`}
            />
          </div>

          {message && <p className="text-sm text-red-300">{message}</p>}

          <button
            type="submit"
            disabled={busy || !device || !key.trim()}
            className={`flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50 ${buttonClass}`}
          >
            {busy ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
            Activer cette installation
          </button>
        </form>

        <button
          type="button"
          onClick={signOut}
          className="mt-5 flex items-center gap-2 text-xs text-white/45 hover:text-white/75"
        >
          <LogOut size={14} />
          Utiliser un autre compte
        </button>
      </section>
    </div>
  );
}
