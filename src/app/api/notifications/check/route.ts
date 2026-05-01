import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

/**
 * GET /api/notifications/check?classroomId=xxx
 *
 * Returns recent notification-worthy events for the authenticated user
 * across all their classrooms (or a specific one).
 *
 * Events considered:
 *  - Announcements created in the last 5 minutes
 *  - Assessments published in the last 5 minutes
 *  - Polls created in the last 5 minutes
 *  - Discussion comments posted in the last 5 minutes (not by the user)
 *
 * Each notification has a unique ID based on type + resourceId + timestamp
 * so the client can deduplicate and avoid re-showing.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');

    // ── Resolve classrooms the user belongs to ──────────────────────

    const whereClause = classroomId
      ? { id: classroomId }
      : {
          OR: [
            { crId: user.userId },
            { grId: user.userId },
            { rosterEntries: { some: { userId: user.userId } } },
          ],
        };

    const classrooms = await db.classroom.findMany({
      where: whereClause,
      select: { id: true, name: true },
    });

    if (classrooms.length === 0) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    const classroomIds = classrooms.map((c) => c.id);
    const classroomMap = new Map(classrooms.map((c) => [c.id, c.name]));

    // ── Only check events from the last 5 minutes ───────────────────

    const since = new Date(Date.now() - 5 * 60 * 1000);

    const notifications: {
      id: string;
      type: 'announcement' | 'result' | 'poll' | 'discussion';
      title: string;
      body: string;
      classroomId: string;
      classroomName: string;
      timestamp: string;
    }[] = [];

    // ── 1. Recent announcements ─────────────────────────────────────

    const recentAnnouncements = await db.announcement.findMany({
      where: {
        classroomId: { in: classroomIds },
        createdAt: { gte: since },
        // Exclude announcements posted by the current user
        postedById: { not: user.userId },
      },
      include: {
        postedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const a of recentAnnouncements) {
      const posterName = a.postedBy.name ?? a.postedBy.email ?? 'Someone';
      notifications.push({
        id: `announcement-${a.id}-${a.createdAt.toISOString()}`,
        type: 'announcement',
        title: a.title,
        body: `Posted by ${posterName}`,
        classroomId: a.classroomId,
        classroomName: classroomMap.get(a.classroomId) || 'Unknown',
        timestamp: a.createdAt.toISOString(),
      });
    }

    // ── 2. Recently published assessments ────────────────────────────

    // We need to detect assessments that were published recently.
    // Since we don't have a "publishedAt" field, we check assessments
    // where isPublished=true AND updatedAt is within the last 5 minutes
    // (publishing updates the updatedAt field).
    const recentPublished = await db.assessment.findMany({
      where: {
        classroomId: { in: classroomIds },
        isPublished: true,
        updatedAt: { gte: since },
        // Exclude assessments uploaded by the current user
        uploadedById: { not: user.userId },
      },
      include: {
        subject: { select: { name: true, code: true } },
        classroom: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    for (const a of recentPublished) {
      notifications.push({
        id: `result-${a.id}-${a.updatedAt.toISOString()}`,
        type: 'result',
        title: `${a.name} — ${a.subject.name || a.subject.code}`,
        body: `Results published in ${a.classroom.name}`,
        classroomId: a.classroomId,
        classroomName: classroomMap.get(a.classroomId) || 'Unknown',
        timestamp: a.updatedAt.toISOString(),
      });
    }

    // ── 3. Recent polls ─────────────────────────────────────────────

    const recentPolls = await db.poll.findMany({
      where: {
        classroomId: { in: classroomIds },
        createdAt: { gte: since },
        isClosed: false,
        // Exclude polls created by the current user
        createdById: { not: user.userId },
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const p of recentPolls) {
      const creatorName = p.createdBy.name ?? p.createdBy.email ?? 'Someone';
      notifications.push({
        id: `poll-${p.id}-${p.createdAt.toISOString()}`,
        type: 'poll',
        title: 'New Poll',
        body: `"${p.question}" — by ${creatorName}`,
        classroomId: p.classroomId,
        classroomName: classroomMap.get(p.classroomId) || 'Unknown',
        timestamp: p.createdAt.toISOString(),
      });
    }

    // ── 4. Recent discussion comments (root only) ──────────────────

    const recentComments = await db.comment.findMany({
      where: {
        classroomId: { in: classroomIds },
        createdAt: { gte: since },
        parentId: null, // Only root comments (new threads)
        // Exclude comments by the current user
        createdById: { not: user.userId },
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const c of recentComments) {
      const commentorName =
        c.createdBy.name ?? c.createdBy.email ?? 'Someone';
      const preview = c.content.length > 80 ? c.content.slice(0, 80) + '...' : c.content;
      notifications.push({
        id: `discussion-${c.id}-${c.createdAt.toISOString()}`,
        type: 'discussion',
        title: 'New Discussion',
        body: `"${preview}" — by ${commentorName}`,
        classroomId: c.classroomId,
        classroomName: classroomMap.get(c.classroomId) || 'Unknown',
        timestamp: c.createdAt.toISOString(),
      });
    }

    // ── Sort by timestamp (newest first) and return ─────────────────

    notifications.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('GET /api/notifications/check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
