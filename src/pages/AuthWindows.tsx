import { useState } from "react";
import { supabase } from "../supabaseClient";
import AuthView from "../components/auth/AuthView";

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
                }
            }
        } catch (err) {
            console.error("Unexpected error creating profile:", err);
        }

        // Check if session is established
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) {
            setLoading(false);
            setErrorMsg("Account created! Check your email to confirm it.");
            return;
        }

        setLoading(false);
        onLoginSuccess();
    }

    return (
      <AuthView
        os="win"
        vm={{ mode, setMode, email, setEmail, password, setPassword, loading, errorMsg, onLogin: handleLogin, onSignup: handleSignup }}
      />
    );
}
