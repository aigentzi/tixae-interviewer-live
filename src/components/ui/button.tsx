"use client";

import { Button as HerouiButton, ButtonProps } from "@heroui/react";
import * as React from "react";

function Button({ ...props }: ButtonProps) {
  return <HerouiButton radius="sm" {...props} />;
}

export { Button };
