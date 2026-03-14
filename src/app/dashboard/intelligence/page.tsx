// Designed and constructed by Claudesy.
import { headers } from "next/headers";

import { resolveIntelligenceDashboardAccess } from "@/lib/intelligence/server";
import { getCrewSessionFromCookieHeader } from "@/lib/server/crew-access-auth";

import IntelligenceDashboardLiveStatus from "./IntelligenceDashboardLiveStatus";
import IntelligenceDashboardScaffold from "./IntelligenceDashboardScaffold";

export default async function IntelligenceDashboardPage(): Promise<React.JSX.Element> {
  const requestHeaders = await headers();
  const session = getCrewSessionFromCookieHeader(
    requestHeaders.get("cookie") ?? "",
  );
  const access = resolveIntelligenceDashboardAccess(session?.role);

  return (
    <IntelligenceDashboardScaffold
      access={access}
      statusContent={<IntelligenceDashboardLiveStatus />}
    />
  );
}
