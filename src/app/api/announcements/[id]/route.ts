import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// PUT /api/announcements/[id] — update announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { title, content, priority, isPinned, imageUrl } = body;

    // Fetch announcement with classroom info
    const announcement = await db.announcement.findUnique({
      where: { id },
      include: {
        classroom: { select: { crId: true, grId: true } },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Verify user is CR or GR
    const isCRorGR =
      announcement.classroom.crId === user.userId ||
      announcement.classroom.grId === user.userId;

    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can update announcements' },
        { status: 403 }
      );
    }

    // Update fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (priority !== undefined) {
      const validPriorities = ['normal', 'important', 'urgent'];
      if (validPriorities.includes(priority)) updateData.priority = priority;
    }
    if (isPinned !== undefined) updateData.isPinned = !!isPinned;
    if (imageUrl !== undefined) {
      // Allow explicitly setting to null to remove image, or updating with new data URL
      updateData.imageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
    }

    const updated = await db.announcement.update({
      where: { id },
      data: updateData,
      include: {
        postedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      announcement: {
        ...updated,
        postedBy: {
          ...updated.postedBy,
          name: updated.postedBy.name ?? updated.postedBy.email ?? 'Unknown',
        },
      },
    });
  } catch (error) {
    console.error('PUT /api/announcements/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/announcements/[id] — delete announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Fetch announcement with classroom info
    const announcement = await db.announcement.findUnique({
      where: { id },
      include: {
        classroom: { select: { crId: true, grId: true } },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Verify user is CR or GR
    const isCRorGR =
      announcement.classroom.crId === user.userId ||
      announcement.classroom.grId === user.userId;

    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can delete announcements' },
        { status: 403 }
      );
    }

    await db.announcement.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/announcements/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
