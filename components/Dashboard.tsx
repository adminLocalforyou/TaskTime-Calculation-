
import React from 'react';
import { MonthlyAnalysis } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { MAX_HOURS_PER_DAY } from '../constants';
import { AlertCircle, Clock, Users, UserPlus, HelpCircle, Plus } from 'lucide-react';

interface DashboardProps {
  result: MonthlyAnalysis;
  onCreateRule?: (keyword: string) => void;
}

const isSinglePerson = (name: string): boolean => {
  const separators = [',', '&', '+', '/', ';', ' and ', ' & '];
  const teamKeywords = ['team', 'group', 'dept', 'department', 'แผนก', 'ทีม'];
  const lowerName = name.toLowerCase();
  if (separators.some(sep => lowerName.includes(sep))) return false;
  if (teamKeywords.some(keyword => lowerName.includes(keyword))) return false;
  return true;
};

export const Dashboard: React.FC<DashboardProps> = ({ result, onCreateRule }) => {
  const sortedSummaries = [...result.summaries].sort((a, b) => {
    const aSingle = isSinglePerson(a.owner);
    const bSingle = isSinglePerson(b.owner);
    if (aSingle && !bSingle) return -1;
    if (!aSingle && bSingle) return 1;
    return b.avgHoursPerDay - a.avgHoursPerDay;
  });

  const chartData = sortedSummaries
    .filter(s => isSinglePerson(s.owner))
    .map(s => ({
      name: s.owner,
      hours: Number(s.avgHoursPerDay.toFixed(2)),
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Staff Count</p>
            <p className="text-xl font-bold text-slate-800">{result.memberCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Clock size={20} /></div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Monthly Hours</p>
            <p className="text-xl font-bold text-slate-800">{result.totalTeamHours.toFixed(0)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className={`p-3 rounded-xl ${result.overloadedCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Overloaded</p>
            <p className="text-xl font-bold text-slate-800">{result.overloadedCount}</p>
          </div>
        </div>
        <div className="bg-indigo-600 p-5 rounded-2xl flex items-center gap-4 shadow-lg shadow-indigo-100">
          <div className="p-3 bg-indigo-500/50 text-white rounded-xl"><UserPlus size={20} /></div>
          <div>
            <p className="text-[10px] text-indigo-100 font-bold uppercase">Health Status</p>
            <p className="text-xl font-bold text-white whitespace-nowrap">
              {result.overloadedCount > 2 ? 'Need Hiring' : result.overloadedCount > 0 ? 'Watching' : 'Excellent'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Daily Workload Intensity</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Individual Staff Only</span>
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
                  formatter={(value) => [`${value} hrs/day`, 'Workload']}
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
          <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Insights</h3>
          <div className="flex-1 space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 font-bold mb-1 uppercase">Top Performer (By Volume)</p>
              {sortedSummaries[0] && (
                <div className="flex justify-between items-end">
                  <span className="font-bold text-slate-800">{sortedSummaries[0].owner}</span>
                  <span className="text-xs font-bold text-indigo-600">{sortedSummaries[0].taskCount} tasks</span>
                </div>
              )}
            </div>
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-xs text-orange-600 font-bold mb-1 uppercase">Attention Needed</p>
              <p className="text-sm text-orange-800 leading-tight">
                {result.overloadedCount > 0 
                  ? `${result.overloadedCount} members are exceeding the 8h limit. This month requires careful capacity management.`
                  : "Workload distribution is healthy. Team is operating within optimal capacity."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {result.unmatchedTasks && result.unmatchedTasks.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-amber-800">
            <HelpCircle size={20} />
            <h3 className="font-bold">Knowledge Gap Identified</h3>
          </div>
          <p className="text-sm text-amber-700 mb-6">These task topics don't match any of your current rules. Adding them to your Knowledge Base will improve analysis accuracy.</p>
          <div className="flex flex-wrap gap-3">
            {result.unmatchedTasks.slice(0, 8).map((task, idx) => (
              <div key={idx} className="bg-white border border-amber-300 px-4 py-3 rounded-xl flex items-center justify-between gap-6 shadow-sm">
                <div>
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{task.name}</p>
                  <p className="text-[10px] text-amber-600 font-medium">Found {task.count} times</p>
                </div>
                <button 
                  onClick={() => onCreateRule?.(task.name)}
                  className="bg-amber-600 hover:bg-amber-700 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
                  title="Create Rule"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
            {result.unmatchedTasks.length > 8 && (
              <div className="flex items-center px-4 py-2 text-xs font-bold text-amber-600">
                + {result.unmatchedTasks.length - 8} more topics...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Member</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Tasks</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Avg Hours / Day</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Capacity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSummaries.map((summary) => {
                const isOver = summary.avgHoursPerDay > MAX_HOURS_PER_DAY;
                const isSingle = isSinglePerson(summary.owner);
                return (
                  <tr key={summary.owner} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>{summary.owner}</span>
                        {!isSingle && <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">Team</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 font-medium">{summary.taskCount}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-black ${isOver ? 'text-red-600' : 'text-indigo-600'}`}>
                        {summary.avgHoursPerDay.toFixed(1)} <span className="text-[10px] opacity-50">h/d</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isOver ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full border border-red-100">
                          <AlertCircle size={12} /> CRITICAL LOAD
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100">
                          OPTIMAL
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
    </div>
  );
};
