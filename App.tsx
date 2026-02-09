
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileUp, LayoutDashboard, Database, HelpCircle, AlertCircle, Trash2, History, TrendingUp, Calendar, Download, Upload, Share2, Save, Cloud, RefreshCw, Copy, Link as LinkIcon, FileJson } from 'lucide-react';
import { RuleManager } from './components/RuleManager';
import { Dashboard } from './components/Dashboard';
import { DEFAULT_RULES, WORKING_DAYS_PER_WEEK, MAX_HOURS_PER_DAY } from './constants';
import { TaskRule, RawTask, MonthlyAnalysis, OwnerSummary, ProjectEntry } from './types';
import { parseExcelFile } from './services/excelParser';

const WORKING_DAYS_MONTH = 20; 
const CLOUD_API_NPOINT = "https://api.npoint.io/bins";

const App: React.FC = () => {
  const [rules, setRules] = useState<TaskRule[]>(DEFAULT_RULES);
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [projectData, setProjectData] = useState<Record<string, Record<string, ProjectEntry>>>({});
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'history'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [prefillRuleKeyword, setPrefillRuleKeyword] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // 1. Initial Load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('project');

    if (id) {
      loadFromCloud(id);
    } else {
      const savedRules = localStorage.getItem('workload_rules');
      const savedTasks = localStorage.getItem('workload_tasks');
      const savedProjects = localStorage.getItem('workload_projects');
      if (savedRules) setRules(JSON.parse(savedRules));
      if (savedTasks) {
        try {
          const rulesLookup = (savedRules ? JSON.parse(savedRules) : DEFAULT_RULES) as TaskRule[];
          const raw = JSON.parse(savedTasks);
          const hydrated = Array.isArray(raw) && Array.isArray(raw[0]) 
            ? raw.map((t: any[]) => ({
                name: t[0], owner: t[1], date: t[2], monthKey: t[3], 
                calculatedDuration: t[5] || 0,
                matchedRule: rulesLookup.find(r => r.keyword === t[4])
              }))
            : raw.map((t: any) => ({
                ...t,
                matchedRule: rulesLookup.find(r => r.keyword === (t.ruleKeyword || t.matchedRule?.keyword))
              }));
          setTasks(hydrated);
        } catch (e) {
          console.error("Local data corrupted, clearing...");
          localStorage.removeItem('workload_tasks');
        }
      }
      if (savedProjects) setProjectData(JSON.parse(savedProjects));
    }
  }, []);

  // 2. Auto-save Local
  useEffect(() => {
    if (!projectId) {
      localStorage.setItem('workload_rules', JSON.stringify(rules));
      const compactTasks = tasks.map(t => [
        t.name, t.owner, t.date, t.monthKey, t.matchedRule?.keyword || '', t.calculatedDuration
      ]);
      localStorage.setItem('workload_tasks', JSON.stringify(compactTasks));
      localStorage.setItem('workload_projects', JSON.stringify(projectData));
    }
  }, [rules, tasks, projectData, projectId]);

  const loadFromCloud = async (id: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(`${CLOUD_API_NPOINT}/${id}`);
      if (!response.ok) throw new Error("Connection failed.");
      const data = await response.json();
      applyProjectData(data, id);
    } catch (err) {
      setError("Cannot connect to cloud database. The link might be expired.");
      setProjectId(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyProjectData = (data: any, id: string | null) => {
    const loadedRules = data.r || DEFAULT_RULES;
    const loadedProjects = data.p || {};
    const hydratedTasks = (data.t || []).map((t: any[]) => ({
      name: t[0], owner: t[1], date: t[2], monthKey: t[3], 
      calculatedDuration: t[5] || 0,
      matchedRule: loadedRules.find((r: TaskRule) => r.keyword === t[4])
    }));
    setRules(loadedRules);
    setTasks(hydratedTasks);
    setProjectData(loadedProjects);
    setProjectId(id);
    if (hydratedTasks.length > 0) setSelectedMonth(hydratedTasks[0].monthKey);
  };

  const handleSyncToCloud = async (retryCount = 0) => {
    if (tasks.length === 0 && rules.length === 0) return;
    setIsSyncing(true);
    setError(null);
    try {
      const compactTasks = tasks.map(t => [
        t.name, t.owner, t.date, t.monthKey, t.matchedRule?.keyword || '', t.calculatedDuration
      ]);
      const payload = { r: rules, t: compactTasks, p: projectData, u: new Date().toISOString() };
      
      const response = await fetch(CLOUD_API_NPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (retryCount < 2) {
          setTimeout(() => handleSyncToCloud(retryCount + 1), 2000);
          return;
        }
        throw new Error("Server is too busy. Please use 'Download Project' to share via file instead.");
      }
      
      const result = await response.json();
      const newId = result.id;
      setProjectId(newId);
      const newUrl = `${window.location.origin}${window.location.pathname}?project=${newId}`;
      window.history.pushState({}, '', newUrl);
      navigator.clipboard.writeText(newUrl);
      alert(`Sync OK! Shareable link copied to clipboard.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportFile = () => {
    const compactTasks = tasks.map(t => [
      t.name, t.owner, t.date, t.monthKey, t.matchedRule?.keyword || '', t.calculatedDuration
    ]);
    const payload = { r: rules, t: compactTasks, p: projectData, u: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workload-project-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        applyProjectData(data, null);
        setActiveTab('dashboard');
        alert("Project imported successfully!");
      } catch (err) {
        setError("Invalid project file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

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
        if (!t.matchedRule) unmatchedMap[t.name] = (unmatchedMap[t.name] || 0) + 1;
      });

      const summaries: OwnerSummary[] = Object.entries(ownerGroups).map(([owner, ownerTasks]) => {
        const taskMinutes = ownerTasks.reduce((acc, curr) => acc + curr.calculatedDuration, 0);
        const taskDailyHours = (taskMinutes / 60) / WORKING_DAYS_PER_WEEK;
        const pInfo = projectData[monthKey]?.[owner] || { standardCount: 0, aiCount: 0 };
        // Changed calculation from 3h to 8h for AI projects
        const totalProjectHours = (pInfo.standardCount * 24) + (pInfo.aiCount * 8);
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
      setProjectId(null); 
    } catch (err) {
      setError("Could not read Excel file.");
    } finally {
      setIsAnalyzing(false);
      event.target.value = '';
    }
  };

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
              <div className="flex items-center gap-1.5 mt-0.5">
                {projectId ? (
                  <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                    <Cloud size={10} /> Cloud Sync Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                    <Save size={10} /> Local Mode
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><LayoutDashboard size={16} /> Dashboard</button>
            <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><History size={16} /> History</button>
            <button onClick={() => setActiveTab('rules')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'rules' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Database size={16} /> Rules</button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 mr-2 px-2 border-r border-slate-200">
              <button onClick={handleExportFile} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all" title="Download Project File (.json)">
                <Download size={20} />
              </button>
              <label className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all" title="Import Project File (.json)">
                <Upload size={20} />
                <input type="file" className="hidden" accept=".json" onChange={handleImportFile} />
              </label>
            </div>

            {(tasks.length > 0 || rules.length > 0) && (
              <button 
                onClick={() => handleSyncToCloud()} 
                disabled={isSyncing}
                title="Sync to cloud and get link"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${isSyncing ? 'bg-indigo-50 text-indigo-400 border-indigo-100' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 shadow-sm'}`}
              >
                {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Share2 size={18} />}
                <span className="hidden md:inline">Sync & Share</span>
              </button>
            )}

            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100">
              <FileUp size={18} />
              <span className="hidden sm:inline">Upload Excel</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {projectId && (
          <div className="mb-6 bg-indigo-600 text-white px-6 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg"><LinkIcon size={20} /></div>
              <div>
                <p className="text-sm font-bold">Public Project Link Active</p>
                <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">Link is active for others to view</p>
              </div>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied!');
              }}
              className="bg-white text-indigo-600 px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 hover:bg-indigo-50 transition-colors"
            >
              <Copy size={14} /> Copy Public URL
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-amber-50 text-amber-800 px-6 py-4 rounded-2xl border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={24} />
                <div>
                  <p className="font-bold">Cloud Sync Encountered an Issue</p>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleExportFile} 
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors shadow-sm"
                >
                  <Download size={16} /> Download Project File
                </button>
                <button 
                  onClick={() => handleSyncToCloud()} 
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
                >
                  <RefreshCw size={16} /> Retry Sync
                </button>
              </div>
            </div>
          </div>
        )}
        
        {isAnalyzing ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="font-medium animate-pulse">Processing Data Stream...</p>
          </div>
        ) : activeTab === 'rules' ? (
          <RuleManager rules={rules} onUpdateRules={(newRules) => { setRules(newRules); setProjectId(null); }} prefillKeyword={prefillRuleKeyword} onClearPrefill={() => setPrefillRuleKeyword(null)} />
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
            ) : <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300"><History size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-medium">Upload an Excel file to see history.</p></div>}
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
              onUpdateProject={(owner, standard, ai) => { updateProjectCounts(selectedMonth, owner, standard, ai); setProjectId(null); }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><FileUp size={40} /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">100% Reliable Dashboard Sharing</h2>
            <p className="text-slate-500 mb-8 font-medium">If Cloud Sync is busy, you can still share by clicking the <Download className="inline-block mx-1 w-4 h-4" /> icon to save your work as a file and sending it to your team.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <label className="w-full sm:w-auto cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-xl shadow-indigo-200 text-center">
                Select Excel File
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </label>
              <label className="w-full sm:w-auto cursor-pointer bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-sm text-center">
                Import Project File (.json)
                <input type="file" className="hidden" accept=".json" onChange={handleImportFile} />
              </label>
            </div>
          </div>
        )}
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        <p>© 2024 Workload Insight • Cloud & Local Project Fallback Enabled</p>
      </footer>
    </div>
  );
};

export default App;
