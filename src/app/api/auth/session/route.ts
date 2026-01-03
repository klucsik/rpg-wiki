import { NextRequest, NextResponse } from "next/server";
import { getSessionWithGroups } from "@/lib/better-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionWithGroups(request.headers);
    
    if (!session) {
      return NextResponse.json({ user: null, session: null }, { status: 200 });
    }

    return NextResponse.json({
      user: session.user,
      session: session.session,
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ user: null, session: null }, { status: 200 });
  }
}
