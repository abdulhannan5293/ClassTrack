import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/polls/[id]/vote — submit or update vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id: pollId } = await params;
    const body = await request.json();
    const { selectedOption } = body;

    if (selectedOption === undefined || selectedOption === null) {
      return NextResponse.json(
        { success: false, error: 'selectedOption is required' },
        { status: 400 }
      );
    }

    // Verify poll exists
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: { classroom: { select: { crId: true, grId: true } } },
    });

    if (!poll) {
      return NextResponse.json(
        { success: false, error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Check if poll is closed
    if (poll.isClosed) {
      return NextResponse.json(
        { success: false, error: 'This poll is closed' },
        { status: 400 }
      );
    }

    // Check if deadline has passed
    if (poll.deadline && new Date() > poll.deadline) {
      return NextResponse.json(
        { success: false, error: 'This poll has expired' },
        { status: 400 }
      );
    }

    // Verify user is a member
    const classroom = poll.classroom;
    const isCRorGR = classroom.crId === user.userId || classroom.grId === user.userId;
    if (!isCRorGR) {
      const rosterEntry = await db.rosterEntry.findFirst({
        where: { classroomId: poll.classroomId, userId: user.userId },
      });
      if (!rosterEntry) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this classroom' },
          { status: 403 }
        );
      }
    }

    // Validate selected option
    const options: string[] = JSON.parse(poll.options);
    const selectedArray = Array.isArray(selectedOption) ? selectedOption : [selectedOption];
    const validOptions = selectedArray.every((opt: number) => typeof opt === 'number' && opt >= 0 && opt < options.length);

    if (!validOptions) {
      return NextResponse.json(
        { success: false, error: 'Invalid option selected' },
        { status: 400 }
      );
    }

    // For single-choice polls, only one option allowed
    if (poll.type === 'single' && selectedArray.length > 1) {
      return NextResponse.json(
        { success: false, error: 'Only one option allowed for single-choice polls' },
        { status: 400 }
      );
    }

    const selectedOptionStr = JSON.stringify(selectedArray);

    // Upsert vote
    const vote = await db.pollVote.upsert({
      where: {
        pollId_userId: { pollId, userId: user.userId },
      },
      create: {
        pollId,
        userId: user.userId,
        selectedOption: selectedOptionStr,
      },
      update: {
        selectedOption: selectedOptionStr,
      },
    });

    return NextResponse.json({ success: true, vote });
  } catch (error) {
    console.error('POST /api/polls/[id]/vote error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
