import { useState } from "react";
import { supabase } from "../supabaseClient";
import AuthView from "../components/auth/AuthView";

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
      setErrorMsg("Incorrect email or password.");
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
      setErrorMsg("Account created! Check your email to confirm it.");
      return;
    }

    onLoginSuccess();
  }

  return (
    <AuthView
      os="mac"
      vm={{ mode, setMode, email, setEmail, password, setPassword, loading, errorMsg, onLogin: handleLogin, onSignup: handleSignup }}
    />
  );
}
