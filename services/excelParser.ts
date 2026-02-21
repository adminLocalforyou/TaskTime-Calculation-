
import * as XLSX from 'xlsx';
import { RawTask, TaskRule } from '../types';

export const parseExcelFile = async (file: File, rules: TaskRule[]): Promise<RawTask[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const tasks: RawTask[] = jsonData.map((row) => {
          const name = String(row['Name'] || row['task name'] || row['Task Name'] || row['Task'] || '');
          const owner = String(row['Task owner'] || row['Task Owner'] || row['Owner'] || row['Person'] || 'Unknown');
          
          // Handle Date
          let dateObj = new Date();
          const rawDate = row['Date'] || row['date'];
          if (rawDate instanceof Date) {
            dateObj = rawDate;
          } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) dateObj = parsed;
          }

          const dateStr = dateObj.toISOString().split('T')[0];
          const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

          // Find matching rule
          let matchedRule: TaskRule | undefined;
          let calculatedDuration = 0;
          let possibleRules: TaskRule[] = [];
          let isAmbiguous = false;
          const lowerName = name.toLowerCase().trim();

          // 1. Check for exact match first (highest priority)
          const exactMatch = rules.find(r => r.keyword.toLowerCase().trim() === lowerName);
          
          if (exactMatch) {
            matchedRule = exactMatch;
            calculatedDuration = exactMatch.durationMinutes;
            possibleRules = [exactMatch];
          } else {
            // 2. Find all partial matches
            const matches = rules.filter(rule => {
              const kw = rule.keyword.toLowerCase().trim();
              const matchesKeyword = kw.length > 0 && lowerName.includes(kw);
              const matchesSynonym = rule.synonyms?.some(syn => {
                const s = syn.toLowerCase().trim();
                return s.length > 0 && lowerName.includes(s);
              });
              return matchesKeyword || matchesSynonym;
            });

            if (matches.length > 0) {
              // Sort by keyword length descending (longer keywords are more specific)
              // If lengths are equal, sort by duration descending as a tie-breaker
              matches.sort((a, b) => {
                const lenA = a.keyword.length;
                const lenB = b.keyword.length;
                if (lenB !== lenA) return lenB - lenA;
                return b.durationMinutes - a.durationMinutes;
              });

              possibleRules = matches;
              
              // Mark as ambiguous if there are multiple matches with different durations
              const uniqueDurations = new Set(matches.map(m => m.durationMinutes));
              if (uniqueDurations.size > 1) {
                isAmbiguous = true;
                // If ambiguous, don't pick a default rule. Let the user decide.
                matchedRule = undefined;
                calculatedDuration = 0;
              } else {
                // Not ambiguous (or all matches have same duration), pick the best one
                matchedRule = matches[0];
                calculatedDuration = matchedRule.durationMinutes;
              }
            }
          }

          return {
            name,
            owner,
            date: dateStr,
            monthKey,
            matchedRule,
            calculatedDuration,
            possibleRules: possibleRules.length > 1 ? possibleRules : undefined,
            isAmbiguous
          };
        });

        resolve(tasks);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
