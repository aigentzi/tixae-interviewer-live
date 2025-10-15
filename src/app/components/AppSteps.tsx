"use client";

import { cn } from "@root/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CSSProperties, Fragment, useEffect, useState } from "react";

export const AppSteps: React.FC<{
  stepsNumber: number;
  currentStep: number;
  stepNames?: string[];
}> = ({ stepsNumber, currentStep, stepNames }) => {
  return (
    <AnimatePresence>
      <motion.div
        className="flex flex-row gap-2 items-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-row gap-2 items-center w-full justify-between mb-8">
          {Array.from({ length: stepsNumber }).map((_, index) => (
            <Fragment key={`app-step-${index}-${currentStep}`}>
              <div
                className={cn(
                  "rounded-[50%] px-4 py-1.5 h-auto text-center font-bold text-2xl relative",
                  index + 1 === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-default"
                )}
              >
                {index + 1}
                {stepNames && (
                  <div className="absolute -bottom-14/12 w-[200%] text-foreground font-semibold text-xs overflow-hidden left-1/2 -translate-x-1/2 h-full">
                    {stepNames[index]}
                  </div>
                )}
              </div>
              {index !== stepsNumber - 1 && (
                <div
                  className={cn(
                    "h-1 border-b-2 border-primary w-full transition-all duration-500 rounded-full",
                    index + 1 < currentStep
                      ? "border-primary"
                      : "border-default"
                  )}
                ></div>
              )}
            </Fragment>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const AppEnhancedSteps: React.FC<{
  steps: {
    icon: React.ReactNode;
    onClick: () => void;
    component: React.ReactNode;
    label?: string;
  }[];
  currentStep: number;
  style?: CSSProperties;
}> = ({ steps, currentStep, style }) => {
  const [passedSteps, setPassedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!passedSteps.has(currentStep)) {
      setPassedSteps(new Set(passedSteps.add(currentStep)));
    }
  }, [currentStep]);

  return (
    <div className="flex flex-col gap-8 items-center" style={style}>
      <div className="max-w-[1200px] w-full flex flex-row items-center justify-between">
        {steps.map((step, index) => (
          <Fragment key={`app-step-${index}`}>
            <div
              className={cn(
                "flex flex-col gap-2 items-center relative cursor-pointer p-4 rounded-full transition-all duration-300 justify-center border-2",
                index + 1 === currentStep
                  ? "bg-primary border-primary text-primary-foreground shadow-lg"
                  : passedSteps.has(index + 1)
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-primary/60 text-muted-foreground hover:border-primary/30 hover:bg-primary/10"
              )}
              onClick={() => {
                if (passedSteps.has(index + 1)) {
                  step.onClick();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={
                step.label
                  ? `Step ${index + 1}: ${step.label}`
                  : `Step ${index + 1}`
              }
              onKeyDown={(e) => {
                if (
                  (e.key === "Enter" || e.key === " ") &&
                  passedSteps.has(index + 1)
                ) {
                  e.preventDefault();
                  step.onClick();
                }
              }}
            >
              {step.icon}
              {step.label && (
                <div className="absolute text-center -bottom-14/12 w-[200%] text-foreground font-semibold text-sm overflow-hidden left-1/2 -translate-x-1/2 h-full">
                  {step.label}
                </div>
              )}
            </div>
            {index !== steps.length - 1 && (
              <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
                <div
                  className={cn(
                    "h-full bg-primary transition-all duration-500 rounded-full",
                    index + 1 < currentStep ? "w-full" : "w-0"
                  )}
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>
      <div className="w-full h-full my-10 flex flex-col items-center">
        {steps[currentStep - 1].component}
      </div>
    </div>
  );
};
