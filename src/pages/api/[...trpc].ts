import { NextApiRequest, NextApiResponse } from 'next';
import { createOpenApiNextHandler } from 'trpc-to-openapi';
import { appRouter } from '@root/server/api/root';
import { signInWithCustomToken, getAuth } from 'firebase/auth';
import { app } from '@root/app/firebase/clientFirebaseInit';
import { serverApp } from '@root/server/firebase';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { runMiddleware } from 'next-cors';
import Cors from 'cors';

const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await runMiddleware(req, res, cors);

  return createOpenApiNextHandler({
    router: appRouter,
    onError: (opts) => {
      console.error("Errpr from pages router", opts.error);
    },
    createContext: async (opts) => {
      const authHeader = opts.req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const decodedToken = await signInWithCustomToken(getAuth(app), token);
        const user = await getAdminAuth(serverApp).getUser(decodedToken.user.uid);
        return { headers: { ...req.headers, authorization: authHeader }, user };
      }
      return { headers: { ...req.headers, authorization: '' }, user: null };
    },
  })(req, res);
};

export default handler;
