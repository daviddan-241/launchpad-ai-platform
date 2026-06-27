import { ActivityDashboard } from "@/components/activity-dashboard";
import { requireCurrentUser } from "@/lib/auth";
import { getActivityDashboard } from "@/lib/activity";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await requireCurrentUser();
  const snapshot = await getActivityDashboard(user.id);

  return <ActivityDashboard initial={snapshot} />;
}
