import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit, Save, X, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Job } from '../../types';

interface Option { label: string; text: string; }
interface Question {
  id?: number;
  question_text: string;
  options: Option[];
  correct_answer: string;
  marks: number;
}

const EMPTY_Q: Question = {
  question_text: '',
  options: [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ],
  correct_answer: 'A',
  marks: 1,
};

interface Props { jobs: Job[] }

const QuestionManager: React.FC<Props> = ({ jobs }) => {
  const [selectedJob, setSelectedJob] = useState('');
  const [assessmentType, setAssessmentType] = useState<'aptitude' | 'sql'>('aptitude');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [form, setForm] = useState<Question>(EMPTY_Q);
  const [saving, setSaving] = useState(false);

  const loadQuestions = () => {
    if (!selectedJob) return;
    api.get(`/question-bank/${selectedJob}/${assessmentType}`)
      .then(r => setQuestions(r.data))
      .catch(() => setQuestions([]));
  };

  useEffect(() => { loadQuestions(); }, [selectedJob, assessmentType]);

  const openAdd = () => {
    setEditQ(null);
    setForm(JSON.parse(JSON.stringify(EMPTY_Q)));
    setShowForm(true);
  };

  const openEdit = (q: Question) => {
    setEditQ(q);
    setForm(JSON.parse(JSON.stringify(q)));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) return toast.error('Question text required');
    if (form.options.some(o => !o.text.trim())) return toast.error('Fill all 4 options');
    setSaving(true);
    try {
      if (editQ?.id) {
        await api.put(`/question-bank/${editQ.id}`, form);
        toast.success('Question updated');
      } else {
        await api.post(`/question-bank/${selectedJob}/${assessmentType}`, form);
        toast.success('Question added');
      }
      setShowForm(false);
      loadQuestions();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/question-bank/${id}`);
      toast.success('Deleted');
      loadQuestions();
    } catch { toast.error('Delete failed'); }
  };

  const updateOption = (idx: number, val: string) => {
    const opts = [...form.options];
    opts[idx] = { ...opts[idx], text: val };
    setForm({ ...form, options: opts });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Question Manager</h2>
        <p className="text-gray-400 text-sm mt-0.5">Add MCQ questions manually. Answers are hidden from candidates.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-violet-500">
          <option value="">Select Job</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          {(['aptitude', 'sql'] as const).map(t => (
            <button key={t} onClick={() => setAssessmentType(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${assessmentType === t ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
        {selectedJob && (
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium ml-auto">
            <Plus size={14} /> Add Question
          </button>
        )}
      </div>

      {/* Question list */}
      {selectedJob ? (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    <span className="text-gray-500 mr-2">Q{idx + 1}.</span>{q.question_text}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {q.options?.map((opt: Option) => (
                      <div key={opt.label}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${opt.label === q.correct_answer ? 'bg-green-500/15 border border-green-500/40 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                        {opt.label === q.correct_answer && <CheckCircle size={11} className="flex-shrink-0" />}
                        <span><strong>{opt.label}.</strong> {opt.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                    <span className="text-xs text-green-500">Answer: {q.correct_answer}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(q)}
                    className="p-1.5 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(q.id!)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!questions.length && (
            <div className="text-center py-12 text-gray-500">
              <p>No questions yet for this job + type.</p>
              <button onClick={openAdd} className="mt-3 text-violet-400 hover:text-violet-300 text-sm">
                + Add first question
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 text-sm">Select a job to manage questions</div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editQ ? 'Edit Question' : 'Add Question'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Question text */}
              <div>
                <label className="text-sm text-gray-300 block mb-1.5">Question *</label>
                <textarea rows={3} value={form.question_text}
                  onChange={e => setForm({ ...form, question_text: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
                  placeholder="Enter the question..." />
              </div>

              {/* Options */}
              <div>
                <label className="text-sm text-gray-300 block mb-2">Options *</label>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={opt.label} className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${form.correct_answer === opt.label ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                        {opt.label}
                      </span>
                      <input value={opt.text} onChange={e => updateOption(i, e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                        placeholder={`Option ${opt.label}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Correct answer */}
              <div>
                <label className="text-sm text-gray-300 block mb-2">Correct Answer *</label>
                <div className="flex gap-2">
                  {['A', 'B', 'C', 'D'].map(l => (
                    <button key={l} onClick={() => setForm({ ...form, correct_answer: l })}
                      className={`w-10 h-10 rounded-lg font-bold text-sm transition ${form.correct_answer === l ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marks */}
              <div>
                <label className="text-sm text-gray-300 block mb-1.5">Marks</label>
                <input type="number" min={0.5} step={0.5} value={form.marks}
                  onChange={e => setForm({ ...form, marks: Number(e.target.value) })}
                  className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
                <Save size={14} /> {saving ? 'Saving...' : editQ ? 'Update' : 'Add Question'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionManager;
