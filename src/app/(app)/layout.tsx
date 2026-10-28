import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "../../auth";
import { db } from "../../db";
import { users } from "../../db/schema";
import { AppShell } from "../../components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/masuk");

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) redirect("/masuk");
  if (!user.onboardingCompleted) redirect("/onboarding");

  return (
    <AppShell userName={user.name || "Pengguna"} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
