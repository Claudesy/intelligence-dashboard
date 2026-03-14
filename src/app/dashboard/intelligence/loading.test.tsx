// Designed and constructed by Claudesy.
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import IntelligenceDashboardLoading from "./loading";

test("renders the route loading skeleton blocks", () => {
  const html = renderToStaticMarkup(<IntelligenceDashboardLoading />);

  assert.match(html, /animate-pulse/);
  assert.match(html, /max-w-7xl/);
  assert.match(html, /grid-cols-\[minmax\(0,1\.25fr\)_minmax\(0,1fr\)\]/);
});
