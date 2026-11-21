import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, LoaderCircle, UserCheck, X } from "lucide-react";
import { decideRequest, isPlatformAdmin, listPendingRequests, type PendingRequest } from "../../services/license";
import { Tile, type GlassOS } from "../glass/Glass";

const POLL_MS = 60 * 1000;
const DURATIONS: Array<{ label: string; days: number | null }> = [
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "1 year", days: 365 },
  { label: "Unlimited", days: null },
];
const DEFAULT_DURATION = "365";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Administrators only: bell with the number of accounts waiting for approval,
 * a notice at sign-in, and a panel to approve (with a licence duration) or decline.
 * Renders nothing for everybody else.
 */
/**
 * Overlays are rendered at the root of the page: the glass sidebar uses backdrop-filter,
 * which would otherwise trap fixed-position children inside it.
 */
function Overlay({ os, children }: { os: GlassOS; children: ReactNode }) {
  return createPortal(<div className={`lf ${os === "win" ? "lf-win" : "lf-mac"}`}>{children}</div>, document.body);
}

export default function AccessRequests({ os }: { os: GlassOS }) {
  const [admin, setAdmin] = useState(false);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const noticeShown = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const pending = await listPendingRequests();
      setRequests(pending);
      if (pending.length > 0 && !noticeShown.current) {
        noticeShown.current = true;
        setNotice(true);
      }
    } catch {
      // Not an administrator any more, or offline: keep the last list.
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    isPlatformAdmin().then((yes) => {
      if (!active || !yes) return;
      setAdmin(true);
      void refresh();
      timer = window.setInterval(() => void refresh(), POLL_MS);
    });
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [refresh]);

  async function decide(request: PendingRequest, approve: boolean) {
    if (!approve && !window.confirm(`Decline the request from ${request.email ?? "this account"}?`)) return;
    setBusyId(request.id);
    setFeedback("");
    try {
      const value = durations[request.id] ?? DEFAULT_DURATION;
      const days = value === "unlimited" ? null : Number(value);
      const result = await decideRequest(request.id, approve, days);
      if (!result.ok && result.reason === "already_decided") {
        setFeedback(`${request.email ?? "This request"} was already ${result.status}.`);
      } else {
        const duration = DURATIONS.find((d) => String(d.days ?? "unlimited") === value)?.label.toLowerCase();
        setFeedback(approve ? `${request.email} approved (${duration}).` : `${request.email} declined.`);
      }
      await refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  if (!admin) return null;

  const count = requests.length;

  return (
    <>
      <button
        type="button"
        className="lf-btn lf-btn-ghost lf-btn-sm lf-bell"
        onClick={() => {
          setOpen(true);
          setNotice(false);
        }}
        aria-label={count ? `${count} account request${count === 1 ? "" : "s"} waiting` : "Account requests"}
      >
        <Bell /> Requests
        {count > 0 && <span className="lf-badge-count">{count}</span>}
      </button>

      <Overlay os={os}>
      <AnimatePresence>
        {notice && count > 0 && !open && (
          <motion.div
            className="lf-toast"
            role="status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Tile color="amber"><UserCheck /></Tile>
            <div style={{ minWidth: 0 }}>
              <strong>{count} account request{count === 1 ? "" : "s"} waiting</strong>
              <span>New users need your approval.</span>
            </div>
            <button type="button" className="lf-btn lf-btn-primary lf-btn-sm" onClick={() => { setOpen(true); setNotice(false); }}>
              Review
            </button>
            <button type="button" className="lf-icon-btn" onClick={() => setNotice(false)} aria-label="Dismiss">
              <X />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="lf-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <motion.section
              className="lf-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="lf-requests-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
            >
              <header className="lf-modal-head">
                <div>
                  <h2 id="lf-requests-title">Account requests</h2>
                  <p className="lf-muted">Approving activates a licence on the account right away.</p>
                </div>
                <button type="button" className="lf-icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                  <X />
                </button>
              </header>

              {feedback && <div className="lf-info" role="status" style={{ margin: "0 18px 12px" }}>{feedback}</div>}

              {count === 0 ? (
                <p className="lf-muted" style={{ padding: "8px 18px 22px" }}>No account is waiting for approval.</p>
              ) : (
                <ul className="lf-request-list">
                  {requests.map((request) => (
                    <li key={request.id}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong>{request.email ?? "Unknown email"}</strong>
                        <span>Requested {formatDate(request.created_at)}</span>
                      </div>
                      <select
                        className="lf-select"
                        style={{ width: "auto" }}
                        value={durations[request.id] ?? DEFAULT_DURATION}
                        onChange={(event) => setDurations((current) => ({ ...current, [request.id]: event.target.value }))}
                        aria-label={`Licence duration for ${request.email ?? "this account"}`}
                        disabled={busyId === request.id}
                      >
                        {DURATIONS.map((duration) => (
                          <option key={duration.label} value={String(duration.days ?? "unlimited")}>{duration.label}</option>
                        ))}
                      </select>
                      <button type="button" className="lf-btn lf-btn-success lf-btn-sm" onClick={() => decide(request, true)} disabled={busyId !== null}>
                        {busyId === request.id ? <LoaderCircle className="animate-spin" /> : <Check />} Approve
                      </button>
                      <button type="button" className="lf-btn lf-btn-danger lf-btn-sm" onClick={() => decide(request, false)} disabled={busyId !== null}>
                        <X /> Decline
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      </Overlay>
    </>
  );
}
