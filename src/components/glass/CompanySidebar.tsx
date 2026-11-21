import { useNavigate } from "react-router-dom";
import { FileText, FolderOpen, Home, LayoutGrid, LogOut, Shuffle, Users, Wallet } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { installedInterface } from "../shell/InterfacePicker";
import AccessRequests from "../admin/AccessRequests";
import TeamManager from "../admin/TeamManager";
import { Brand, NavItem, NavSection, SidebarFooter, ThemeToggle, type GlassOS } from "./Glass";

export type CompanySection = "home" | "projects" | "project" | "crew" | "contracts" | "payroll";

/**
 * Menu latéral des pages d'une société : accueil, projets, puis les rubriques
 * du projet sélectionné (ou de tous les projets).
 */
export default function CompanySidebar({
  os,
  companyName,
  jobId,
  jobName,
  active,
}: {
  os: GlassOS;
  companyName: string;
  jobId?: string | null;
  jobName?: string | null;
  active: CompanySection;
}) {
  const navigate = useNavigate();
  const base = `/${os === "win" ? "windows" : "mac"}`;
  const company = `${base}/company/${encodeURIComponent(companyName)}`;
  const query = jobId ? `?job=${encodeURIComponent(jobId)}` : "";

  return (
    <>
      <Brand subtitle={companyName} />
      <nav aria-label="Main navigation">
        <NavItem icon={<Home />} color="blue" label="Home" onClick={() => navigate(`${base}/home`)} active={active === "home"} />
        <NavItem icon={<FolderOpen />} color="amber" label="Projects" onClick={() => navigate(company)} active={active === "projects"} />

        <NavSection>{jobId ? jobName || "Project" : "All projects"}</NavSection>
        {jobId && (
          <NavItem
            icon={<LayoutGrid />}
            color="slate"
            label="Project overview"
            onClick={() => navigate(`${company}/project/${encodeURIComponent(jobId)}`)}
            active={active === "project"}
          />
        )}
        <NavItem icon={<Users />} color="violet" label="Crew" onClick={() => navigate(`${company}/crew-management${query}`)} active={active === "crew"} />
        <NavItem icon={<FileText />} color="teal" label="Contracts" onClick={() => navigate(`${company}/contracts${query}`)} active={active === "contracts"} />
        <NavItem icon={<Wallet />} color="green" label="Payroll" onClick={() => navigate(`${company}/payroll${query}`)} active={active === "payroll"} />
      </nav>

      <SidebarFooter>
        <AccessRequests os={os} />
        <TeamManager os={os} />
        <ThemeToggle />
        {/* Development only: the installed app keeps the design of its own system. */}
        {!installedInterface() && (
          <button type="button" className="lf-btn lf-btn-ghost lf-btn-sm" onClick={() => navigate("/")}>
            <Shuffle /> Switch interface
          </button>
        )}
        <button
          type="button"
          className="lf-btn lf-btn-danger lf-btn-sm"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate(`${base}/auth`);
          }}
        >
          <LogOut /> Sign out
        </button>
      </SidebarFooter>
    </>
  );
}
