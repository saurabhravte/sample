"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Cheerful completion burst (Fix #6): a unicorn gallops across with a trail of
 * confetti when a task is checked. Respects prefers-reduced-motion (renders
 * nothing animated for users who opt out). Mount once near the board root and
 * flip `show` true for ~1.5s when a task completes.
 */
export function Celebrate({ show }: { show: boolean }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  const confetti = Array.from({ length: 14 });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* the galloping unicorn */}
          <motion.div
            className="absolute top-1/2 text-5xl"
            initial={{ left: "-12%", rotate: -6 }}
            animate={{ left: "112%", rotate: [-6, 4, -6] }}
            transition={{ duration: 1.4, ease: "easeInOut", rotate: { repeat: Infinity, duration: 0.35 } }}
          >
            🦄
          </motion.div>

          {/* confetti trail */}
          {confetti.map((_, i) => (
            <motion.span
              key={i}
              className="absolute top-1/2 text-xl"
              initial={{ left: "0%", y: 0, opacity: 0 }}
              animate={{
                left: `${10 + i * 6}%`,
                y: [0, -40 - (i % 5) * 12, 60],
                opacity: [0, 1, 0],
                rotate: i * 40,
              }}
              transition={{ duration: 1.2, delay: i * 0.04, ease: "easeOut" }}
            >
              {["✨", "🎉", "⭐️", "💫"][i % 4]}
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Convenience: returns [show, fire] — call fire() on completion. */
export function useCelebrate(): [boolean, () => void] {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fire = useCallback(() => {
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 1500);
  }, []);
  return [show, fire];
}
