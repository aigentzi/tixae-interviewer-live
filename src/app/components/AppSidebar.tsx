"use client";

import { CameraIcon, CreditCard, Home, Mail, Settings, User } from "lucide-react";
import { cn } from "@root/lib/utils";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useMediaQuery } from "usehooks-ts";

interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const navSections = [
  {
    title: "Home",
    link: "/app",
    icon: <Home size={24} />,
    dividerAfter: false,
    isDisabled: false,
  },
  {
    title: "Pricing",
    link: "/app/pricing",
    icon: <CreditCard size={24} />,
    dividerAfter: false,
    isDisabled: false,
  },
  {
    title: "Emails",
    link: "/app/emails",
    icon: <Mail size={24} />,
    dividerAfter: false,
    isDisabled: false,
  },
  {
    title: "Interviews",
    link: "/app/interviews",
    icon: <CameraIcon size={24} />,
    dividerAfter: false,
    isDisabled: false,
  },
  {
    title: "Positions",
    link: "/app/profiles",
    icon: <User size={24} />,
    dividerAfter: false,
    isDisabled: false,
  },
  {
    title: "Settings",
    link: "/app/settings",
    icon: <Settings size={24} />,
    dividerAfter: false,
    isDisabled: false,
  },
];

export default function AppSidebar({ isSidebarOpen, setSidebarOpen, collapsed, setCollapsed }: SidebarProps) {
  const currentPage = usePathname();
  const isMobile = useMediaQuery("(max-width: 1024px)");

  return (
    <>
      {/* Main sidebar */}
      <motion.div
        transition={{
          type: "spring",
          stiffness: 600,
          damping: 60,
          mass: 0.6,
          delay: 0,
        }}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        className="fixed h-screen z-[10] left-0 border-border-default bg-content1 border-r overflow-hidden"
        animate={{
          width: collapsed ? (isMobile ? "0px" : "70px") : "260px",
        }}
      >
        <div className="flex-1 px-3 lg:overflow-hidden overflow-auto">
          {navSections.map((item: any, index: number) => (
            <div
              key={`nav_link_${index}`}
              className="flex flex-row items-center justify-center"
            >
              {/* <AppSidebarLink
                key={`nav_link_${index}`}
                isDisabled={
                  process.env.NODE_ENV === "development"
                    ? false
                    : item.isDisabled
                }
                dividerAfter={item.dividerAfter}
                className={`gap-0 w-full text-[11.8px] h-auto py-[9px] items-start justify-start pl-[10px]  font-bold ${currentPage?.includes(`${item.href}`)
                  ? "bg-content2 border border-foreground-300"
                  : "text-foreground-800"
                  } `}
                href={item.link}
              >
                <div className="flex flex-row items-center justify-center">
                  {item.icon}
                  {!collapsed ? (
                    <span className={cn(
                      "inline-block ml-2 pt-[4px] leading-3",
                    )}>
                      {item.title}
                    </span>
                  ) : null}
                </div>
              </AppSidebarLink> */}
              {item.dividerAfter ? (
                <div className="w-full border-b border-foreground-300"></div>
              ) : (
                ""
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}

