import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, LoaderCircle, Shield, ShieldOff, Users, X } from "lucide-react";
import { api } from "../../services/api";
import { supabase } from "../../supabaseClient";
import {
  amIAdmin,
  forgetAdminCheck,
  listTeam,
  setCompanyAccess,
  setPlatformAdmin,
  type TeamMember,
} from "../../services/license";
import type { GlassOS } from "../glass/Glass";

type Company = { id: string; name: string };

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** Rendered at the root of the page, like the requests panel (see AccessRequests). */
function Overlay({ os, children }: { os: GlassOS; children: ReactNode }) {
  return createPortal(<div className={`lf ${os === "win" ? "lf-win" : "lf-mac"}`}>{children}</div>, document.body);
}

/**
 * Administrators only: every account with its role, the companies each colleague can
 * open (click a company to give or take access) and the administrator role.
 * Renders nothing for everybody else.
 */
export default function TeamManager({ os }: { os: GlassOS }) {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    amIAdmin().then((yes) => active && setAdmin(yes));
    supabase.auth.getSession().then(({ data }) => active && setMe(data.session?.user.id ?? null));
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [members, list] = await Promise.all([listTeam(), api.getAllCompanies()]);
      setTeam(members);
      setCompanies(list || []);
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : "The team could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function toggleAccess(member: TeamMember, company: Company) {
    const grant = !member.company_ids.includes(company.id);
    setBusy(`${member.user_id}:${company.id}`);
    setFeedback(null);
    try {
      await setCompanyAccess(member.user_id, company.id, grant);
      setTeam((current) =>
        current.map((m) =>
          m.user_id !== member.user_id
            ? m
            : { ...m, company_ids: grant ? [...m.company_ids, company.id] : m.company_ids.filter((id) => id !== company.id) },
        ),
      );
      setFeedback({ ok: true, text: `${member.email} ${grant ? "can now open" : "no longer has access to"} ${company.name}.` });
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : "The access could not be changed." });
    } finally {
      setBusy(null);
    }
  }

  async function toggleAdmin(member: TeamMember) {
    const makeAdmin = !member.is_admin;
    const question = makeAdmin
      ? `Make ${member.email} an administrator? They will manage every company and every account.`
      : `Remove the administrator role from ${member.email}? They will only see the companies you give them.`;
    if (!window.confirm(question)) return;
    setBusy(member.user_id);
    setFeedback(null);
    try {
      await setPlatformAdmin(member.user_id, makeAdmin);
      forgetAdminCheck();
      setTeam((current) => current.map((m) => (m.user_id === member.user_id ? { ...m, is_admin: makeAdmin } : m)));
      setFeedback({ ok: true, text: `${member.email} is now ${makeAdmin ? "an administrator" : "a colleague"}.` });
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : "The role could not be changed." });
    } finally {
      setBusy(null);
    }
  }

  if (!admin) return null;

  return (
    <>
      <button type="button" className="lf-btn lf-btn-ghost lf-btn-sm" onClick={() => setOpen(true)}>
        <Users /> Team
      </button>

      <Overlay os={os}>
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
                aria-labelledby="lf-team-title"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
              >
                <header className="lf-modal-head">
                  <div>
                    <h2 id="lf-team-title">Team</h2>
                    <p className="lf-muted">Administrators manage every company. Click a company to give a colleague access, or take it away.</p>
                  </div>
                  <button type="button" className="lf-icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                    <X />
                  </button>
                </header>

                {feedback && (
                  <div className={feedback.ok ? "lf-info" : "lf-alert"} role="status" style={{ margin: "0 18px 12px" }}>
                    {feedback.text}
                  </div>
                )}

                {loading ? (
                  <p className="lf-muted" style={{ padding: "8px 18px 22px" }}>Loading the team…</p>
                ) : team.length === 0 ? (
                  <p className="lf-muted" style={{ padding: "8px 18px 22px" }}>No approved account yet.</p>
                ) : (
                  <ul className="lf-request-list">
                    {team.map((member) => {
                      const self = member.user_id === me;
                      return (
                        <li key={member.user_id} style={{ alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <strong>
                              {member.email ?? "Unknown email"}
                              {self && <span className="lf-muted" style={{ display: "inline", marginLeft: 6 }}>(you)</span>}
                            </strong>
                            <span>
                              {member.is_admin ? "Administrator" : "Colleague"}
                              {" · "}
                              {member.licence_expires_at ? `licence until ${formatDate(member.licence_expires_at)}` : "unlimited licence"}
                            </span>

                            <div className="lf-team-companies">
                              {member.is_admin ? (
                                <em>Sees every company</em>
                              ) : companies.length === 0 ? (
                                <em>Create a company first, then give access here.</em>
                              ) : (
                                companies.map((company) => {
                                  const has = member.company_ids.includes(company.id);
                                  const key = `${member.user_id}:${company.id}`;
                                  return (
                                    <button
                                      key={company.id}
                                      type="button"
                                      className={`lf-team-company${has ? " is-on" : ""}`}
                                      aria-pressed={has}
                                      onClick={() => toggleAccess(member, company)}
                                      disabled={busy !== null}
                                      title={has ? `Take ${company.name} away` : `Give access to ${company.name}`}
                                    >
                                      {busy === key ? <LoaderCircle className="animate-spin" /> : <Building2 />}
                                      {company.name}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {!self && (
                            <button
                              type="button"
                              className={`lf-btn lf-btn-sm ${member.is_admin ? "lf-btn-danger" : "lf-btn-ghost"}`}
                              onClick={() => toggleAdmin(member)}
                              disabled={busy !== null}
                            >
                              {busy === member.user_id ? (
                                <LoaderCircle className="animate-spin" />
                              ) : member.is_admin ? (
                                <ShieldOff />
                              ) : (
                                <Shield />
                              )}
                              {member.is_admin ? "Remove admin" : "Make admin"}
                            </button>
                          )}
                        </li>
                      );
                    })}
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
