import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// 🧭 Pages principales
import StartPageMac from "./pages/StartPage";
import StartPageWindows from "./pages/StartPageWindows";
import HomeMac from "./pages/HomeMac";
import HomeWindows from "./pages/HomeWindows";
import DashboardMac from "./pages/DashboardMac";
import DashboardWindows from "./pages/DashboardWindows";

// 🧩 Auth macOS
import AuthMac from "./pages/AuthMac";

// 🧩 Auth Windows ⭐ NOUVEAU
import AuthWindows from "./pages/AuthWindows";

// 🧩 Pages Crew Management
import CrewManagementMac from "./pages/CrewManagementMac";
import CrewManagementWindows from "./pages/CrewManagementWindows";

// 🧾 Formulaires / sous-pages
import NewStarterFormMac from "./pages/NewStarterFormMac";
import NewStarterFormWindows from "./pages/NewStarterFormWindows";

export default function App() {
  const navigate = useNavigate();

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* === PAGE DE SÉLECTION DE LA PLATEFORME (OU REDIRECTION AUTO) === */}
        <Route
          path="/"
          element={
            (() => {
              // 🚀 AUTO-REDIRECT BUILD (désactivé en développement)
              const platform = import.meta.env.VITE_PLATFORM;
              const isDev = import.meta.env.DEV; // Vite fournit cette variable

              // Ne rediriger automatiquement qu'en production
              if (!isDev && platform) {
                if (platform === "mac") {
                  return <Navigate to="/mac" replace />;
                }
                if (platform === "windows") {
                  return <Navigate to="/windows" replace />;
                }
              }

              // ELSE: SHOW SELECTION SCREEN (toujours affiché en développement)
              return (
                <motion.div
                  key="selector"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0f1c] text-white"
                >
                  <h1 className="text-3xl font-semibold mb-8">
                    Choisis ton interface
                  </h1>

                  <div className="flex gap-8">
                    {/* --- macOS --- */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/mac")}
                      className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20"
                    >
                      <div className="flex flex-col items-center">
                        <img src="/mac-icon.png" className="w-12 h-12 mb-2" />
                        <span>macOS Style 🍎</span>
                      </div>
                    </motion.button>

                    {/* --- Windows --- */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/windows")}
                      className="px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20"
                    >
                      <div className="flex flex-col items-center">
                        <img src="/windows-icon.png" className="w-12 h-12 mb-2" />
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

        {/* StartPage → vers LOGIN */}
        <Route
          path="/mac"
          element={<StartPageMac onContinue={() => navigate("/mac/auth")} />}
        />

        {/* LOGIN / SIGNUP macOS */}
        <Route
          path="/mac/auth"
          element={<AuthMac onLoginSuccess={() => navigate("/mac/home")} />}
        />

        {/* Accès après login */}
        <Route path="/mac/home" element={<HomeMac />} />

        {/* Dashboard Company */}
        <Route path="/mac/company/:name" element={<DashboardMac />} />

        {/* Crew Management */}
        <Route
          path="/mac/company/:name/crew-management"
          element={<CrewManagementMac />}
        />

        {/* Start Form */}
        <Route path="/mac/new-starter/:name" element={<NewStarterFormMac />} />

        {/* ================================
                 WINDOWS ROUTES
        ================================= */}

        {/* StartPage Windows → vers LOGIN */}
        <Route
          path="/windows"
          element={
            <StartPageWindows onContinue={() => navigate("/windows/auth")} />
          }
        />

        {/* ⭐ LOGIN / SIGNUP Windows */}
        <Route
          path="/windows/auth"
          element={<AuthWindows onLoginSuccess={() => navigate("/windows/home")} />}
        />

        {/* Accès après login Windows */}
        <Route path="/windows/home" element={<HomeWindows />} />

        {/* Dashboard Company Windows */}
        <Route
          path="/windows/company/:name"
          element={<DashboardWindows />}
        />

        {/* Crew Management Windows */}
        <Route
          path="/windows/company/:name/crew-management"
          element={<CrewManagementWindows />}
        />

        {/* Start Form Windows */}
        <Route
          path="/windows/new-starter/:name"
          element={<NewStarterFormWindows />}
        />
      </Routes>
    </AnimatePresence>
  );
}
