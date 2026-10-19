import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";

/** Central error → HTTP response mapper used by every API route handler. */
export function handleError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err && typeof err === "object" && "issues" in err) {
    // Zod validation error
    return NextResponse.json({ error: "Validation failed.", details: (err as any).issues }, { status: 422 });
  }
  console.error("[api] unexpected error:", err);
  return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
}
