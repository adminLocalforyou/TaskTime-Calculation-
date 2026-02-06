
import React, { useState } from 'react';
import { TaskRule } from '../types';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface RuleManagerProps {
  rules: TaskRule[];
  onUpdateRules: (rules: TaskRule[]) => void;
}

export const RuleManager: React.FC<RuleManagerProps> = ({ rules, onUpdateRules }) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newDuration, setNewDuration] = useState<number>(60);
  const [isAdding, setIsAdding] = useState(false);

  const addRule = () => {
    if (!newKeyword.trim()) return;
    const newRule: TaskRule = {
      id: Math.random().toString(36).substr(2, 9),
      keyword: newKeyword.trim(),
      durationMinutes: newDuration
    };
    onUpdateRules([...rules, newRule]);
    setNewKeyword('');
    setNewDuration(60);
    setIsAdding(false);
  };

  const removeRule = (id: string) => {
    onUpdateRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Knowledge Base</h2>
          <p className="text-sm text-slate-500">Define keywords and estimated durations (minutes)</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Add Rule
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-indigo-700 uppercase mb-1">Keyword</label>
            <input 
              type="text" 
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. Report, Meeting, Code"
              className="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-indigo-700 uppercase mb-1">Duration (Min)</label>
            <input 
              type="number" 
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={addRule}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Check size={20} />
            </button>
            <button 
              onClick={() => setIsAdding(false)}
              className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rules.map((rule) => (
          <div key={rule.id} className="group flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors">
            <div className="flex flex-col">
              <span className="font-semibold text-slate-700">{rule.keyword}</span>
              <span className="text-xs text-slate-500">{rule.durationMinutes} minutes</span>
            </div>
            <button 
              onClick={() => removeRule(rule.id)}
              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
