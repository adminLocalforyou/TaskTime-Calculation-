
import { TaskRule } from './types';

export const DEFAULT_RULES: TaskRule[] = [
  { id: '1', keyword: 'Meeting', durationMinutes: 60 },
  { id: '2', keyword: 'Email', durationMinutes: 15 },
  { id: '3', keyword: 'Development', durationMinutes: 120 },
  { id: '4', keyword: 'Research', durationMinutes: 90 },
  { id: '5', keyword: 'Testing', durationMinutes: 45 },
  { id: '6', keyword: 'Documentation', durationMinutes: 60 },
  { id: '7', keyword: 'Design', durationMinutes: 180 },
  { id: '8', keyword: 'Bug', durationMinutes: 60 },
];

export const MAX_HOURS_PER_DAY = 8;
export const WORKING_DAYS_PER_WEEK = 5;
