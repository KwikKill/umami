import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';

export async function getWebsiteAnnotation(websiteId: string, annotationId: string) {
  return prisma.client.annotation.findFirst({
    where: { id: annotationId, websiteId },
  });
}

export async function getWebsiteAnnotations(
  websiteId: string,
  { startDate, endDate }: { startDate: Date; endDate: Date },
) {
  return prisma.client.annotation.findMany({
    where: {
      websiteId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });
}

export async function createAnnotation(data: Prisma.AnnotationUncheckedCreateInput) {
  return prisma.client.annotation.create({ data });
}

export async function updateAnnotation(annotationId: string, data: Prisma.AnnotationUpdateInput) {
  return prisma.client.annotation.update({ where: { id: annotationId }, data });
}

export async function deleteAnnotation(annotationId: string) {
  return prisma.client.annotation.delete({ where: { id: annotationId } });
}
