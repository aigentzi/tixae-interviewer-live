import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "@root/app/hooks/theme.hook";

export default function ThemeSwitch() {
  const { theme, setTheme, getEffectiveTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="relative h-10 w-10 rounded-full bg-transparent p-2 outline-none">
        <div className="absolute inset-0 rounded-full opacity-0"></div>
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <Sun className="h-5 w-5 text-orange-500" />
        </div>
      </button>
    );
  }

  const effectiveTheme = getEffectiveTheme();
  const isDark = effectiveTheme === "dark";

  return (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-10 w-10 rounded-full bg-transparent p-2 outline-none"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={false}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={false}
        animate={{
          backgroundColor: isDark
            ? "rgba(30, 58, 138, 0.2)"
            : "rgba(234, 88, 12, 0.2)",
        }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className="relative z-10 flex h-full w-full items-center justify-center"
        initial={false}
        animate={{ rotate: isDark ? 0 : 180 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        <motion.div
          className="absolute"
          animate={{ opacity: isDark ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <Moon className="h-5 w-5 text-blue-400" />
        </motion.div>
        <motion.div
          className="absolute cursor-pointer"
          animate={{ opacity: isDark ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <Sun className="h-5 w-5 text-orange-500" />
        </motion.div>
      </motion.div>
    </motion.button>
  );
}
