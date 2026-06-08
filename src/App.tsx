import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// 🧭 Pages principales
import StartPageMac from "./pages/StartPage";
import StartPageWindows from "./pages/StartPageWindows";
import HomeMac from "./pages/HomeMac";
import HomeWindows from "./pages/HomeWindows";
import DashboardMac from "./pages/DashboardMac";
import DashboardWindows from "./pages/DashboardWindows";
import ContractsMac from "./pages/ContractsMac";
import ContractsWindows from "./pages/ContractsWindows";

// 🧩 Auth
import AuthMac from "./pages/AuthMac";
import AuthWindows from "./pages/AuthWindows";

// 🧩 Crew Management
import CrewManagementMac from "./pages/CrewManagementMac";
import CrewManagementWindows from "./pages/CrewManagementWindows";

// 🧾 Formulaires
import NewStarterFormMac from "./pages/NewStarterFormMac";
import NewStarterFormWindows from "./pages/NewStarterFormWindows";

// 🛡️ Guards
import RequireOS from "./components/RequireOS";
import UpdateCenter from "./components/UpdateCenter";

export default function App() {
  const navigate = useNavigate();

  // 🔍 ENV
  const isDev = import.meta.env.DEV;
  const platform = import.meta.env.VITE_PLATFORM;

  // 🧠 Détection Electron (clé de la solution)
  const isElectron =
    typeof window !== "undefined" &&
    window.isElectron === true;

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* ================================
              ROOT — MENU / REDIRECTION
        ================================= */}
        <Route
          path="/"
          element={
            (() => {
              /**
               * 🧠 LOGIQUE DE ROUTING INTELLIGENTE
               * 
               * 1. Mode Développement :
               *    -> Toujours afficher le menu de sélection
               * 
               * 2. Mode Production (Application installée) :
               *    -> Redirection AUTOMATIQUE selon l'OS détecté par Electron
               *    -> Pas de menu, pas de choix possible
               */

              // Détection de l'OS via Electron (exposé dans preload.ts)
              const platformInfo = window.platform;
              // platformInfo est maintenant un objet : { os: 'darwin'|'win32', isProd: boolean, isElectron: boolean }
              // ou undefined si on est sur le web classique

              const osPlatform = platformInfo?.os;
              const isProdElectron = platformInfo?.isProd;

              // En PROD uniquement (et si on est bien dans Electron) : Redirection automatique
              if (isProdElectron && osPlatform) {
                if (osPlatform === "darwin") {
                  return <Navigate to="/mac" replace />;
                }
                if (osPlatform === "win32") {
                  return <Navigate to="/windows" replace />;
                }
              }

              /**
               * MENU DE SÉLECTION
               * Affiché si :
               * - On est en mode DEV
               * - OU on est sur le Web (pas Electron)
               */
              return (
                <motion.div
                  key="selector"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0f1c] text-white"
                >
                  <h1 className="text-3xl font-semibold mb-8">
                    Choisis ton interface
                  </h1>

                  {isDev && (
                    <div className="absolute top-4 left-4 text-xs text-white/30 font-mono">
                      DEV MODE: SELECTION ENABLED
                    </div>
                  )}

                  <div className="flex gap-8">
                    {/* macOS */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/mac")}
                      className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20"
                    >
                      <div className="flex flex-col items-center">
                        <img
                          src="/mac-icon.png"
                          className="w-12 h-12 mb-2"
                        />
                        <span>macOS Style 🍎</span>
                      </div>
                    </motion.button>

                    {/* Windows */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/windows")}
                      className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20"
                    >
                      <div className="flex flex-col items-center">
                        <img
                          src="/windows-icon.png"
                          className="w-12 h-12 mb-2"
                        />
                        <span>Windows 11 Style 🪟</span>
                      </div>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })()
          }
        />

        {/* ================================
                macOS ROUTES
        ================================= */}
        <Route
          path="/mac"
          element={
            <RequireOS os="darwin">
              <StartPageMac onContinue={() => navigate("/mac/auth")} />
            </RequireOS>
          }
        />

        <Route
          path="/mac/auth"
          element={
            <RequireOS os="darwin">
              <AuthMac onLoginSuccess={() => navigate("/mac/home")} />
            </RequireOS>
          }
        />

        <Route
          path="/mac/home"
          element={
            <RequireOS os="darwin">
              <HomeMac />
            </RequireOS>
          }
        />

        <Route
          path="/mac/company/:name"
          element={
            <RequireOS os="darwin">
              <DashboardMac />
            </RequireOS>
          }
        />

        <Route
          path="/mac/company/:name/crew-management"
          element={
            <RequireOS os="darwin">
              <CrewManagementMac />
            </RequireOS>
          }
        />

        <Route
          path="/mac/company/:name/contracts"
          element={
            <RequireOS os="darwin">
              <ContractsMac />
            </RequireOS>
          }
        />

        <Route
          path="/mac/new-starter/:name"
          element={
            <RequireOS os="darwin">
              <NewStarterFormMac />
            </RequireOS>
          }
        />

        {/* ================================
               WINDOWS ROUTES
        ================================= */}
        <Route
          path="/windows"
          element={
            <RequireOS os="win32">
              <StartPageWindows
                onContinue={() => navigate("/windows/auth")}
              />
            </RequireOS>
          }
        />

        <Route
          path="/windows/auth"
          element={
            <RequireOS os="win32">
              <AuthWindows
                onLoginSuccess={() => navigate("/windows/home")}
              />
            </RequireOS>
          }
        />

        <Route
          path="/windows/home"
          element={
            <RequireOS os="win32">
              <HomeWindows />
            </RequireOS>
          }
        />

        <Route
          path="/windows/company/:name"
          element={
            <RequireOS os="win32">
              <DashboardWindows />
            </RequireOS>
          }
        />

        <Route
          path="/windows/company/:name/crew-management"
          element={
            <RequireOS os="win32">
              <CrewManagementWindows />
            </RequireOS>
          }
        />

        <Route
          path="/windows/company/:name/contracts"
          element={
            <RequireOS os="win32">
              <ContractsWindows />
            </RequireOS>
          }
        />

        <Route
          path="/windows/new-starter/:name"
          element={
            <RequireOS os="win32">
              <NewStarterFormWindows />
            </RequireOS>
          }
        />
      </Routes>

      <UpdateCenter />
    </AnimatePresence>
  );
}
