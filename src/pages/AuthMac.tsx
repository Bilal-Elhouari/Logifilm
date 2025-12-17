import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";

export default function AuthMac({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /* ----------------------------------------
     LOGIN
  ---------------------------------------- */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error("LOGIN ERROR:", error);
      setErrorMsg("Email ou mot de passe incorrect.");
      return;
    }

    onLoginSuccess();
  }

  /* ----------------------------------------
     SIGNUP + CREATE PROFILE
  ---------------------------------------- */
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("SIGNUP ERROR:", error);
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    try {
      // On récupère l'utilisateur pour être sûr d'avoir l'id
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? authData.user;

      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: email,
          });

        if (profileError) {
          console.error("PROFILE INSERT ERROR:", profileError);
          // On n'empêche pas la connexion, on log juste l'erreur
        }
      } else {
        console.warn("No user returned after signup");
      }
    } catch (err) {
      console.error("Unexpected error creating profile:", err);
      // pareil, on ne bloque pas l'utilisateur
    }

    // Check if session is established. 
    // If Supabase has "Confirm email" enabled, session will be null here.
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      // Email confirmation required case
      setLoading(false);
      setErrorMsg("Compte créé ! Veuillez vérifier vos emails pour confirmer.");
      return;
    }

    onLoginSuccess();
  }

  return (
    <div
      className="relative h-screen w-full flex items-center justify-center"
      style={{
        backgroundImage: "url('/macOS26 back.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* BLUR BACKGROUND */}
      <div className="absolute inset-0 backdrop-blur-[30px] bg-black/20" />

      {/* CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative w-[420px] bg-white/10 border border-white/20 
                   backdrop-blur-2xl rounded-2xl p-8 shadow-2xl"
        style={{
          fontFamily: "'SF Pro Display', -apple-system, Segoe UI, sans-serif",
        }}
      >
        {/* TABS */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white/10 rounded-full p-1 border border-white/20">
            <button
              onClick={() => setMode("login")}
              className={`px-6 py-2 rounded-full ${mode === "login" ? "bg-white/30 text-white" : "text-white/60"
                }`}
            >
              Connexion
            </button>

            <button
              onClick={() => setMode("signup")}
              className={`px-6 py-2 rounded-full ${mode === "signup" ? "bg-white/30 text-white" : "text-white/60"
                }`}
            >
              Créer un compte
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-red-400 text-center mb-4">{errorMsg}</p>
        )}

        {/* LOGIN FORM */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Adresse email"
              className="w-full px-4 py-3 rounded-xl bg-white/20 text-white 
                         placeholder-white/70 border border-white/30 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full px-4 py-3 rounded-xl bg-white/20 text-white 
                         placeholder-white/70 border border-white/30 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-white/30 text-white 
                         font-semibold shadow-lg border border-white/20"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </motion.button>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === "signup" && (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Adresse email"
              className="w-full px-4 py-3 rounded-xl bg-white/20 text-white 
                         placeholder-white/70 border border-white/30 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full px-4 py-3 rounded-xl bg-white/20 text-white 
                         placeholder-white/70 border border-white/30 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-white/30 text-white 
                         font-semibold shadow-lg border border-white/20"
            >
              {loading ? "Création..." : "S'inscrire"}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
