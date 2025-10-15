import { openApiDocument } from '@root/server/openapi';
import { NextApiRequest, NextApiResponse } from 'next';

export async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json(openApiDocument);
};

export default handler;
