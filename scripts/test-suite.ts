// Architected and built by Claudesy.
import { spawn } from "node:child_process";

type Suite = {
  name: string;
  command: string;
  args: string[];
};

const suites: Suite[] = [
  {
    name: "auth-hardening",
    command: process.execPath,
    args: ["./node_modules/tsx/dist/cli.mjs", "scripts/test-auth-hardening.ts"],
  },
  {
    name: "safety-net",
    command: process.execPath,
    args: ["./node_modules/tsx/dist/cli.mjs", "scripts/test-cdss.ts"],
  },
  {
    name: "intelligence-route",
    command: process.execPath,
    args: [
      "./node_modules/tsx/dist/cli.mjs",
      "--test",
      "src/hooks/useEncounterQueue.test.ts",
      "src/hooks/useOperationalMetrics.test.ts",
      "src/lib/clinical/trajectory-analyzer.test.ts",
      "src/lib/emr/visit-history.test.ts",
      "src/lib/intelligence/ai-insights.test.ts",
      "src/lib/intelligence/observability.test.ts",
      "src/lib/intelligence/server.test.ts",
      "src/lib/intelligence/socket-payload.test.ts",
      "src/lib/telemedicine/consult-to-bridge.test.ts",
      "src/lib/telemedicine/consult-accepted.test.ts",
      "src/lib/telemedicine/consult-api-validation.test.ts",
      "src/app/api/dashboard/intelligence/routes.test.ts",
      "src/app/api/dashboard/intelligence/observability-handler.test.ts",
      "src/app/api/dashboard/intelligence/alerts/acknowledge/acknowledge-handler.test.ts",
      "src/app/dashboard/intelligence/AIDisclosureBadge.test.tsx",
      "src/app/dashboard/intelligence/AIInsightsPanel.test.tsx",
      "src/app/dashboard/intelligence/ClinicalSafetyAlertBanner.test.tsx",
      "src/app/dashboard/intelligence/IntelligenceDashboardScaffold.test.tsx",
      "src/app/dashboard/intelligence/IntelligenceSocketProvider.test.tsx",
      "src/app/dashboard/intelligence/OperationalSummaryPanel.test.tsx",
      "src/app/dashboard/intelligence/loading.test.tsx",
      "src/app/dashboard/intelligence/error.test.tsx",
    ],
  },
];

async function runSuite(suite: Suite): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(suite.command, suite.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `Test suite ${suite.name} gagal dengan exit code ${code ?? "unknown"}`,
        ),
      );
    });

    child.on("error", reject);
  });
}

async function main(): Promise<void> {
  for (const suite of suites) {
    await runSuite(suite);
  }
}

void main();
