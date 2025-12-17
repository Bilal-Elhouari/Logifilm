import { motion } from "framer-motion";
import macBg from "@/assets/mac-bg.jpg";

export default function StartPage({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="relative h-screen w-full overflow-hidden flex flex-col items-center justify-center"
      style={{
        backgroundImage: `url(${macBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Voile + flou */}
      <div className="absolute inset-0 backdrop-blur-[25px] bg-black/20" />

      {/* LOGO TEXTE VERRE TRANSPARENT ET BRILLANT */}
      <motion.h1


        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="relative text-[96px] font-semibold select-none tracking-wide"
        style={{
          fontFamily:
            "'SF Pro Display', 'Segoe UI', system-ui, -apple-system, sans-serif",
          color: "transparent",
          WebkitTextStroke: "1px rgba(255,255,255,0.3)", // contour doux
          textShadow: `
      0 2px 8px rgba(0,0,0,0.5),
      0 -1px 6px rgba(255,255,255,0.25),
      0 0 18px rgba(255,255,255,0.15)
    `,
          filter:
            "drop-shadow(0 3px 12px rgba(0,0,0,0.6)) brightness(1.2) contrast(1.1) saturate(1.1)",
          mixBlendMode: "screen", // fusion lumineuse avec le fond
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1.8 }}
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.2) 100%)",
            backgroundSize: "100% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
          }}
        >
          Logifilm
        </motion.span>
      </motion.h1>

      {/* Animation de lumière */}
      <motion.div
        initial={{ x: "-150%" }}
        animate={{ x: "150%" }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        className="absolute w-[220px] h-[140px] bg-gradient-to-r from-transparent via-white/40 to-transparent blur-[40px] top-[38%]"
      />

      {/* BOUTON */}
      <motion.button
        onClick={onContinue}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="relative mt-10 px-14 py-4 text-xl rounded-full text-white font-semibold shadow-[inset_0_0_30px_rgba(255,255,255,0.15)] border border-white/20 backdrop-blur-2xl bg-white/10 hover:bg-white/20 transition-all"
        style={{
          fontFamily:
            "'SF Pro Display', 'Segoe UI', system-ui, -apple-system, sans-serif",
        }}
      >
        Bienvenue
      </motion.button>

      {/* Ombre douce */}
      <div className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}
