import type { NextRequest } from 'next/server';
import { handleApi } from '@/lib/server/api-handler';

type Ctx = { params: Promise<{ path: string[] }> };
const handler = async (req: NextRequest, { params }: Ctx) => handleApi(req, (await params).path);

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
