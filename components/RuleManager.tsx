
import React, { useState } from 'react';
import { TaskRule } from '../types';
import { Plus, Trash2, Check, X, Tag } from 'lucide-react';

interface RuleManagerProps {
  rules: TaskRule[];
  onUpdateRules: (rules: TaskRule[]) => void;
}

export const RuleManager: React.FC<RuleManagerProps> = ({ rules, onUpdateRules }) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newSynonyms, setNewSynonyms] = useState('');
  const [newDuration, setNewDuration] = useState<number>(60);
  const [isAdding, setIsAdding] = useState(false);

  const addRule = () => {
    if (!newKeyword.trim()) return;
    
    const synonymsArray = newSynonyms
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '');

    const newRule: TaskRule = {
      id: Math.random().toString(36).substr(2, 9),
      keyword: newKeyword.trim(),
      synonyms: synonymsArray.length > 0 ? synonymsArray : undefined,
      durationMinutes: newDuration
    };
    
    onUpdateRules([...rules, newRule]);
    setNewKeyword('');
    setNewSynonyms('');
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
          <p className="text-sm text-slate-500">Define keywords, synonyms, and estimated durations (minutes)</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus size={18} />
            Add Rule
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Main Keyword</label>
              <input 
                type="text" 
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. Meeting"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Synonyms (Comma-separated)</label>
              <input 
                type="text" 
                value={newSynonyms}
                onChange={(e) => setNewSynonyms(e.target.value)}
                placeholder="e.g. call, sync, huddle"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Duration (Min)</label>
              <input 
                type="number" 
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={addRule}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold flex items-center justify-center gap-2"
              >
                <Check size={20} /> Save Rule
              </button>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="group relative p-5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{rule.keyword}</h3>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{rule.durationMinutes} min</span>
              </div>
              <button 
                onClick={() => removeRule(rule.id)}
                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mt-2">
              {rule.synonyms && rule.synonyms.length > 0 ? (
                rule.synonyms.map((syn, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                    <Tag size={10} className="text-slate-400" /> {syn}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-400 italic">No synonyms</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
