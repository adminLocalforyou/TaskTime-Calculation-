
import * as XLSX from 'xlsx';
import { RawTask, TaskRule } from '../types';

export const parseExcelFile = async (file: File, rules: TaskRule[]): Promise<RawTask[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const tasks: RawTask[] = jsonData.map((row) => {
          // Flexible header matching
          const name = row['Name'] || row['task name'] || row['Task Name'] || row['Task'] || '';
          const owner = row['Task owner'] || row['Task Owner'] || row['Owner'] || row['Person'] || 'Unknown';
          const date = row['Date'] || row['date'] || '';

          // Find matching rule
          let matchedRule: TaskRule | undefined;
          let calculatedDuration = 0;

          // Check keywords (case-insensitive)
          for (const rule of rules) {
            if (name.toLowerCase().includes(rule.keyword.toLowerCase())) {
              matchedRule = rule;
              calculatedDuration = rule.durationMinutes;
              break;
            }
          }

          return {
            name,
            owner,
            date,
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
