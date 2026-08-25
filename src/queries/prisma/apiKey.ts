import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';

export async function getApiKeyByHash(keyHash: string) {
  return prisma.client.apiKey.findUnique({ where: { keyHash } });
}

export async function getUserApiKey(userId: string, apiKeyId: string) {
  return prisma.client.apiKey.findFirst({ where: { id: apiKeyId, userId } });
}

export async function getUserApiKeys(userId: string) {
  return prisma.client.apiKey.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createApiKey(data: Prisma.ApiKeyUncheckedCreateInput) {
  return prisma.client.apiKey.create({ data });
}

export async function updateApiKeyLastUsed(apiKeyId: string) {
  return prisma.client.apiKey.update({
    where: { id: apiKeyId },
    data: { lastUsedAt: new Date() },
  });
}

export async function rotateApiKey(apiKeyId: string, data: { keyHash: string; keyPrefix: string }) {
  return prisma.client.apiKey.update({
    where: { id: apiKeyId },
    data: { ...data, lastUsedAt: null },
  });
}

export async function deleteApiKey(apiKeyId: string) {
  return prisma.client.apiKey.delete({ where: { id: apiKeyId } });
}
