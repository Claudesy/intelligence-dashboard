import * as Sentry from "@sentry/nextjs";

import { initializeAbysLangfuseTracing } from "./langfuse.config";
import {
  getAbysSentryConfig,
  scrubAbysSentryEvent,
} from "./sentry.config";

const DASHBOARD_SENTRY_APP = "puskesmas-dashboard";
let initialized = false;
let sentryInitialized = false;

export async function initializeDashboardObservability(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    if (!sentryInitialized) {
      Sentry.init(getAbysSentryConfig(DASHBOARD_SENTRY_APP));
      sentryInitialized = true;
    }

    await initializeAbysLangfuseTracing();
    initialized = true;
  } catch (error) {
    initialized = false;
    throw error;
  }
}

export async function captureDashboardObservabilityError(
  error: unknown,
  extra: Record<string, unknown> = {},
): Promise<void> {
  if (!sentryInitialized) {
    Sentry.init(getAbysSentryConfig(DASHBOARD_SENTRY_APP));
    sentryInitialized = true;
  }

  Sentry.captureException(error, {
    extra: scrubAbysSentryEvent(extra),
  });
}
