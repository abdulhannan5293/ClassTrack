import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// PUT /api/notes/[id] — update note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { title, content, colorTag, isPinned } = body;

    // Fetch note with classroom info
    const note = await db.note.findUnique({
      where: { id },
      include: {
        classroom: { select: { crId: true, grId: true } },
      },
    });

    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    // Verify user is CR or GR
    const isCRorGR =
      note.classroom.crId === user.userId || note.classroom.grId === user.userId;

    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can update notes' },
        { status: 403 }
      );
    }

    // Update fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (colorTag !== undefined) {
      const validColors = ['amber', 'teal', 'rose', 'emerald', 'violet'];
      if (validColors.includes(colorTag)) updateData.colorTag = colorTag;
    }
    if (isPinned !== undefined) updateData.isPinned = !!isPinned;

    const updated = await db.note.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      note: {
        ...updated,
        createdBy: {
          ...updated.createdBy,
          name: updated.createdBy.name ?? updated.createdBy.email ?? 'Unknown',
        },
      },
    });
  } catch (error) {
    console.error('PUT /api/notes/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] — delete note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Fetch note with classroom info
    const note = await db.note.findUnique({
      where: { id },
      include: {
        classroom: { select: { crId: true, grId: true } },
      },
    });

    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    // Verify user is CR or GR
    const isCRorGR =
      note.classroom.crId === user.userId || note.classroom.grId === user.userId;

    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can delete notes' },
        { status: 403 }
      );
    }

    await db.note.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/notes/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
