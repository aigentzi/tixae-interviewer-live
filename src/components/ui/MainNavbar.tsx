import React from "react";

import LanguageSwitcher from "@root/app/components/LanguageSwitcher";
import UserAccountMenu from "@root/app/components/UserAccountMenu";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { cn } from "@root/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileMenu from "./MobileMenu";

interface NavigationItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

interface MainNavbarProps {
  className?: string;
  hideNavigation?: boolean;
}

const MainNavbar: React.FC<MainNavbarProps> = ({
  className,
  hideNavigation = false,
}) => {
  const pathname = usePathname();
  const t = useTranslations("navigation");

  const navigationItems: NavigationItem[] = [
    {
      title: t("dashboard", "DASHBOARD"),
      href: "/app",
    },
    // {
    //   title: "PRICING",
    //   href: "/app/pricing",
    // },
    // {
    //   title: "EMAILS",
    //   href: "/app/emails",
    // },
    {
      title: t("interviews", "INTERVIEWS"),
      href: "/app/interviews",
    },
    {
      title: t("applicants", "APPLICANTS"),
      href: "/app/applicants",
    },
    {
      title: t("profiles", "PROFILES"),
      href: "/app/profiles",
    },
    {
      title: t("settings", "SETTINGS"),
      href: "/app/settings",
    },
  ];

  return (
    <header className="w-full border-b border-default-200/60 bg-background/95 backdrop-blur-sm sticky top-0 z-50 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <Image
                  src="/tixae-logo.png"
                  alt="Tixae Logo"
                  width={36}
                  height={36}
                  className="rounded-lg transition-transform group-hover:scale-105"
                  id="tixae-logo"
                />
              </div>
            </Link>
          </div>

          {/* Center Section - Navigation (conditionally rendered) */}
          {!hideNavigation && (
            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/app" && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative text-sm font-medium transition-colors duration-200 py-2 group",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.title}
                    {/* Active underline */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                    {/* Hover underline for inactive links */}
                    {!isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-3">
            {/* Mobile Navigation Menu (conditionally rendered) */}
            {!hideNavigation && (
              <div className="md:hidden">
                <MobileMenu navigationItems={navigationItems} />
              </div>
            )}

            {/* Language Switcher*/}
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            {/* User Account Menu */}
            <div className="hidden md:block">
              <UserAccountMenu compact />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainNavbar;
