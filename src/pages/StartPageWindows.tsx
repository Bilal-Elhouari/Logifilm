import { motion } from "framer-motion";
import windowsBg from "@/assets/windows-bg.jpg";

export default function StartPageWindows({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="relative h-screen w-full flex flex-col items-center justify-center text-white"
      style={{
        backgroundImage: `url(${windowsBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay bleu Windows */}
      <div className="absolute inset-0 bg-[#4a6fa5]/40 backdrop-blur-sm" />

      <div className="relative flex flex-col items-center gap-6">

        {/* Avatar animé */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-32 h-32 rounded-full bg-white/15 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.1)]"
        >
          <svg
            className="w-16 h-16 text-white/80"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.121 17.804A4 4 0 018 17h8a4 4 0 012.879.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </motion.div>

        {/* Texte Welcome */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl font-light drop-shadow-lg"
        >
          Welcome
        </motion.h1>

        {/* Nouveau Bouton Windows 11 clean */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{
            scale: 1.05,
            backgroundColor: "rgba(255,255,255,0.18)",
            boxShadow: "0 0 18px rgba(255,255,255,0.25)"
          }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          className="
    px-12 py-3 text-lg
    rounded-xl
    text-white
    bg-white/10
    backdrop-blur-xl
    shadow-[0_3px_12px_rgba(0,0,0,0.25)]
    transition-all duration-300
    outline-none
    border-none
  "
        >
          Enter
        </motion.button>



      </div>
    </div>
  );
}
