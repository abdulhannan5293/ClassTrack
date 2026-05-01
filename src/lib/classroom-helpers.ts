import { PrismaClient } from '@prisma/client';

/**
 * Check if a user is a member of the classroom (CR, GR, or roster member).
 */
export async function isClassroomMember(
  db: PrismaClient,
  userId: string,
  classroomId: string
): Promise<boolean> {
  const classroom = await db.classroom.findFirst({
    where: {
      id: classroomId,
      OR: [
        { crId: userId },
        { grId: userId },
        { rosterEntries: { some: { userId } } },
      ],
    },
  });
  return !!classroom;
}

/**
 * Check if a user is a manager of the classroom (CR or GR).
 */
export async function isClassroomManager(
  db: PrismaClient,
  userId: string,
  classroomId: string
): Promise<boolean> {
  const classroom = await db.classroom.findFirst({
    where: {
      id: classroomId,
      OR: [{ crId: userId }, { grId: userId }],
    },
  });
  return !!classroom;
}

/**
 * Get the user's role within a classroom: 'cr', 'gr', or 'member'.
 * Returns null if the user has no affiliation with the classroom.
 */
export async function getMemberRole(
  db: PrismaClient,
  userId: string,
  classroomId: string
): Promise<'cr' | 'gr' | 'member' | null> {
  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { crId: true, grId: true },
  });

  if (!classroom) return null;
  if (classroom.crId === userId) return 'cr';
  if (classroom.grId === userId) return 'gr';

  const rosterEntry = await db.rosterEntry.findFirst({
    where: { classroomId, userId },
  });
  return rosterEntry ? 'member' : null;
}
