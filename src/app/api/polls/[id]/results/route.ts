import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/polls/[id]/results — get poll results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id: pollId } = await params;

    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        votes: {
          select: { userId: true, selectedOption: true },
        },
        classroom: { select: { crId: true, grId: true } },
      },
    });

    if (!poll) {
      return NextResponse.json(
        { success: false, error: 'Poll not found' },
        { status: 404 }
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

    // Tally results
    const options: string[] = JSON.parse(poll.options);
    const tallies = new Array(options.length).fill(0);
    let userVoted = false;
    let userSelection: number[] = [];

    for (const vote of poll.votes) {
      const selected: number[] = JSON.parse(vote.selectedOption);
      for (const idx of selected) {
        if (idx >= 0 && idx < options.length) {
          tallies[idx]++;
        }
      }
      if (vote.userId === user.userId) {
        userVoted = true;
        userSelection = selected;
      }
    }

    const totalVotes = poll.votes.length;

    return NextResponse.json({
      success: true,
      results: {
        pollId: poll.id,
        question: poll.question,
        options: options.map((opt, idx) => ({
          label: opt,
          votes: tallies[idx],
          percentage: totalVotes > 0 ? Math.round((tallies[idx] / totalVotes) * 100) : 0,
        })),
        totalVotes,
        isClosed: poll.isClosed,
        deadline: poll.deadline,
        type: poll.type,
        userVoted,
        userSelection,
      },
    });
  } catch (error) {
    console.error('GET /api/polls/[id]/results error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
