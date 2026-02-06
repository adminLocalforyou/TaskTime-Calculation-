
import { TaskRule } from './types';

export const DEFAULT_RULES: TaskRule[] = [
  { id: '1', keyword: 'Meeting', synonyms: ['Sync', 'Call', 'Huddle', 'Discussion'], durationMinutes: 60 },
  { id: '2', keyword: 'Email', synonyms: ['Mail', 'Outlook', 'Correspondence'], durationMinutes: 15 },
  { id: '3', keyword: 'Development', synonyms: ['Coding', 'Programming', 'Implementation'], durationMinutes: 120 },
  { id: '4', keyword: 'Research', synonyms: ['Investigation', 'Analysis', 'Study'], durationMinutes: 90 },
  { id: '5', keyword: 'Testing', synonyms: ['QA', 'UAT', 'Verification', 'Validation'], durationMinutes: 45 },
  { id: '6', keyword: 'Documentation', synonyms: ['Writing', 'Manual', 'Wiki', 'Guide'], durationMinutes: 60 },
  { id: '7', keyword: 'Design', synonyms: ['UI', 'UX', 'Mockup', 'Prototype', 'Wireframe'], durationMinutes: 180 },
  { id: '8', keyword: 'Bug', synonyms: ['Issue', 'Fix', 'Defect', 'Error'], durationMinutes: 60 },
  { id: '9', keyword: 'Closed', synonyms: ['Close', 'Finish', 'Done', 'Completed'], durationMinutes: 10 },
];

export const MAX_HOURS_PER_DAY = 8;
export const WORKING_DAYS_PER_WEEK = 5;
