
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
          const lowerName = name.toLowerCase();

          for (const rule of rules) {
            const matchesKeyword = lowerName.includes(rule.keyword.toLowerCase());
            const matchesSynonym = rule.synonyms?.some(syn => lowerName.includes(syn.toLowerCase()));
            if (matchesKeyword || matchesSynonym) {
              matchedRule = rule;
              calculatedDuration = rule.durationMinutes;
              break;
            }
          }

          return {
            name,
            owner,
            date: dateStr,
            monthKey,
            matchedRule,
            calculatedDuration
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
