import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { GlassFrame, type GlassOS } from "../glass/Glass";

/** Écran d'accueil au lancement de l'application. */
export default function StartView({ os, onContinue }: { os: GlassOS; onContinue: () => void }) {
  return (
    <GlassFrame os={os} centered>
      <div className="lf-start">
        <motion.div
          className="lf-auth-logo lf-start-logo"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          L
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
          Logifilm
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
          Crew, contracts and payroll for your film shoots.
        </motion.p>
        <motion.button
          type="button"
          className="lf-btn lf-btn-primary"
          onClick={onContinue}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          style={{ padding: "12px 28px", fontSize: 15 }}
          autoFocus
        >
          Get started <ArrowRight />
        </motion.button>
      </div>
    </GlassFrame>
  );
}
