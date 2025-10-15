"use client";

import { Suspense } from "react";
import { FullScreenLoader } from "@root/app/components/FullScreenLoader";
import { ContentComponent } from "./components/content.component";

const page = () => {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <ContentComponent />
    </Suspense>
  );
};

export default page;
