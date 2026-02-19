
import React, { useState, useEffect, useMemo } from 'react';
import { TaskRule } from '../types';
import { Plus, Trash2, Check, X, Tag, Pencil, Search, Download, Upload, Database } from 'lucide-react';

interface RuleManagerProps {
  rules: TaskRule[];
  onUpdateRules: (rules: TaskRule[]) => void;
  prefillKeyword?: string | null;
  onClearPrefill?: () => void;
}

export const RuleManager: React.FC<RuleManagerProps> = ({ 
  rules, 
  onUpdateRules, 
  prefillKeyword, 
  onClearPrefill 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newSynonyms, setNewSynonyms] = useState('');
  const [newDuration, setNewDuration] = useState<number>(60);
  const [isAdding, setIsAdding] = useState(false);

  const handleExportRules = () => {
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workload-rules-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRules = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedRules = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedRules)) {
          if (window.confirm('Do you want to MERGE these rules with existing ones? (Cancel to REPLACE all existing rules)')) {
            const existingKeywords = new Set(rules.map(r => r.keyword.toLowerCase()));
            const newRules = [...rules];
            importedRules.forEach(r => {
              if (!existingKeywords.has(r.keyword.toLowerCase())) {
                newRules.push({ ...r, id: Math.random().toString(36).substr(2, 9) });
              }
            });
            onUpdateRules(newRules);
          } else {
            onUpdateRules(importedRules);
          }
          alert("Rules imported successfully!");
        }
      } catch (err) {
        alert("Invalid rules file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // State for editing existing rules
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editSynonyms, setEditSynonyms] = useState('');
  const [editDuration, setEditDuration] = useState<number>(60);

  // Filter rules based on search term
  const filteredRules = useMemo(() => {
    if (!searchTerm.trim()) return rules;
    const lowerSearch = searchTerm.toLowerCase();
    return rules.filter(rule => 
      rule.keyword.toLowerCase().includes(lowerSearch) || 
      rule.synonyms?.some(syn => syn.toLowerCase().includes(lowerSearch))
    );
  }, [rules, searchTerm]);

  // Handle prefill from Dashboard
  useEffect(() => {
    if (prefillKeyword) {
      setNewKeyword(prefillKeyword);
      setIsAdding(true);
      // Clean up prefill after setting it
      onClearPrefill?.();
    }
  }, [prefillKeyword, onClearPrefill]);

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

  const startEditing = (rule: TaskRule) => {
    setEditingId(rule.id);
    setEditKeyword(rule.keyword);
    setEditSynonyms(rule.synonyms ? rule.synonyms.join(', ') : '');
    setEditDuration(rule.durationMinutes);
    setIsAdding(false); // Close add form if open
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editKeyword.trim()) return;

    const synonymsArray = editSynonyms
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '');

    const updatedRules = rules.map(r => 
      r.id === editingId 
        ? { 
            ...r, 
            keyword: editKeyword.trim(), 
            synonyms: synonymsArray.length > 0 ? synonymsArray : undefined, 
            durationMinutes: editDuration 
          } 
        : r
    );

    onUpdateRules(updatedRules);
    setEditingId(null);
  };

  const removeRule = (id: string) => {
    if (window.confirm('Are you sure you want to remove this rule?')) {
      onUpdateRules(rules.filter(r => r.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Knowledge Base</h2>
          <p className="text-sm text-slate-500">Define keywords, synonyms, and estimated durations (minutes)</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={handleExportRules}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
              title="Export Knowledge Base (.json)"
            >
              <Download size={18} />
            </button>
            <label className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg cursor-pointer transition-all" title="Import Knowledge Base (.json)">
              <Upload size={18} />
              <input type="file" className="hidden" accept=".json" onChange={handleImportRules} />
            </label>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search keyword or synonyms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {!isAdding && !editingId && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-100 font-semibold"
            >
              <Plus size={18} />
              Add Rule
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="mb-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top duration-300">
          <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <Plus size={16} /> Add New Knowledge Rule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-indigo-700/60 uppercase mb-1.5 ml-1">Main Keyword</label>
              <input 
                type="text" 
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. Meeting"
                className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-indigo-700/60 uppercase mb-1.5 ml-1">Synonyms (Comma-separated)</label>
              <input 
                type="text" 
                value={newSynonyms}
                onChange={(e) => setNewSynonyms(e.target.value)}
                placeholder="e.g. call, sync, huddle"
                className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="w-full">
              <label className="block text-xs font-bold text-indigo-700/60 uppercase mb-1.5 ml-1">Duration (Min)</label>
              <input 
                type="number" 
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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

      {filteredRules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map((rule) => (
            <div key={rule.id} className={`group relative p-5 bg-white rounded-2xl border transition-all ${editingId === rule.id ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-md' : 'border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1'}`}>
              {editingId === rule.id ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Main Keyword</label>
                    <input 
                      type="text" 
                      value={editKeyword}
                      onChange={(e) => setEditKeyword(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Synonyms</label>
                    <input 
                      type="text" 
                      value={editSynonyms}
                      onChange={(e) => setEditSynonyms(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Duration (Min)</label>
                    <input 
                      type="number" 
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-50">
                    <button 
                      onClick={saveEdit}
                      className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-indigo-700"
                    >
                      <Check size={14} /> Update
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-6">
                      <h3 className="text-lg font-bold text-slate-800 truncate">{rule.keyword}</h3>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">{rule.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => startEditing(rule)}
                        className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-indigo-50 rounded-lg"
                        title="Edit Rule"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => removeRule(rule.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg"
                        title="Delete Rule"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {rule.synonyms && rule.synonyms.length > 0 ? (
                      rule.synonyms.map((syn, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                          <Tag size={10} className="text-slate-400" /> {syn}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No synonyms defined</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
            <Search size={32} />
          </div>
          <p className="text-slate-500 font-medium">No rules match your search for "{searchTerm}"</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="mt-3 text-indigo-600 font-bold text-sm hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
};
