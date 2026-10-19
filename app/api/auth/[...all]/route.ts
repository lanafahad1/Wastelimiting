import { toNextJsHandler } from 'better-auth/next-js';
import { getRuntime } from '@/lib/server/runtime';

const handler = async (req: Request) => {
  const { auth } = await getRuntime();
  return toNextJsHandler(auth)[req.method as 'GET' | 'POST'](req);
};

export { handler as GET, handler as POST };
