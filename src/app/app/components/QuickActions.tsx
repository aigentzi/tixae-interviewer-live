"use client";

import { Button, Card, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { ArrowRight, Briefcase, MessageSquare } from "lucide-react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import Link from "next/link";

interface QuickActionCardProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  buttonText: string;
}

const QuickActionCard = ({
  href,
  icon: Icon,
  title,
  description,
  buttonText,
}: QuickActionCardProps) => (
  <Card shadow="sm" radius="sm" className="p-2">
    <CardHeader className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      <div className="text-lg font-medium">{title}</div>
    </CardHeader>
    <CardBody className="py-0 text-sm">{description}</CardBody>
    <CardFooter>
      <Button
        as={Link}
        href={href}
        color="primary"
        radius="sm"
        className="w-full"
        endContent={<ArrowRight className=" h-4 w-4" />}
      >
        {buttonText}
      </Button>
    </CardFooter>
  </Card>
);

export const QuickActions = () => {
  const t = useTranslations("mainPage");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <QuickActionCard
        href="/app/profiles"
        icon={Briefcase}
        title={t("managePositions", "Manage Positions")}
        description={t(
          "managePositionsDesc",
          "Add and manage positions for different roles",
        )}
        buttonText={t("viewPositions", "View Positions")}
      />
      <QuickActionCard
        href="/app/interviews"
        icon={MessageSquare}
        title={t("manageInterviews", "Manage Interviews")}
        description={t(
          "manageInterviewsDesc",
          "Send interview invitations and view past results",
        )}
        buttonText={t("viewInterviews", "View Interviews")}
      />
    </div>
  );
};
