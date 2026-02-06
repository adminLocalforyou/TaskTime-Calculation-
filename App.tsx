
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileUp, Info, LayoutDashboard, Database, HelpCircle, AlertCircle, Trash2, History, TrendingUp, Calendar } from 'lucide-react';
import { RuleManager } from './components/RuleManager';
import { Dashboard } from './components/Dashboard';
import { DEFAULT_RULES, WORKING_DAYS_PER_WEEK, MAX_HOURS_PER_DAY } from './constants';
import { TaskRule, RawTask, MonthlyAnalysis, OwnerSummary, UnmatchedTaskInfo } from './types';
import { parseExcelFile } from './services/excelParser';

const App: React.FC = () => {
  // Persistence: Load initial data from localStorage
  const [rules, setRules] = useState<TaskRule[]>(() => {
    const saved = localStorage.getItem('workload_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });
  
  const [tasks, setTasks] = useState<RawTask[]>(() => {
    const saved = localStorage.getItem('workload_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'history'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [prefillRuleKeyword, setPrefillRuleKeyword] = useState<string | null>(null);

  // Save data whenever it changes
  useEffect(() => {
    localStorage.setItem('workload_rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('workload_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Group tasks by month and analyze
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
        // Group by owner
        if (!ownerGroups[t.owner]) ownerGroups[t.owner] = [];
        ownerGroups[t.owner].push(t);

        // Track unmatched tasks
        if (!t.matchedRule) {
          unmatchedMap[t.name] = (unmatchedMap[t.name] || 0) + 1;
        }
      });

      const summaries: OwnerSummary[] = Object.entries(ownerGroups).map(([owner, ownerTasks]) => {
        const totalMinutes = ownerTasks.reduce((acc, curr) => acc + curr.calculatedDuration, 0);
        const totalHours = totalMinutes / 60;
        const avgHoursPerDay = totalHours / WORKING_DAYS_PER_WEEK;

        return { owner, totalMinutes, totalHours, avgHoursPerDay, taskCount: ownerTasks.length, tasks: ownerTasks };
      });

      const unmatchedTasks: UnmatchedTaskInfo[] = Object.entries(unmatchedMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

      result[monthKey] = {
        monthKey,
        monthName,
        summaries,
        unmatchedTasks,
        totalTeamHours: summaries.reduce((acc, curr) => acc + curr.totalHours, 0),
        overloadedCount: summaries.filter(s => s.avgHoursPerDay > MAX_HOURS_PER_DAY).length,
        memberCount: summaries.length
      };
    });

    return result;
  }, [tasks]);

  const allMonthKeys = useMemo(() => 
    Object.keys(analysisByMonth).sort((a, b) => b.localeCompare(a))
  , [analysisByMonth]);

  // Set default selected month to the latest one available
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
      if (newParsedTasks.length > 0) {
        setSelectedMonth(newParsedTasks[0].monthKey);
      }
    } catch (err) {
      console.error(err);
      setError("Could not read the Excel file. Please check column headers.");
    } finally {
      setIsAnalyzing(false);
      event.target.value = '';
    }
  };

  const handleClearData = () => {
    if (window.confirm('Delete all data? This will clear all history and current analysis.')) {
      setTasks([]);
      setSelectedMonth('');
      localStorage.removeItem('workload_tasks');
    }
  };

  const handleCreateRuleFromUnmatched = (keyword: string) => {
    setPrefillRuleKeyword(keyword);
    setActiveTab('rules');
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
    }
  }, [rules]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <TrendingUp size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-slate-800 text-lg leading-none">Workload Insight</h1>
              <p className="text-xs text-slate-500 font-medium">Monthly History Tracker</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <History size={16} /> History
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'rules' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Database size={16} /> Rules
            </button>
          </nav>

          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <button onClick={handleClearData} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Reset All">
                <Trash2 size={20} />
              </button>
            )}
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100">
              <FileUp size={18} />
              <span className="hidden sm:inline">Upload Report</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {isAnalyzing ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="font-medium animate-pulse">Processing monthly data...</p>
          </div>
        ) : activeTab === 'rules' ? (
          <RuleManager 
            rules={rules} 
            onUpdateRules={setRules} 
            prefillKeyword={prefillRuleKeyword} 
            onClearPrefill={() => setPrefillRuleKeyword(null)}
          />
        ) : activeTab === 'history' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Monthly Performance History</h2>
              <div className="text-sm text-slate-500 font-medium">{allMonthKeys.length} Months Tracked</div>
            </div>
            {allMonthKeys.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allMonthKeys.map(key => {
                  const data = analysisByMonth[key];
                  return (
                    <div key={key} 
                      onClick={() => { setSelectedMonth(key); setActiveTab('dashboard'); }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Calendar size={20} />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${data.overloadedCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {data.overloadedCount > 0 ? 'Hiring Needed?' : 'Healthy'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{data.monthName}</h3>
                      <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Avg Members:</span>
                          <span className="font-bold text-slate-700">{data.memberCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Overloaded Staff:</span>
                          <span className={`font-bold ${data.overloadedCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{data.overloadedCount}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-50 pt-2">
                          <span className="text-slate-500 font-medium">Total Workload:</span>
                          <span className="font-bold text-indigo-600">{data.totalTeamHours.toFixed(1)} hrs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
                <History size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No history available yet. Upload reports to see trends.</p>
              </div>
            )}
          </div>
        ) : tasks.length > 0 && selectedMonth ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Current Dashboard</h2>
                <p className="text-slate-500 text-sm">Reviewing workload for {analysisByMonth[selectedMonth]?.monthName}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Select Month:</span>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2 font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                >
                  {allMonthKeys.map(key => (
                    <option key={key} value={key}>{analysisByMonth[key].monthName}</option>
                  ))}
                </select>
              </div>
            </div>
            <Dashboard 
              result={analysisByMonth[selectedMonth]} 
              onCreateRule={handleCreateRuleFromUnmatched}
            />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileUp size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Track Team Progress Over Time</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Upload your weekly Excel reports. We'll automatically group them by month and build a history to help you decide when to scale your team.
            </p>
            <label className="inline-flex cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all hover:scale-105 shadow-xl shadow-indigo-100">
              Start by Uploading a Report
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-slate-400 text-xs">
          <p>© 2024 Workload Insight. Data stored locally in your browser.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="flex items-center gap-1 cursor-help"><HelpCircle size={14} /> Guide</span>
            <span className="cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setActiveTab('rules')}>Configure Rules</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
