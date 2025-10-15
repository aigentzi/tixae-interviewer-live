import { createNextApiHandler } from '@trpc/server/adapters/next';

import { appRouter } from '@root/server/api/root';
import { createTRPCContext } from '@root/trpc/trpc';

// Handle incoming tRPC requests
export default createNextApiHandler({
  router: appRouter,
  createContext: async (opts) => {
    return createTRPCContext({ headers: { ...opts.req.headers, authorization: opts.req.headers.authorization || '' } });
  },
});
