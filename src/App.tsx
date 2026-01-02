import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// 🧭 Pages principales
import StartPageMac from "./pages/StartPage";
import StartPageWindows from "./pages/StartPageWindows";
import HomeMac from "./pages/HomeMac";
import HomeWindows from "./pages/HomeWindows";
import DashboardMac from "./pages/DashboardMac";
import DashboardWindows from "./pages/DashboardWindows";

// 🧩 Auth
import AuthMac from "./pages/AuthMac";
import AuthWindows from "./pages/AuthWindows";

// 🧩 Crew Management
import CrewManagementMac from "./pages/CrewManagementMac";
import CrewManagementWindows from "./pages/CrewManagementWindows";

// 🧾 Formulaires
import NewStarterFormMac from "./pages/NewStarterFormMac";
import NewStarterFormWindows from "./pages/NewStarterFormWindows";

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
               * AUTO-REDIRECT :
               * - UNIQUEMENT pour le web
               * - JAMAIS dans Electron
               */
              if (!isDev && platform && !isElectron) {
                if (platform === "mac") {
                  return <Navigate to="/mac" replace />;
                }
                if (platform === "windows") {
                  return <Navigate to="/windows" replace />;
                }
              }

              /**
               * MENU (toujours affiché en dev et en Electron)
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
          element={<StartPageMac onContinue={() => navigate("/mac/auth")} />}
        />

        <Route
          path="/mac/auth"
          element={<AuthMac onLoginSuccess={() => navigate("/mac/home")} />}
        />

        <Route path="/mac/home" element={<HomeMac />} />

        <Route path="/mac/company/:name" element={<DashboardMac />} />

        <Route
          path="/mac/company/:name/crew-management"
          element={<CrewManagementMac />}
        />

        <Route
          path="/mac/new-starter/:name"
          element={<NewStarterFormMac />}
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

        <Route path="/windows/home" element={<HomeWindows />} />

        <Route
          path="/windows/company/:name"
          element={<DashboardWindows />}
        />

        <Route
          path="/windows/company/:name/crew-management"
          element={<CrewManagementWindows />}
        />

        <Route
          path="/windows/new-starter/:name"
          element={<NewStarterFormWindows />}
        />
      </Routes>
    </AnimatePresence>
  );
}
