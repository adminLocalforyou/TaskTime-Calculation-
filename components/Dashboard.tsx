
import React from 'react';
import { AnalysisResult, OwnerSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { MAX_HOURS_PER_DAY } from '../constants';
import { AlertCircle, Clock, Users } from 'lucide-react';

interface DashboardProps {
  result: AnalysisResult;
}

/**
 * Heuristic to determine if an owner name represents a single person.
 * Returns false if the name contains common separators or team-related keywords.
 */
const isSinglePerson = (name: string): boolean => {
  const separators = [',', '&', '+', '/', ';', ' and ', ' & '];
  const teamKeywords = ['team', 'group', 'dept', 'department', 'แผนก', 'ทีม'];
  
  const lowerName = name.toLowerCase();
  
  // Check for separators
  if (separators.some(sep => lowerName.includes(sep))) return false;
  
  // Check for team keywords (unless it's a very short name that might coincidently match)
  if (teamKeywords.some(keyword => lowerName.includes(keyword))) return false;
  
  return true;
};

export const Dashboard: React.FC<DashboardProps> = ({ result }) => {
  // Sort summaries: Single persons first, then by workload. Multi-person entries go to the bottom.
  const sortedSummaries = [...result.summaries].sort((a, b) => {
    const aSingle = isSinglePerson(a.owner);
    const bSingle = isSinglePerson(b.owner);
    
    if (aSingle && !bSingle) return -1;
    if (!aSingle && bSingle) return 1;
    
    // Within the same group, sort by average hours descending
    return b.avgHoursPerDay - a.avgHoursPerDay;
  });

  // Chart data: Only include single-person entries as requested
  const chartData = sortedSummaries
    .filter(s => isSinglePerson(s.owner))
    .map(s => ({
      name: s.owner,
      hours: Number(s.avgHoursPerDay.toFixed(2)),
    }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Team Members</p>
            <p className="text-2xl font-bold text-slate-800">{result.summaries.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Weekly Hours</p>
            <p className="text-2xl font-bold text-slate-800">{result.totalTeamHours.toFixed(1)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${result.overloadedCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Overloaded ( > 8h/day )</p>
            <p className="text-2xl font-bold text-slate-800">{result.overloadedCount}</p>
          </div>
        </div>
      </div>

      {/* Charts - Only Single Person Names */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Individual Daily Workload</h3>
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">Single Person Filter Active</span>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                interval={0}
                tick={{ fontSize: 12 }}
                angle={chartData.length > 5 ? -15 : 0}
                textAnchor={chartData.length > 5 ? 'end' : 'middle'}
              />
              <YAxis label={{ value: 'Hours/Day', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <ReferenceLine y={MAX_HOURS_PER_DAY} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limit (8h)', position: 'right', fill: '#ef4444', fontSize: 12 }} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hours > MAX_HOURS_PER_DAY ? '#ef4444' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Team Workload Summary</h3>
          <p className="text-xs text-slate-400 font-medium italic">* Single persons listed first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Task Owner</th>
                <th className="px-6 py-4 text-center">Type</th>
                <th className="px-6 py-4 text-center">Tasks</th>
                <th className="px-6 py-4 text-center">Weekly Total</th>
                <th className="px-6 py-4 text-center">Avg Hours/Day</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSummaries.map((summary) => {
                const isSingle = isSinglePerson(summary.owner);
                return (
                  <tr key={summary.owner} className={`hover:bg-slate-50 transition-colors ${!isSingle ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${summary.avgHoursPerDay > MAX_HOURS_PER_DAY ? 'text-red-600' : 'text-slate-700'}`}>
                        {summary.owner}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${isSingle ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                        {isSingle ? 'Individual' : 'Multiple'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">{summary.taskCount}</td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">{summary.totalHours.toFixed(1)} hrs</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${summary.avgHoursPerDay > MAX_HOURS_PER_DAY ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {summary.avgHoursPerDay.toFixed(1)} h/d
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {summary.avgHoursPerDay > MAX_HOURS_PER_DAY ? (
                        <span className="flex items-center justify-center gap-1 text-red-500 text-sm font-medium">
                          <AlertCircle size={14} /> Overworked
                        </span>
                      ) : (
                        <span className="text-green-500 text-sm font-medium">Normal</span>
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
