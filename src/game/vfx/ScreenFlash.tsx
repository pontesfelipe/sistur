import { motion, AnimatePresence } from 'framer-motion';

interface ScreenFlashProps {
  show: boolean;
  color?: string;
  duration?: number;
}

/** Full-screen flash effect for impactful moments */
export function ScreenFlash({ show, color = 'rgba(255,255,255,0.3)', duration = 0.4 }: ScreenFlashProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[55] pointer-events-none"
          style={{ background: color }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
        />
      )}
    </AnimatePresence>
  );
}

/** Radial pulse from center */
export function ImpactPulse({ show, color = 'rgba(250,204,21,0.4)' }: { show: boolean; color?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[55] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="rounded-full"
            style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 600, height: 600, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
