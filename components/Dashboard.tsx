
import React from 'react';
import * as XLSX from 'xlsx';
import { MonthlyAnalysis } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { MAX_HOURS_PER_DAY } from '../constants';
import { AlertCircle, Clock, Users, UserPlus, HelpCircle, Plus, Download, Briefcase } from 'lucide-react';

interface DashboardProps {
  result: MonthlyAnalysis;
  onCreateRule?: (keyword: string) => void;
  onUpdateProject?: (owner: string, standardCount: number, aiCount: number) => void;
}

const isSinglePerson = (name: string): boolean => {
  const separators = [',', '&', '+', '/', ';', ' and ', ' & '];
  const teamKeywords = ['team', 'group', 'dept', 'department', 'แผนก', 'ทีม'];
  const lowerName = name.toLowerCase();
  if (separators.some(sep => lowerName.includes(sep))) return false;
  if (teamKeywords.some(keyword => lowerName.includes(keyword))) return false;
  return true;
};

export const Dashboard: React.FC<DashboardProps> = ({ result, onCreateRule, onUpdateProject }) => {
  const sortedSummaries = [...result.summaries].sort((a, b) => b.avgHoursPerDay - a.avgHoursPerDay);

  const chartData = sortedSummaries
    .filter(s => isSinglePerson(s.owner))
    .map(s => ({
      name: s.owner,
      hours: Number(s.avgHoursPerDay.toFixed(2)),
      taskHours: Number(((s.totalMinutes / 60) / 5).toFixed(2)),
      projectHours: Number(s.projectDailyImpact.toFixed(2)),
    }));

  const handleExportUnmatched = () => {
    if (!result.unmatchedTasks || result.unmatchedTasks.length === 0) return;
    const data = result.unmatchedTasks.map(t => ({ 'Task Name (Full)': t.name, 'Frequency Found': t.count }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Knowledge Gap");
    XLSX.writeFile(workbook, `Knowledge_Gap_${result.monthKey}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
          <div><p className="text-[10px] text-slate-400 font-bold uppercase">Staff Count</p><p className="text-xl font-bold text-slate-800">{result.memberCount}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Clock size={20} /></div>
          <div><p className="text-[10px] text-slate-400 font-bold uppercase">Task Hours</p><p className="text-xl font-bold text-slate-800">{result.totalTeamHours.toFixed(0)}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className={`p-3 rounded-xl ${result.overloadedCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}><AlertCircle size={20} /></div>
          <div><p className="text-[10px] text-slate-400 font-bold uppercase">Overloaded</p><p className="text-xl font-bold text-slate-800">{result.overloadedCount}</p></div>
        </div>
        <div className="bg-indigo-600 p-5 rounded-2xl flex items-center gap-4 shadow-lg shadow-indigo-100">
          <div className="p-3 bg-indigo-500/50 text-white rounded-xl"><UserPlus size={20} /></div>
          <div><p className="text-[10px] text-indigo-100 font-bold uppercase">Health Status</p><p className="text-xl font-bold text-white whitespace-nowrap">{result.overloadedCount > 0 ? 'Watching' : 'Excellent'}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Total Workload intensity (Tasks + Projects)</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">Hrs / Day</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value, name) => [`${value} hrs/day`, name === 'hours' ? 'Total Workload' : name]}
                />
                <ReferenceLine y={MAX_HOURS_PER_DAY} stroke="#fca5a5" strokeDasharray="3 3" />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hours > MAX_HOURS_PER_DAY ? '#ef4444' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase size={18} /> Project Impact</h3>
          <div className="text-sm text-slate-500 space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="font-bold text-slate-700">Standard Project: 24h</p>
              <p className="text-xs">Ex: Massage/Restaurant tasks.</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="font-bold text-blue-700">AI Receptionist: 8h</p>
              <p className="text-xs">Ex: AI System Setup/Maintenance.</p>
            </div>
            <p className="text-[10px] italic pt-2">* Impact is calculated by (Total Hours / 20 working days).</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Member</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Tasks</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Projects / Month</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Combined Avg (Hrs/Day)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSummaries.map((summary) => {
                const isOver = summary.avgHoursPerDay > MAX_HOURS_PER_DAY;
                return (
                  <tr key={summary.owner} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>{summary.owner}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 font-medium">{summary.taskCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                        <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Massage/Rest (24h)</span>
                          <input 
                            type="number" 
                            min="0"
                            value={summary.standardProjectCount}
                            onChange={(e) => onUpdateProject?.(summary.owner, parseInt(e.target.value) || 0, summary.aiProjectCount)}
                            className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center text-[10px] font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 p-1.5 bg-blue-50/50 rounded-lg border border-blue-100">
                          <span className="text-[9px] font-bold text-blue-400 uppercase">AI Reception (8h)</span>
                          <input 
                            type="number" 
                            min="0"
                            value={summary.aiProjectCount}
                            onChange={(e) => onUpdateProject?.(summary.owner, summary.standardProjectCount, parseInt(e.target.value) || 0)}
                            className="w-10 px-1 py-0.5 border border-blue-200 rounded text-center text-[10px] font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col">
                        <span className={`text-sm font-black ${isOver ? 'text-red-600' : 'text-indigo-600'}`}>
                          {summary.avgHoursPerDay.toFixed(1)} <span className="text-[10px] opacity-50">h/d</span>
                        </span>
                        {summary.projectDailyImpact > 0 && (
                          <span className="text-[9px] text-slate-400 font-medium">
                            (Incl. +{summary.projectDailyImpact.toFixed(1)}h project load)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isOver ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full border border-red-100 uppercase">
                          <AlertCircle size={10} /> Overloaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100 uppercase">
                          Optimal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {result.unmatchedTasks && result.unmatchedTasks.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-amber-800"><HelpCircle size={20} /><h3 className="font-bold">Knowledge Gap Identified</h3></div>
            <button onClick={handleExportUnmatched} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"><Download size={14} /> Export All</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {result.unmatchedTasks.slice(0, 8).map((task, idx) => (
              <div key={idx} className="bg-white border border-amber-200 p-3 rounded-xl flex items-center justify-between gap-4 shadow-sm hover:border-amber-400 transition-colors">
                <div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-slate-800 truncate">{task.name}</p><p className="text-[10px] text-amber-600 font-medium">Found {task.count} times</p></div>
                <button onClick={() => onCreateRule?.(task.name)} className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg flex-shrink-0"><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
