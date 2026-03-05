"use client";

import { useState, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function RevealWrapper({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  const humanRef = useRef<HTMLDivElement>(null);

  const handleReveal = () => {
    setRevealed(true);
    setTimeout(() => {
      humanRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 800);
  };

  return (
    <main className="relative">
      {/* THE VOID */}
      <section className="relative h-screen w-full bg-black flex items-end justify-end">
        <AnimatePresence>
          {!revealed && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.5, duration: 1 }}
              onClick={handleReveal}
              className="fixed bottom-8 right-8 font-mono text-[11px] tracking-wider z-50"
              style={{ color: "#333333" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#666666")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#333333")}
            >
              I&apos;m human? Press here. &rarr;
            </motion.button>
          )}
        </AnimatePresence>

        {revealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="font-mono text-[11px] tracking-wider"
              style={{ color: "#333333" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#666666")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#333333")}
            >
              &larr; return to void
            </button>
          </motion.div>
        )}
      </section>

      {/* Horizontal light line */}
      {revealed && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed top-1/2 left-0 right-0 h-px bg-white/20 z-40 origin-center pointer-events-none"
          style={{ transform: "translateY(-50%)" }}
        />
      )}

      {/* 
        Content is ALWAYS in the DOM for SEO/crawlers.
        Before reveal: hidden via max-h-0 overflow-hidden (invisible but in HTML).
        After reveal: animated into view.
        Crawlers/bots see all the content in the initial HTML regardless.
      */}
      <div
        ref={humanRef}
        className={revealed ? "" : "max-h-0 overflow-hidden"}
        aria-hidden={!revealed}
      >
        {revealed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
          >
            {children}
          </motion.div>
        ) : (
          children
        )}
      </div>
    </main>
  );
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedHero({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.8 }}
    >
      {children}
    </motion.div>
  );
}

export function ProblemCard({
  title,
  description,
  delay,
}: {
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="border-t border-white/10 pt-6"
    >
      <h3 className="font-mono text-sm text-white/80 mb-3">{title}</h3>
      <p className="text-white/40 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

export function SolutionBlock({
  title,
  description,
  delay,
}: {
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className="flex gap-4"
    >
      <span className="font-mono text-white/20 text-sm mt-1 shrink-0">&rarr;</span>
      <div>
        <h3 className="font-mono text-base text-white/90 mb-2">{title}</h3>
        <p className="text-white/40 text-sm leading-relaxed max-w-2xl">{description}</p>
      </div>
    </motion.div>
  );
}
