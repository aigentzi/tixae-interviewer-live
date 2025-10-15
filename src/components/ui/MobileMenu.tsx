import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import { Button, useDisclosure } from "@heroui/react";
import LanguageSwitcher from "@root/app/components/LanguageSwitcher";
import UserAccountMenu from "@root/app/components/UserAccountMenu";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { cn } from "@root/lib/utils";
import { CameraIcon, Home, MenuIcon, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
}

interface MobileMenuProps {
  navigationItems: NavigationItem[];
}

const MobileMenu = ({ navigationItems }: MobileMenuProps) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const pathname = usePathname();
  const t = useTranslations("navigation");

  // Create enhanced navigation items with icons, using the passed navigationItems
  const enhancedNavigationItems = navigationItems.map((item) => {
    let icon = null;

    // Map icons based on the href
    if (item.href === "/app") {
      icon = <Home size={20} />;
    } else if (item.href === "/app/interviews") {
      icon = <CameraIcon size={20} />;
    } else if (item.href === "/app/profiles") {
      icon = <User size={20} />;
    } else if (item.href === "/app/settings") {
      icon = <Settings size={20} />;
    }

    return {
      ...item,
      icon,
      isDisabled: false,
    };
  });

  return (
    <>
      <Button
        isIconOnly
        variant="ghost"
        onPress={onOpen}
        className=""
        aria-label={t("openNavigationMenu", "Open navigation menu")}
      >
        <MenuIcon size={18} />
      </Button>

      <Drawer
        size="sm"
        backdrop="blur"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{
          base: "data-[placement=left]:sm:m-0 data-[placement=right]:sm:m-0",
          backdrop: "backdrop-blur-sm bg-black/20",
        }}
      >
        <DrawerContent className="h-full ">
          {(onClose) => (
            <>
              {/* Header with Logo and User Info */}
              <DrawerHeader className="flex flex-col gap-4 pb-4 pt-10 px-6">
                {/* User Profile Card */}
                <UserAccountMenu />
              </DrawerHeader>

              <DrawerBody className="px-0 py-2">
                <div className="flex flex-col gap-1 px-4">
                  {enhancedNavigationItems.map((item, index) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/app" && pathname?.startsWith(item.href));

                    return (
                      <div key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                            isActive
                              ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/20"
                              : "text-foreground-700 hover:bg-default-100 hover:text-foreground active:bg-default-200",
                            item.isDisabled && "opacity-50 cursor-not-allowed",
                          )}
                        >
                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                          )}

                          <div
                            className={cn(
                              "flex items-center justify-center w-5 h-5 transition-transform group-hover:scale-110",
                              isActive ? "text-primary" : "text-foreground-500",
                            )}
                          >
                            {item.icon}
                          </div>

                          <span className="flex-1 font-medium">
                            {item.title}
                          </span>

                          {isActive && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="px-4">
                  <p className="text-xs font-medium text-foreground-500 uppercase tracking-wider mb-3 px-4">
                    {t("quickActions", "Quick Actions")}
                  </p>

                  <div className="space-y-1">
                    <Link
                      href="/"
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-700 hover:bg-default-100 transition-colors"
                    >
                      <div className="flex items-center justify-center w-5 h-5">
                        <CameraIcon size={18} />
                      </div>
                      <span className="font-medium">
                        {t("newInterview", "New Interview")}
                      </span>
                    </Link>

                    <Link
                      href="/app/profiles"
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-700 hover:bg-default-100 transition-colors"
                    >
                      <div className="flex items-center justify-center w-5 h-5">
                        <User size={18} />
                      </div>
                      <span className="font-medium">
                        {t("jobProfiles", "Job Profiles")}
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto pt-6 pb-4 px-4 border-t border-default-200">
                  <LanguageSwitcher fullWidth />
                </div>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileMenu;
