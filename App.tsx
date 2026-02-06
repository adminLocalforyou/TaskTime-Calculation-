
import React, { useState, useEffect, useMemo } from 'react';
import { FileUp, LayoutDashboard, Database, HelpCircle, AlertCircle, Trash2, History, TrendingUp, Calendar } from 'lucide-react';
import { RuleManager } from './components/RuleManager';
import { Dashboard } from './components/Dashboard';
import { DEFAULT_RULES, WORKING_DAYS_PER_WEEK, MAX_HOURS_PER_DAY } from './constants';
import { TaskRule, RawTask, MonthlyAnalysis, OwnerSummary, ProjectEntry } from './types';
import { parseExcelFile } from './services/excelParser';

const WORKING_DAYS_MONTH = 20; 

const App: React.FC = () => {
  const [rules, setRules] = useState<TaskRule[]>(() => {
    const saved = localStorage.getItem('workload_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  
  const [tasks, setTasks] = useState<RawTask[]>(() => {
    const saved = localStorage.getItem('workload_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [projectData, setProjectData] = useState<Record<string, Record<string, ProjectEntry>>>(() => {
    const saved = localStorage.getItem('workload_projects');
    return saved ? JSON.parse(saved) : {};
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'history'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [prefillRuleKeyword, setPrefillRuleKeyword] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('workload_rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('workload_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('workload_projects', JSON.stringify(projectData));
  }, [projectData]);

  const updateProjectCounts = (monthKey: string, owner: string, standardCount: number, aiCount: number) => {
    setProjectData(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        [owner]: { standardCount, aiCount }
      }
    }));
  };

  const analysisByMonth = useMemo(() => {
    const months: Record<string, RawTask[]> = {};
    tasks.forEach(task => {
      if (!months[task.monthKey]) months[task.monthKey] = [];
      months[task.monthKey].push(task);
    });

    const result: Record<string, MonthlyAnalysis> = {};
    
    Object.entries(months).forEach(([monthKey, monthTasks]) => {
      const ownerGroups: Record<string, RawTask[]> = {};
      const unmatchedMap: Record<string, number> = {};

      monthTasks.forEach(t => {
        if (!ownerGroups[t.owner]) ownerGroups[t.owner] = [];
        ownerGroups[t.owner].push(t);
        if (!t.matchedRule) {
          unmatchedMap[t.name] = (unmatchedMap[t.name] || 0) + 1;
        }
      });

      const summaries: OwnerSummary[] = Object.entries(ownerGroups).map(([owner, ownerTasks]) => {
        const taskMinutes = ownerTasks.reduce((acc, curr) => acc + curr.calculatedDuration, 0);
        const taskDailyHours = (taskMinutes / 60) / WORKING_DAYS_PER_WEEK;
        
        // Project calculation (Multiple types supported)
        const pInfo = projectData[monthKey]?.[owner] || { standardCount: 0, aiCount: 0 };
        const totalProjectHours = (pInfo.standardCount * 24) + (pInfo.aiCount * 3);
        const projectDailyImpact = totalProjectHours / WORKING_DAYS_MONTH;

        return { 
          owner, 
          totalMinutes: taskMinutes, 
          totalHours: taskMinutes / 60, 
          standardProjectCount: pInfo.standardCount,
          aiProjectCount: pInfo.aiCount,
          projectDailyImpact,
          avgHoursPerDay: taskDailyHours + projectDailyImpact, 
          taskCount: ownerTasks.length, 
          tasks: ownerTasks 
        };
      });

      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

      result[monthKey] = {
        monthKey,
        monthName,
        summaries,
        unmatchedTasks: Object.entries(unmatchedMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        totalTeamHours: summaries.reduce((acc, curr) => acc + curr.totalHours, 0),
        overloadedCount: summaries.filter(s => s.avgHoursPerDay > MAX_HOURS_PER_DAY).length,
        memberCount: summaries.length
      };
    });

    return result;
  }, [tasks, projectData]);

  const allMonthKeys = useMemo(() => Object.keys(analysisByMonth).sort((a, b) => b.localeCompare(a)), [analysisByMonth]);

  useEffect(() => {
    if (allMonthKeys.length > 0 && !selectedMonth) {
      setSelectedMonth(allMonthKeys[0]);
    }
  }, [allMonthKeys, selectedMonth]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const newParsedTasks = await parseExcelFile(file, rules);
      setTasks(prev => [...prev, ...newParsedTasks]);
      setActiveTab('dashboard');
      if (newParsedTasks.length > 0) setSelectedMonth(newParsedTasks[0].monthKey);
    } catch (err) {
      setError("Could not read Excel file.");
    } finally {
      setIsAnalyzing(false);
      event.target.value = '';
    }
  };

  const handleClearData = () => {
    if (window.confirm('Clear all Dashboard and History data? Rules will be kept.')) {
      setTasks([]);
      setProjectData({});
      setSelectedMonth('');
      localStorage.removeItem('workload_tasks');
      localStorage.removeItem('workload_projects');
    }
  };

  useEffect(() => {
    if (tasks.length > 0) {
      setTasks(prev => prev.map(task => {
        let matchedRule: TaskRule | undefined;
        let calculatedDuration = 0;
        const lowerName = task.name.toLowerCase();
        for (const rule of rules) {
          if (lowerName.includes(rule.keyword.toLowerCase()) || rule.synonyms?.some(syn => lowerName.includes(syn.toLowerCase()))) {
            matchedRule = rule;
            calculatedDuration = rule.durationMinutes;
            break;
          }
        }
        return { ...task, matchedRule, calculatedDuration };
      }));
    }
  }, [rules]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <TrendingUp size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-slate-800 text-lg leading-none">Workload Insight</h1>
              <p className="text-xs text-slate-500 font-medium">Monthly History Tracker</p>
            </div>
          </div>
          <nav className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><LayoutDashboard size={16} /> Dashboard</button>
            <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><History size={16} /> History</button>
            <button onClick={() => setActiveTab('rules')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'rules' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Database size={16} /> Rules</button>
          </nav>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && <button onClick={handleClearData} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-all"><Trash2 size={20} /></button>}
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg">
              <FileUp size={18} /><span className="hidden sm:inline">Upload Report</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {error && <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3"><AlertCircle size={20} /><p className="text-sm font-medium">{error}</p></div>}
        {isAnalyzing ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="font-medium animate-pulse">Processing monthly data...</p>
          </div>
        ) : activeTab === 'rules' ? (
          <RuleManager rules={rules} onUpdateRules={setRules} prefillKeyword={prefillRuleKeyword} onClearPrefill={() => setPrefillRuleKeyword(null)} />
        ) : activeTab === 'history' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Monthly Performance History</h2>
            {allMonthKeys.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allMonthKeys.map(key => {
                  const data = analysisByMonth[key];
                  return (
                    <div key={key} onClick={() => { setSelectedMonth(key); setActiveTab('dashboard'); }} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Calendar size={20} /></div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${data.overloadedCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {data.overloadedCount > 0 ? 'Overloaded' : 'Healthy'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{data.monthName}</h3>
                    </div>
                  );
                })}
              </div>
            ) : <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300"><History size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500">No history available yet.</p></div>}
          </div>
        ) : tasks.length > 0 && selectedMonth ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div><h2 className="text-2xl font-bold text-slate-800">Current Dashboard</h2><p className="text-slate-500 text-sm">Reviewing {analysisByMonth[selectedMonth]?.monthName}</p></div>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-4 py-2 font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer">
                {allMonthKeys.map(key => <option key={key} value={key}>{analysisByMonth[key].monthName}</option>)}
              </select>
            </div>
            <Dashboard 
              result={analysisByMonth[selectedMonth]} 
              onCreateRule={(k) => { setPrefillRuleKeyword(k); setActiveTab('rules'); }}
              onUpdateProject={(owner, standard, ai) => updateProjectCounts(selectedMonth, owner, standard, ai)}
            />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><FileUp size={40} /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Track Team Workload</h2>
            <label className="inline-flex cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-xl">
              Start by Uploading a Report
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-slate-400 text-xs">
        <p>© 2024 Workload Insight. Data stored locally.</p>
      </footer>
    </div>
  );
};

export default App;
