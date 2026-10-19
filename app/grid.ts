"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid in Tabby's own tokens (globals.css), so it follows light/dark mode with the rest of the page.
export const gridTheme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 14,
  backgroundColor: "var(--surface)",
  foregroundColor: "var(--fg)",
  textColor: "var(--fg)",
  subtleTextColor: "var(--muted)",
  accentColor: "var(--blue)",
  borderColor: "var(--line)",
  chromeBackgroundColor: "var(--canvas)",
  headerBackgroundColor: "var(--canvas)",
  headerTextColor: "var(--muted)",
  headerFontWeight: 600,
  pinnedRowBackgroundColor: "var(--canvas)",
  rowHoverColor: "color-mix(in srgb, var(--blue) 6%, transparent)",
  wrapperBorderRadius: 16,
  rowHeight: 46,
  headerHeight: 42,
  browserColorScheme: "inherit",
});
