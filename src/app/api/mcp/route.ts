import { createMcpHandler } from '@modelcontextprotocol/server';
import { checkAuth } from '@/lib/auth';
import { unauthorized } from '@/lib/response';
import { buildMcpServer } from './tools';

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  const protocol = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;

  return `${protocol}://${host}`;
}

async function handleRequest(request: Request): Promise<Response> {
  const auth = await checkAuth(request);

  if (!auth?.user) {
    return unauthorized();
  }

  const handler = createMcpHandler(() => buildMcpServer(auth, getBaseUrl(request)), {
    responseMode: 'json',
  });

  return handler.fetch(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function DELETE(request: Request) {
  return handleRequest(request);
}
