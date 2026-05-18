import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import FAQEditor from '../components/FAQEditor';

const CATEGORIES = ['all', 'fever', 'feeding', 'vaccination', 'appointment', 'emergency', 'general', 'infection', 'growth', 'injury'];

export default function FAQs() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  async function fetchFAQs() {
    setLoading(true);
    try {
      const params = categoryFilter !== 'all' ? { category: categoryFilter } : {};
      const { data } = await api.get('/faqs', { params });
      setFaqs(data.faqs);
    } catch {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchFAQs(); }, [categoryFilter]);

  async function handleToggleActive(faq) {
    try {
      await api.patch(`/faqs/${faq.id}`, { is_active: !faq.is_active });
      setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, is_active: !f.is_active } : f));
    } catch {
      toast.error('Failed to update FAQ');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await api.delete(`/faqs/${id}`);
      setFaqs(prev => prev.filter(f => f.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function handleSave(data) {
    try {
      if (editingFAQ) {
        const res = await api.patch(`/faqs/${editingFAQ.id}`, data);
        setFaqs(prev => prev.map(f => f.id === editingFAQ.id ? res.data.faq : f));
        toast.success('Updated!');
        setEditingFAQ(null);
      } else {
        const res = await api.post('/faqs', data);
        setFaqs(prev => [...prev, res.data.faq]);
        toast.success('Added!');
        setShowAdd(false);
      }
    } catch {
      toast.error('Failed to save FAQ');
    }
  }

  async function handleAISuggest() {
    setAiLoading(true);
    try {
      const { data } = await api.post('/faqs/ai-suggest');
      setAiSuggestions(data.faqs.map((f, i) => ({ ...f, _id: i })));
      toast.success(`${data.faqs.length} suggestions ready!`);
    } catch {
      toast.error('AI suggestion failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function approveSuggestion(suggestion) {
    try {
      const { _id, ...faqData } = suggestion;
      const res = await api.post('/faqs', faqData);
      setFaqs(prev => [...prev, res.data.faq]);
      setAiSuggestions(prev => prev.filter(s => s._id !== _id));
      toast.success('Added to knowledge base!');
    } catch {
      toast.error('Failed to add FAQ');
    }
  }

  const grouped = faqs.reduce((acc, faq) => {
    const cat = faq.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-500 text-sm mt-0.5">{faqs.length} FAQs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAISuggest} className="btn-secondary" disabled={aiLoading}>
            {aiLoading ? '⏳ Generating…' : '✨ Suggest with AI'}
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            + Add FAQ
          </button>
        </div>
      </div>

      {/* AI Suggestions panel */}
      {aiSuggestions.length > 0 && (
        <div className="card mb-6 border-brand-200 bg-brand-50">
          <h3 className="font-bold text-brand-800 mb-3">✨ AI Suggestions ({aiSuggestions.length} remaining)</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {aiSuggestions.map(s => (
              <div key={s._id} className="bg-white border border-brand-100 rounded-lg p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{s.question}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.answer}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => approveSuggestion(s)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">✓ Add</button>
                  <button onClick={() => setAiSuggestions(prev => prev.filter(x => x._id !== s._id))}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAdd || editingFAQ) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingFAQ ? 'Edit FAQ' : 'Add FAQ'}
            </h2>
            <FAQEditor
              faq={editingFAQ}
              onSave={handleSave}
              onCancel={() => { setEditingFAQ(null); setShowAdd(false); }}
            />
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              categoryFilter === cat ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">💬</div>
          <p>No FAQs yet. Generate some with AI or add manually!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map(faq => (
                  <div key={faq.id} className={`border rounded-lg p-4 ${faq.is_active ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{faq.question}</div>
                        <div className="text-sm text-gray-600 mt-1">{faq.answer}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{faq.language}</span>
                          {faq.ai_suggested && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">AI</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(faq)}
                          className={`text-xs px-2 py-1 rounded ${faq.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                        >
                          {faq.is_active ? 'Active' : 'Off'}
                        </button>
                        <button onClick={() => setEditingFAQ(faq)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">✏️</button>
                        <button onClick={() => handleDelete(faq.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
