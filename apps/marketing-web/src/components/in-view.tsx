"use client";

import { useEffect, useRef, useState } from "react";

type InViewProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number; // in milliseconds
  threshold?: number;
  once?: boolean;
};

export function InView({ children, className = "", delay = 0, threshold = 0.1, once = true }: InViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.unobserve(el);
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  return (
    <div
      ref={ref}
      className={`fade-in-up ${isInView ? "active" : ""} ${className}`}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
