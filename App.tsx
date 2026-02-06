
import React, { useState, useEffect, useCallback } from 'react';
import { FileUp, Info, LayoutDashboard, Database, HelpCircle, AlertCircle } from 'lucide-react';
import { RuleManager } from './components/RuleManager';
import { Dashboard } from './components/Dashboard';
import { DEFAULT_RULES, WORKING_DAYS_PER_WEEK, MAX_HOURS_PER_DAY } from './constants';
import { TaskRule, RawTask, AnalysisResult, OwnerSummary } from './types';
import { parseExcelFile } from './services/excelParser';

const App: React.FC = () => {
  const [rules, setRules] = useState<TaskRule[]>(DEFAULT_RULES);
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules'>('dashboard');
  const [error, setError] = useState<string | null>(null);

  const analyzeTasks = useCallback((taskList: RawTask[]) => {
    const ownerGroups: Record<string, RawTask[]> = {};
    
    taskList.forEach(task => {
      if (!ownerGroups[task.owner]) {
        ownerGroups[task.owner] = [];
      }
      ownerGroups[task.owner].push(task);
    });

    const summaries: OwnerSummary[] = Object.entries(ownerGroups).map(([owner, ownerTasks]) => {
      const totalMinutes = ownerTasks.reduce((acc, curr) => acc + curr.calculatedDuration, 0);
      const totalHours = totalMinutes / 60;
      const avgHoursPerDay = totalHours / WORKING_DAYS_PER_WEEK;

      return {
        owner,
        totalMinutes,
        totalHours,
        avgHoursPerDay,
        taskCount: ownerTasks.length,
        tasks: ownerTasks
      };
    }).sort((a, b) => b.avgHoursPerDay - a.avgHoursPerDay);

    const totalTeamHours = summaries.reduce((acc, curr) => acc + curr.totalHours, 0);
    const overloadedCount = summaries.filter(s => s.avgHoursPerDay > MAX_HOURS_PER_DAY).length;

    setAnalysis({
      summaries,
      totalTeamHours,
      overloadedCount
    });
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const parsedTasks = await parseExcelFile(file, rules);
      setTasks(parsedTasks);
      analyzeTasks(parsedTasks);
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
      setError("Could not read the Excel file. Please ensure it has 'Name' and 'Task Owner' columns.");
    } finally {
      setIsAnalyzing(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (tasks.length > 0) {
      const updatedTasks = tasks.map(task => {
        let matchedRule: TaskRule | undefined;
        let calculatedDuration = 0;
        const lowerName = task.name.toLowerCase();

        for (const rule of rules) {
          const matchesKeyword = lowerName.includes(rule.keyword.toLowerCase());
          const matchesSynonym = rule.synonyms?.some(syn => lowerName.includes(syn.toLowerCase()));

          if (matchesKeyword || matchesSynonym) {
            matchedRule = rule;
            calculatedDuration = rule.durationMinutes;
            break;
          }
        }
        return { ...task, matchedRule, calculatedDuration };
      });
      setTasks(updatedTasks);
      analyzeTasks(updatedTasks);
    }
  }, [rules, analyzeTasks]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-none">Workload Analyzer</h1>
              <p className="text-xs text-slate-500 font-medium">Team Efficiency Tracker</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'rules' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Database size={16} /> Knowledge Base
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100">
              <FileUp size={18} />
              <span>Upload Report</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {isAnalyzing ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="font-medium">Analyzing team data...</p>
          </div>
        ) : activeTab === 'rules' ? (
          <RuleManager rules={rules} onUpdateRules={setRules} />
        ) : analysis ? (
          <Dashboard result={analysis} />
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileUp size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Welcome to Team Analyzer</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Upload your weekly Excel report to calculate team workload. We use keyword matching (including synonyms) to estimate task durations. 
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-indigo-600 text-sm mb-1 flex items-center gap-2">
                  <Info size={14} /> Flexible Matching
                </h4>
                <p className="text-xs text-slate-500">Supports synonyms like 'Close' and 'Finish'</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-indigo-600 text-sm mb-1 flex items-center gap-2">
                  <Database size={14} /> Knowledge Base
                </h4>
                <p className="text-xs text-slate-500">Manage rules in the dedicated tab</p>
              </div>
            </div>

            <label className="inline-flex cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-100">
              Select Weekly Report
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-slate-400 text-xs">
          <p>© 2024 Team Workload Insight. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <span className="flex items-center gap-1"><HelpCircle size={14} /> Help Center</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
