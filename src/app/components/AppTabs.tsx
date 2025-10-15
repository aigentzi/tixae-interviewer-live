"use client";

import { Tab, Tabs } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FC, useMemo } from "react";
import { useMediaQuery } from "usehooks-ts";

export const AppTabsWithRoutes: FC<{
  tabs: {
    label: string;
    value: string;
    href: string;
  }[];
}> = ({ tabs }) => {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const searchParams = useSearchParams();

  const selectedTab = useMemo(() => {
    return searchParams?.get("tab") || tabs[0].value;
  }, [searchParams, tabs]);

  return (
    <div className="h-full">
      <Tabs
        defaultSelectedKey={tabs[0].value}
        selectedKey={selectedTab}
        color="primary"
        isVertical
        variant="light"
        className="w-full"
        fullWidth={isMobile}
        radius="md"
        size="lg"
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.value}
            value={tab.value}
            className="md:justify-start h-[40px]"
            title={tab.label}
            onClick={() => router.push(tab.href)}
          />
        ))}
      </Tabs>
    </div>
  );
};
