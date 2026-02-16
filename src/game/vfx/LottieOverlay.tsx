import { useEffect, useRef, useState } from 'react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';

// Inline micro-animations as JSON (small enough to embed)
// These are lightweight geometric animations

const STAR_BURST_DATA = {
  v: "5.5.7", fr: 30, ip: 0, op: 40, w: 200, h: 200,
  layers: [{
    ty: 4, nm: "star", sr: 1, ks: {
      o: { a: 1, k: [{ t: 0, s: [100] }, { t: 40, s: [0] }] },
      s: { a: 1, k: [{ t: 0, s: [0, 0] }, { t: 15, s: [120, 120] }, { t: 40, s: [80, 80] }] },
      r: { a: 1, k: [{ t: 0, s: [0] }, { t: 40, s: [180] }] },
      p: { a: 0, k: [100, 100] }, a: { a: 0, k: [0, 0] }
    },
    shapes: [{
      ty: "sr", p: { a: 0, k: [0, 0] }, or: { a: 0, k: 40 }, ir: { a: 0, k: 20 },
      r: { a: 0, k: 0 }, pt: { a: 0, k: 5 }, sy: 1, d: 1,
    }, {
      ty: "fl", c: { a: 0, k: [1, 0.85, 0.2, 1] }, o: { a: 0, k: 100 }
    }]
  }]
};

const CHECKMARK_DATA = {
  v: "5.5.7", fr: 30, ip: 0, op: 30, w: 120, h: 120,
  layers: [{
    ty: 4, nm: "circle", sr: 1, ks: {
      o: { a: 1, k: [{ t: 0, s: [0] }, { t: 8, s: [100] }, { t: 25, s: [100] }, { t: 30, s: [0] }] },
      s: { a: 1, k: [{ t: 0, s: [0, 0] }, { t: 10, s: [110, 110] }, { t: 15, s: [100, 100] }] },
      p: { a: 0, k: [60, 60] }, a: { a: 0, k: [0, 0] }, r: { a: 0, k: [0] }
    },
    shapes: [{
      ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] }, d: 1
    }, {
      ty: "fl", c: { a: 0, k: [0.13, 0.8, 0.42, 1] }, o: { a: 0, k: 100 }
    }]
  }]
};

type AnimationType = 'victory' | 'match' | 'defeat' | 'star';

const ANIM_DATA: Record<AnimationType, object> = {
  victory: STAR_BURST_DATA,
  match: CHECKMARK_DATA,
  defeat: STAR_BURST_DATA,
  star: STAR_BURST_DATA,
};

interface LottieOverlayProps {
  type: AnimationType;
  show: boolean;
  onComplete?: () => void;
  className?: string;
  size?: number;
}

export function LottieOverlay({ type, show, onComplete, className = '', size = 120 }: LottieOverlayProps) {
  const [visible, setVisible] = useState(false);
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    if (show) {
      setVisible(true);
    }
  }, [show]);

  const handleComplete = () => {
    setVisible(false);
    onComplete?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.3 }}
          className={`pointer-events-none z-50 ${className}`}
        >
          <Lottie
            lottieRef={lottieRef}
            animationData={ANIM_DATA[type]}
            loop={false}
            autoplay
            onComplete={handleComplete}
            style={{ width: size, height: size }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Fullscreen Lottie celebration overlay */
export function VictoryLottieOverlay({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
        >
          <div className="flex gap-4">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                initial={{ y: 50, opacity: 0, scale: 0 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 300 }}
              >
                <Lottie
                  animationData={STAR_BURST_DATA}
                  loop={false}
                  autoplay
                  onComplete={i === 2 ? onComplete : undefined}
                  style={{ width: 100, height: 100 }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
