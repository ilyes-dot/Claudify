import { NextRequest, NextResponse } from "next/server";
import { verifyInviteToken } from "@/lib/invite-token";
import { prisma } from "@/lib/prisma";

// Public route — lets the invite page check token validity up front
// (before the user types anything) and show the account's name/email
// for confirmation, without exposing anything sensitive.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false }, { status: 400 });

  const verified = await verifyInviteToken(token);
  if (!verified) return NextResponse.json({ valid: false });

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { name: true, email: true },
  });

  return NextResponse.json({ valid: true, name: user?.name, email: user?.email });
}
