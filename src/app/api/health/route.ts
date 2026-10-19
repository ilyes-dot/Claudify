import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public, unauthenticated endpoint for load balancers / uptime monitors.
// Deliberately returns no internal details on failure.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
