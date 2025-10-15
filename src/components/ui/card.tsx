import * as React from "react";
import {
  Card as HeroUICard,
  CardHeader as HeroUICardHeader,
  CardBody as HeroUICardBody,
  CardFooter as HeroUICardFooter,
  CardProps,
  cn,
} from "@heroui/react";

const Card: React.FC<CardProps> = ({ className, ...props }) => (
  <HeroUICard
    shadow="sm"
    radius="lg"
    className={cn("p-2", className)}
    {...props}
  />
);
Card.displayName = "Card";

const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <HeroUICardHeader
    className={cn("flex flex-col gap-2 items-start", className)}
    {...props}
  />
);
CardHeader.displayName = "CardHeader";

// CardTitle is now just a div that goes inside CardHeader
const CardTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={`text-lg font-semibold leading-none tracking-tight ${className || ""}`}
    {...props}
  />
);
CardTitle.displayName = "CardTitle";

// CardDescription is now just a div that goes inside CardHeader or CardBody
const CardDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={`text-sm text-default-500 leading-relaxed ${className || ""}`}
    {...props}
  />
);
CardDescription.displayName = "CardDescription";

const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <HeroUICardBody className={className} {...props} />;
CardContent.displayName = "CardContent";

const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <HeroUICardFooter className={className} {...props} />;
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
