export type BriefingViewState = "loading" | "fresh" | "stale" | "error";

export function getBriefingViewState({ hasData, isLoading, hasError }: { hasData: boolean; isLoading: boolean; hasError: boolean }): BriefingViewState {
  if (hasData && hasError) return "stale";
  if (hasError) return "error";
  if (isLoading && !hasData) return "loading";
  return "fresh";
}
