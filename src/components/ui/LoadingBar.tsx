"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoadingBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    setProgress(30);

    const grow = setTimeout(() => setProgress(80), 200);
    const finish = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsAnimating(false);
        setProgress(0);
      }, 300);
    }, 500);

    return () => {
      clearTimeout(grow);
      clearTimeout(finish);
    };
  }, [pathname]);

  return (
    <div
      className="fixed top-0 left-0 h-1 bg-primary z-[99] transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        opacity: isAnimating ? 1 : 0,
      }}
    />
  );
}
