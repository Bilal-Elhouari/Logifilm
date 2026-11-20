import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// 🧭 Pages principales
const StartPageMac = lazy(() => import("./pages/StartPage"));
const StartPageWindows = lazy(() => import("./pages/StartPageWindows"));
const HomeMac = lazy(() => import("./pages/HomeMac"));
const HomeWindows = lazy(() => import("./pages/HomeWindows"));
const DashboardMac = lazy(() => import("./pages/DashboardMac"));
const DashboardWindows = lazy(() => import("./pages/DashboardWindows"));
const ContractsMac = lazy(() => import("./pages/ContractsMac"));
const ContractsWindows = lazy(() => import("./pages/ContractsWindows"));
const PayrollInvoices = lazy(() => import("./pages/PayrollInvoices"));

// 🧩 Auth
const AuthMac = lazy(() => import("./pages/AuthMac"));
const AuthWindows = lazy(() => import("./pages/AuthWindows"));

// 🧩 Crew Management
const CrewManagementMac = lazy(() => import("./pages/CrewManagementMac"));
const CrewManagementWindows = lazy(() => import("./pages/CrewManagementWindows"));

// 🧾 Formulaires
const NewStarterFormMac = lazy(() => import("./pages/NewStarterFormMac"));
const NewStarterFormWindows = lazy(() => import("./pages/NewStarterFormWindows"));

// 🛡️ Guards
import InterfacePicker, { installedInterface } from "./components/shell/InterfacePicker";
import AppTitleBar from "./components/shell/AppTitleBar";
import RequireLicense from "./components/RequireLicense";
import UpdateCenter from "./components/UpdateCenter";

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Installed app: each system keeps its own design (Windows → Windows 11 style,
  // macOS → macOS style). Any other route, including the picker, is redirected.
  const locked = installedInterface();
  const lockedRoot = locked === "mac" ? "/mac" : "/windows";
  const outsideLockedStyle = locked !== null && pathname !== lockedRoot && !pathname.startsWith(`${lockedRoot}/`);

  return (
    <>
      <AppTitleBar />
      {outsideLockedStyle ? (
        <Navigate to={lockedRoot} replace />
      ) : (
      <Suspense key="routes" fallback={<div className="h-screen w-full bg-[#0a0f1c]" />}>
        <Routes>
        {/* Development only: try either style (the installed app is redirected above). */}
        <Route path="/" element={<InterfacePicker />} />

        {/* ================================
                macOS ROUTES
        ================================= */}
        <Route
          path="/mac"
          element={
              <StartPageMac onContinue={() => navigate("/mac/auth")} />
          }
        />

        <Route
          path="/mac/auth"
          element={
              <AuthMac onLoginSuccess={() => navigate("/mac/home")} />
          }
        />

        <Route
          path="/mac/home"
          element={
              <RequireLicense>
                <HomeMac />
              </RequireLicense>
          }
        />

        <Route
          path="/mac/company/:name"
          element={
              <RequireLicense>
                <DashboardMac />
              </RequireLicense>
          }
        />

        <Route
          path="/mac/company/:name/crew-management"
          element={
              <RequireLicense>
                <CrewManagementMac />
              </RequireLicense>
          }
        />

        <Route
          path="/mac/company/:name/project/:projectId"
          element={
              <RequireLicense>
                <DashboardMac />
              </RequireLicense>
          }
        />

        <Route
          path="/mac/company/:name/contracts"
          element={
              <RequireLicense>
                <ContractsMac />
              </RequireLicense>
          }
        />

        <Route
          path="/mac/company/:name/payroll"
          element={
              <RequireLicense>
                <PayrollInvoices />
              </RequireLicense>
          }
        />

        <Route
          path="/mac/new-starter/:name"
          element={
              <RequireLicense>
                <NewStarterFormMac />
              </RequireLicense>
          }
        />

        {/* ================================
               WINDOWS ROUTES
        ================================= */}
        <Route
          path="/windows"
          element={
              <StartPageWindows
                onContinue={() => navigate("/windows/auth")}
              />
          }
        />

        <Route
          path="/windows/auth"
          element={
              <AuthWindows
                onLoginSuccess={() => navigate("/windows/home")}
              />
          }
        />

        <Route
          path="/windows/home"
          element={
              <RequireLicense>
                <HomeWindows />
              </RequireLicense>
          }
        />

        <Route
          path="/windows/company/:name"
          element={
              <RequireLicense>
                <DashboardWindows />
              </RequireLicense>
          }
        />

        <Route
          path="/windows/company/:name/crew-management"
          element={
              <RequireLicense>
                <CrewManagementWindows />
              </RequireLicense>
          }
        />

        <Route
          path="/windows/company/:name/project/:projectId"
          element={
              <RequireLicense>
                <DashboardWindows />
              </RequireLicense>
          }
        />

        <Route
          path="/windows/company/:name/contracts"
          element={
              <RequireLicense>
                <ContractsWindows />
              </RequireLicense>
          }
        />

        <Route
          path="/windows/company/:name/payroll"
          element={
              <RequireLicense>
                <PayrollInvoices />
              </RequireLicense>
          }
        />

        <Route
          path="/windows/new-starter/:name"
          element={
              <RequireLicense>
                <NewStarterFormWindows />
              </RequireLicense>
          }
        />
        </Routes>
      </Suspense>
      )}

      <UpdateCenter key="update-center" />
    </>
  );
}
