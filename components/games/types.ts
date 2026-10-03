import type { DayResult } from "@/lib/progress";

export type GameProps<C> = {
  dateKey: string;
  content: C;
  result: DayResult | undefined;
  onResult: (status: DayResult["status"]) => void;
  hintUsed: boolean;
  onHint: () => void;
};
