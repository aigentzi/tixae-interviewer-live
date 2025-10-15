import { GAuthUser } from "@root/shared/zod-schemas";
import { createContext, Dispatch, SetStateAction } from "react";

export interface useGAuthUser {
  gauthUser: {
    email: string;
    uid: string;
    photoURL: string;
    displayName: string;
  };
  setGAuthUser: Dispatch<SetStateAction<GAuthUser>>;
  gauthLoading: boolean;
};

const gAuthContextDefaultValues: useGAuthUser = {
  gauthUser: {
    email: "",
    uid: "",
    photoURL: "",
    displayName: "",
  },
  setGAuthUser: () => { },
  gauthLoading: false,
};

export const GAuthContext = createContext<useGAuthUser>(gAuthContextDefaultValues);
