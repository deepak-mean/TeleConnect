import { useState } from 'react';

const CATEGORIES = ['fever', 'feeding', 'vaccination', 'appointment', 'emergency', 'general', 'infection', 'growth', 'injury'];

export default function FAQEditor({ faq, onSave, onCancel }) {
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [category, setCategory] = useState(faq?.category || 'general');
  const [language, setLanguage] = useState(faq?.language || 'hi');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      await onSave({ question, answer, category, language });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          className="input resize-none"
          rows={2}
          placeholder="Patient ka sawaal..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          className="input resize-none"
          rows={4}
          placeholder="Jawab..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input">
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select value={language} onChange={e => setLanguage(e.target.value)} className="input">
            <option value="hi">Hindi</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
