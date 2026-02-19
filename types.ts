
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
  possibleRules?: TaskRule[];
  isAmbiguous?: boolean;
}

export type ProjectWeightType = 'standard' | 'ai';

export interface ProjectEntry {
  standardCount: number;
  aiCount: number;
}

export interface OwnerSummary {
  owner: string;
  totalMinutes: number;
  totalHours: number;
  standardProjectCount: number;
  aiProjectCount: number;
  projectDailyImpact: number;
  avgHoursPerDay: number; // Includes tasks + project impact
  taskCount: number;
  tasks: RawTask[];
}

export interface UnmatchedTaskInfo {
  name: string;
  count: number;
}

export interface MonthlyAnalysis {
  monthKey: string;
  monthName: string;
  summaries: OwnerSummary[];
  totalTeamHours: number;
  overloadedCount: number;
  memberCount: number;
  unmatchedTasks: UnmatchedTaskInfo[];
  ambiguousTasks: RawTask[];
}

export interface AnalysisResult {
  monthlyData: Record<string, MonthlyAnalysis>;
  allMonthKeys: string[];
}
