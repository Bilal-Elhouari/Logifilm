import { useEffect, useState } from "react";
import { Download, ExternalLink, FolderOpen, RefreshCw, RotateCcw, X } from "lucide-react";
import type { UpdateStatus } from "../types/electron";

const initialStatus: UpdateStatus = { state: "idle" };

function statusLabel(status: UpdateStatus) {
  switch (status.state) {
    case "checking":
      return "Verification en cours...";
    case "available":
      return status.message
        ? `Version ${status.version ?? "plus recente"} disponible. ${status.message}`
        : `Version ${status.version ?? "plus recente"} disponible`;
    case "not-available":
      return status.message ?? "Logifilm est a jour";
    case "downloading":
      return `Telechargement ${status.percent ?? 0}%`;
    case "downloaded":
      return `Version ${status.version ?? ""} prete a installer`;
    case "manual-download":
      return status.message ?? "Ouvrez le DMG telecharge puis remplacez Logifilm dans Applications.";
    case "disabled":
      return status.message ?? "Disponible dans l'application installee";
    case "error":
      return status.message ?? "Impossible de verifier les mises a jour";
    default:
      return `Version installee : ${window.platform?.version ?? ""}`;
  }
}

export default function UpdateCenter() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<UpdateStatus>(initialStatus);

  useEffect(() => {
    return window.electron?.onUpdateStatus(setStatus);
  }, []);

  if (!window.platform?.isElectron || !window.electron) return null;

  const busy = status.state === "checking" || status.state === "downloading";
  const isMac = window.platform.os === "darwin";
  const osName = isMac ? "macOS" : "Windows";
  const panelClass = isMac
    ? "rounded-2xl border border-white/25 bg-white/75 text-[#17171a] shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-2xl dark:border-white/15 dark:bg-[#28282c]/80 dark:text-white"
    : "rounded-md border border-white/10 bg-[#202226] text-white shadow-[0_14px_45px_rgba(0,0,0,0.45)]";
  const secondaryTextClass = isMac
    ? "text-black/55 dark:text-white/60"
    : "text-white/60";
  const closeClass = isMac
    ? "rounded-full text-black/50 hover:bg-black/10 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
    : "rounded-sm text-white/60 hover:bg-white/10 hover:text-white";
  const primaryButtonClass = isMac
    ? "rounded-full bg-[#007aff] text-white hover:bg-[#006ee6]"
    : "rounded-sm border border-[#4c9aff]/40 bg-[#0067c0] text-white hover:bg-[#0878d1]";
  const installButtonClass = isMac
    ? "rounded-full bg-[#34c759] text-white hover:bg-[#2db44f]"
    : "rounded-sm border border-[#4bc27b]/40 bg-[#16834b] text-white hover:bg-[#1b9658]";
  const secondaryButtonClass = isMac
    ? "rounded-full border border-black/10 bg-black/5 text-black/70 hover:bg-black/10 hover:text-black dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
    : "rounded-sm border border-white/15 text-white/75 hover:bg-white/10 hover:text-white";
  const triggerClass = isMac
    ? "rounded-full border border-white/30 bg-white/75 text-[#17171a] shadow-[0_8px_30px_rgba(0,0,0,0.22)] backdrop-blur-2xl hover:bg-white/90 dark:border-white/15 dark:bg-[#2c2c30]/85 dark:text-white dark:hover:bg-[#36363b]"
    : "rounded-sm border border-white/15 bg-[#292b30] text-white/85 shadow-lg hover:border-[#4c9aff]/45 hover:bg-[#34373d] hover:text-white";

  return (
    <div
      className="fixed bottom-3 right-3 z-[100]"
      style={{ fontFamily: isMac ? "'SF Pro Display', -apple-system, system-ui" : "'Segoe UI', system-ui" }}
    >
      {open && (
        <section className={`mb-2 w-[min(360px,calc(100vw-24px))] p-4 ${panelClass}`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Mise a jour Logifilm pour {osName}</h2>
              <p className={`mt-1 max-h-20 overflow-hidden break-words text-xs leading-5 ${secondaryTextClass}`}>
                {statusLabel(status)}
              </p>
            </div>
            <button
              type="button"
              title="Fermer"
              onClick={() => setOpen(false)}
              className={`grid h-8 w-8 shrink-0 place-items-center ${closeClass}`}
            >
              <X size={16} />
            </button>
          </div>

          {status.state === "downloading" && (
            <div className={`mb-3 h-1.5 overflow-hidden ${isMac ? "rounded-full bg-black/10 dark:bg-white/10" : "rounded-sm bg-white/10"}`}>
              <div
                className={`h-full transition-[width] ${isMac ? "rounded-full bg-[#007aff]" : "bg-[#60aef5]"}`}
                style={{ width: `${status.percent ?? 0}%` }}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {status.state === "available" && (
              <button
                type="button"
                onClick={() => window.electron?.downloadUpdate()}
                className={`flex h-9 items-center gap-2 px-3 text-xs font-semibold ${primaryButtonClass}`}
              >
                <Download size={15} />
                Telecharger pour {osName}
              </button>
            )}

            {status.state === "downloaded" && (
              <button
                type="button"
                onClick={() => window.electron?.installUpdate()}
                className={`flex h-9 items-center gap-2 px-3 text-xs font-semibold ${installButtonClass}`}
              >
                <RotateCcw size={15} />
                Redemarrer et installer
              </button>
            )}

            {status.state === "manual-download" && isMac && (
              <button
                type="button"
                onClick={() => window.electron?.openDownloads()}
                className={`flex h-9 items-center gap-2 px-3 text-xs font-semibold ${primaryButtonClass}`}
              >
                <FolderOpen size={15} />
                Ouvrir Telechargements
              </button>
            )}

            {status.state !== "available" && status.state !== "downloaded" && status.state !== "manual-download" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => window.electron?.checkForUpdates()}
                className={`flex h-9 items-center gap-2 px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-50 ${primaryButtonClass}`}
              >
                <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
                Verifier
              </button>
            )}

            <button
              type="button"
              onClick={() => window.electron?.openReleases()}
              className={`flex h-9 items-center gap-2 px-3 text-xs font-medium ${secondaryButtonClass}`}
            >
              <ExternalLink size={15} />
              Telechargements {osName}
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        title="Mises a jour"
        onClick={() => setOpen((current) => !current)}
        className={`ml-auto flex h-9 items-center gap-2 px-3 text-xs font-medium ${triggerClass}`}
      >
        {status.state === "available" ? <Download size={15} /> : <RefreshCw size={15} />}
        Mise a jour
        {status.state === "available" && <span className="h-2 w-2 rounded-full bg-blue-400" />}
      </button>
    </div>
  );
}
