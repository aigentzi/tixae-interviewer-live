import { GAuthUser, Workspace } from "@root/shared/zod-schemas";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase/clientFirebaseInit";
import { GAuthContext, useGAuthUser } from "../contexts/gauth.context";

export const FirebaseAuthProvider = (props: { children: React.ReactNode }) => {
  const [cookies, setCookie] = useCookies(["auth-token"]);
  const [loading, setLoading] = useState(true);
  const [gauthUser, setGAuthUser] = useState<GAuthUser | null>(null);

  useEffect(() => {
    setLoading(true);
    const auth = getAuth(app);

    const unsub = onAuthStateChanged(auth, async (user) => {
      console.log("!VGDEBUG:AUTH:CHANGE", user);
      if (user?.email) {
        setGAuthUser({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
        });
        const authToken = await user.getIdToken();
        setCookie("auth-token", authToken, {
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        });

        // create new user if not exists

        let finalUser: Workspace = {
          id: user.uid,
          name: user.displayName || "",
          ownerId: user.uid,
          members: [user.email || ""],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log(`VGDEBUG:USER_DATA`, finalUser);
      } else {
        setCookie("auth-token", "", {
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        });
        setGAuthUser(null);
      }
      setLoading(false);
    });
    return () => {
      // console.log('!VGDEBUG:AUTH:REMOVE')
      unsub();
      setLoading(false);
    };
  }, []);

  return (
    <GAuthContext.Provider
      value={
        {
          gauthUser,
          setGAuthUser,
          gauthLoading: loading,
        } as useGAuthUser
      }
    >
      {props.children}
    </GAuthContext.Provider>
  );
};
