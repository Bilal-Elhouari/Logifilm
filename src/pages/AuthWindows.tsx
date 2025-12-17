import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";

export default function AuthWindows({
    onLoginSuccess,
}: {
    onLoginSuccess: () => void;
}) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    /* ----------------------------------------
       LOGIN
    ---------------------------------------- */
    async function handleLogin(e: any) {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setLoading(false);
            setErrorMsg("Email ou mot de passe incorrect.");
            return;
        }

        setLoading(false);
        onLoginSuccess();
    }

    /* ----------------------------------------
       SIGNUP + CREATE PROFILE
    ---------------------------------------- */
    async function handleSignup(e: any) {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const { data: authData, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setLoading(false);
            setErrorMsg(error.message);
            return;
        }

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user ?? authData.user;

        if (user) {
            await supabase.from("profiles").insert({
                id: user.id,
                email: email,
            });
        }

        setLoading(false);
        onLoginSuccess();
    }

    return (
        <div
            className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0c1a2c] to-[#1c2c4d]"
            style={{
                fontFamily: "'Segoe UI', sans-serif",
            }}
        >
            {/* Windows acrylic-like card */}
            <div
                className="w-[420px] rounded-2xl p-8 shadow-xl border border-white/10"
                style={{
                    background: "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(20px)",
                }}
            >
                {/* Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="flex bg-white/10 rounded-full p-1">
                        <button
                            onClick={() => setMode("login")}
                            className={`px-6 py-2 rounded-full transition ${mode === "login"
                                    ? "bg-white/30 text-white"
                                    : "text-white/60"
                                }`}
                        >
                            Connexion
                        </button>
                        <button
                            onClick={() => setMode("signup")}
                            className={`px-6 py-2 rounded-full transition ${mode === "signup"
                                    ? "bg-white/30 text-white"
                                    : "text-white/60"
                                }`}
                        >
                            Créer un compte
                        </button>
                    </div>
                </div>

                {/* Error message */}
                {errorMsg && (
                    <p className="text-red-400 text-center mb-4">{errorMsg}</p>
                )}

                {/* LOGIN FORM */}
                {mode === "login" && (
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <input
                            type="email"
                            placeholder="Adresse email"
                            className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/20 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <input
                            type="password"
                            placeholder="Mot de passe"
                            className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/20 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="mt-2 w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-md"
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
                            className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/20 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <input
                            type="password"
                            placeholder="Mot de passe"
                            className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/20 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="mt-2 w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-md"
                        >
                            {loading ? "Création..." : "S'inscrire"}
                        </motion.button>
                    </form>
                )}
            </div>
        </div>
    );
}
