import { useContext } from "react";
import { GAuthContext } from "../contexts/gauth.context";

export function useGAuth() {
  const gauthContext = useContext(GAuthContext);

  if (!gauthContext) {
    throw new Error("useGAuth must be used within a GAuthProvider");
  }

  return gauthContext;
}
