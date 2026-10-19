import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">The page you're looking for doesn't exist or was moved.</p>
      <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
    </main>
  );
}
