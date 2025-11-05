"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, X } from "lucide-react";
import { useState } from "react";

/**
 * DemoBanner Component
 *
 * Displays a prominent banner at the top of the application indicating this is a
 * portfolio demo version. Users can dismiss it, but it will reappear on page reload.
 *
 * Features:
 * - Dismissible banner with close button
 * - Gradient background for visual prominence
 * - Responsive design
 * - Icon indication
 *
 * @example
 * ```tsx
 * import { DemoBanner } from "@/presentation/components/demo/DemoBanner";
 *
 * export default function Layout() {
 *   return (
 *     <>
 *       <DemoBanner />
 *       {children}
 *     </>
 *   );
 * }
 * ```
 */
export function DemoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  // Check if demo mode is enabled via environment variable
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (!isDemoMode || !isVisible) {
    return null;
  }

  return (
    <div className="relative">
      <Alert className="rounded-none border-l-0 border-r-0 border-t-0 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-amber-950/20 border-b-2 border-amber-200 dark:border-amber-800">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-2">
            <span className="font-semibold text-amber-900 dark:text-amber-100">
              🎨 PORTFOLIO DEMO VERSION
            </span>
            <span className="text-sm text-amber-700 dark:text-amber-300 hidden sm:inline">
              •
            </span>
            <span className="text-sm text-amber-700 dark:text-amber-300 hidden sm:inline">
              This is a sanitized demo showcasing the application's features with sample data.
            </span>
            <span className="text-sm text-amber-700 dark:text-amber-300 sm:hidden">
              Demo version with sample data
            </span>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 rounded-full p-1 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
            aria-label="Dismiss demo banner"
          >
            <X className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * DemoWatermark Component
 *
 * Adds a subtle watermark to printed documents indicating this is a demo version.
 * Should be added to PDF generation templates.
 *
 * @returns HTML string for watermark
 */
export function getDemoWatermark(): string {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (!isDemoMode) {
    return "";
  }

  return `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px;
      color: rgba(251, 191, 36, 0.1);
      font-weight: bold;
      pointer-events: none;
      z-index: -1;
      white-space: nowrap;
      user-select: none;
    ">
      DEMO VERSION
    </div>
  `;
}

/**
 * useDemoMode Hook
 *
 * Custom hook to check if the application is running in demo mode.
 * Useful for conditional rendering or behavior changes.
 *
 * @returns boolean indicating if demo mode is active
 *
 * @example
 * ```tsx
 * const isDemoMode = useDemoMode();
 *
 * if (isDemoMode) {
 *   console.log("Running in demo mode");
 * }
 * ```
 */
export function useDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
