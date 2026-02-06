
export interface TaskRule {
  id: string;
  keyword: string;
  synonyms?: string[];
  durationMinutes: number;
}

export interface RawTask {
  name: string;
  owner: string;
  date?: string;
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

export interface AnalysisResult {
  summaries: OwnerSummary[];
  totalTeamHours: number;
  overloadedCount: number;
}
