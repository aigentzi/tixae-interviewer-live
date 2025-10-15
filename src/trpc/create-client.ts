"use client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@root/server/api/root";
import { links } from "./links";

export const api = createTRPCReact<AppRouter>();

export const createClient = () => {
  return api.createClient({
    links: links(),
  });
}; 