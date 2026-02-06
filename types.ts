
export interface TaskRule {
  id: string;
  keyword: string;
  synonyms?: string[];
  durationMinutes: number;
}

export interface RawTask {
  name: string;
  owner: string;
  date: string; // ISO String or YYYY-MM-DD
  monthKey: string; // Format: YYYY-MM
  matchedRule?: TaskRule;
  calculatedDuration: number;
}

export interface OwnerSummary {
  owner: string;
  totalMinutes: number;
  totalHours: number;
  avgHoursPerDay: number;
  taskCount: number;
  tasks: RawTask[];
}

export interface MonthlyAnalysis {
  monthKey: string;
  monthName: string;
  summaries: OwnerSummary[];
  totalTeamHours: number;
  overloadedCount: number;
  memberCount: number;
}

export interface AnalysisResult {
  monthlyData: Record<string, MonthlyAnalysis>;
  allMonthKeys: string[];
}
