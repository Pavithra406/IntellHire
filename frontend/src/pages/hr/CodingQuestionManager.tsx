import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit, Save, X, Eye, EyeOff, Terminal } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Job } from '../../types';

interface TestCase { input: string; expected_output: string; is_hidden?: boolean; }
interface CodingQuestion {
  id?: number;
  question_text: string;
  marks: number;
  visible_test_cases: TestCase[];
  hidden_test_cases: TestCase[];
  total_test_cases?: number;
}

const EMPTY_Q: CodingQuestion = {
  question_text: '',
  marks: 10,
  visible_test_cases: [{ input: '', expected_output: '' }],
  hidden_test_cases: [{ input: '', expected_output: '' }],
};

interface Props { jobs: Job[] }

const CodingQuestionManager: React.FC<Props> = ({ jobs }) => {
  const [selectedJob, setSelectedJob] = useState('');
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editQ, setEditQ] = useState<CodingQuestion | null>(null);
  const [form, setForm] = useState<CodingQuestion>(EMPTY_Q);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = () => {
    if (!selectedJob) return;
    api.get(`/coding-bank/${selectedJob}`)
      .then(r => setQuestions(r.data))
      .catch(() => setQuestions([]));
  };

  useEffect(() => { load(); }, [selectedJob]);

  const openAdd = () => {
    setEditQ(null);
    setForm(JSON.parse(JSON.stringify(EMPTY_Q)));
    setShowForm(true);
  };

  const openEdit = (q: CodingQuestion) => {
    setEditQ(q);
    setForm({
      ...q,
      visible_test_cases: q.visible_test_cases?.length ? q.visible_test_cases : [{ input: '', expected_output: '' }],
      hidden_test_cases: q.hidden_test_cases?.length ? q.hidden_test_cases : [{ input: '', expected_output: '' }],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) return toast.error('Question text required');
    const validVisible = form.visible_test_cases.filter(tc => tc.input !== '' || tc.expected_output !== '');
    const validHidden = form.hidden_test_cases.filter(tc => tc.input !== '' || tc.expected_output !== '');
    if (!validVisible.length) return toast.error('Add at least one visible test case');

    setSaving(true);
    try {
      const payload = { ...form, visible_test_cases: validVisible, hidden_test_cases: validHidden };
      if (editQ?.id) {
        await api.put(`/coding-bank/${editQ.id}`, payload);
        toast.success('Question updated');
      } else {
        await api.post(`/coding-bank/${selectedJob}`, payload);
        toast.success('Question added');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/coding-bank/${id}`);
      toast.success('Deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const updateTC = (type: 'visible' | 'hidden', idx: number, field: 'input' | 'expected_output', val: string) => {
    const key = type === 'visible' ? 'visible_test_cases' : 'hidden_test_cases';
    const arr = [...form[key]];
    arr[idx] = { ...arr[idx], [field]: val };
    setForm({ ...form, [key]: arr });
  };

  const addTC = (type: 'visible' | 'hidden') => {
    const key = type === 'visible' ? 'visible_test_cases' : 'hidden_test_cases';
    setForm({ ...form, [key]: [...form[key], { input: '', expected_output: '' }] });
  };

  const removeTC = (type: 'visible' | 'hidden', idx: number) => {
    const key = type === 'visible' ? 'visible_test_cases' : 'hidden_test_cases';
    const arr = form[key].filter((_, i) => i !== idx);
    setForm({ ...form, [key]: arr.length ? arr : [{ input: '', expected_output: '' }] });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Coding Questions</h2>
        <p className="text-gray-400 text-sm mt-0.5">Add coding problems with visible and hidden test cases. Candidates code in Python, Java, or C.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-violet-500">
          <option value="">Select Job</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        {selectedJob && (
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium ml-auto">
            <Plus size={14} /> Add Coding Question
          </button>
        )}
      </div>

      {/* Language info */}
      {selectedJob && (
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 rounded-lg px-4 py-2">
          <Terminal size={13} />
          <span>Candidates can submit in: <strong className="text-violet-400">Python · Java · C</strong></span>
        </div>
      )}

      {/* Question list */}
      {selectedJob ? (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    <span className="text-gray-500 mr-2">Q{idx + 1}.</span>
                    {q.question_text.length > 120 ? q.question_text.slice(0, 120) + '...' : q.question_text}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">{q.marks} marks</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                      {q.visible_test_cases?.length || 0} visible + {q.hidden_test_cases?.length || 0} hidden test cases
                    </span>
                    <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id!)}
                      className="text-xs text-violet-400 hover:text-violet-300">
                      {expandedId === q.id ? 'Hide' : 'View'} test cases
                    </button>
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

              {expandedId === q.id && (
                <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">
                  {q.visible_test_cases?.length > 0 && (
                    <div>
                      <p className="text-xs text-green-400 font-medium mb-2 flex items-center gap-1">
                        <Eye size={11} /> Visible Test Cases (shown to candidate)
                      </p>
                      {q.visible_test_cases.map((tc, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2 mb-1.5 font-mono text-xs">
                          <div className="bg-gray-800 rounded p-2">
                            <span className="text-gray-500">Input: </span>
                            <span className="text-gray-300">{tc.input || '(empty)'}</span>
                          </div>
                          <div className="bg-gray-800 rounded p-2">
                            <span className="text-gray-500">Output: </span>
                            <span className="text-green-400">{tc.expected_output}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.hidden_test_cases?.length > 0 && (
                    <div>
                      <p className="text-xs text-yellow-400 font-medium mb-2 flex items-center gap-1">
                        <EyeOff size={11} /> Hidden Test Cases (evaluated on submit)
                      </p>
                      {q.hidden_test_cases.map((tc, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2 mb-1.5 font-mono text-xs">
                          <div className="bg-gray-800 rounded p-2">
                            <span className="text-gray-500">Input: </span>
                            <span className="text-gray-300">{tc.input || '(empty)'}</span>
                          </div>
                          <div className="bg-gray-800 rounded p-2">
                            <span className="text-gray-500">Output: </span>
                            <span className="text-yellow-400">{tc.expected_output}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {!questions.length && (
            <div className="text-center py-12 text-gray-500">
              <Terminal size={32} className="mx-auto mb-3 opacity-30" />
              <p>No coding questions yet.</p>
              <button onClick={openAdd} className="mt-3 text-violet-400 hover:text-violet-300 text-sm">
                + Add first question
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 text-sm">Select a job to manage coding questions</div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">{editQ ? 'Edit Coding Question' : 'Add Coding Question'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-5">
              {/* Input format note */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2.5 text-xs text-yellow-300">
                <strong>Input format:</strong> Each value on a separate line. For two numbers enter:
                <code className="block mt-1 font-mono bg-black/20 px-2 py-1 rounded">1{"\n"}2</code>
                For space-separated on one line: <code className="font-mono">1 2</code> — use <code className="font-mono">input().split()</code> in code.
              </div>
              {/* Question */}
              <div>
                <label className="text-sm text-gray-300 block mb-1.5">Problem Statement *</label>
                <textarea rows={5} value={form.question_text}
                  onChange={e => setForm({ ...form, question_text: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
                  placeholder="Write the full problem description, constraints, and examples..." />
              </div>

              {/* Marks */}
              <div>
                <label className="text-sm text-gray-300 block mb-1.5">Marks</label>
                <input type="number" min={1} value={form.marks}
                  onChange={e => setForm({ ...form, marks: Number(e.target.value) })}
                  className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
              </div>

              {/* Visible test cases */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-green-400 flex items-center gap-1.5">
                    <Eye size={14} /> Visible Test Cases
                    <span className="text-gray-500 font-normal text-xs">(shown to candidate)</span>
                  </label>
                  <button onClick={() => addTC('visible')}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                    <Plus size={11} /> Add
                  </button>
                </div>
                {form.visible_test_cases.map((tc, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Input</p>
                      <textarea rows={2} value={tc.input}
                        onChange={e => updateTC('visible', i, 'input', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-violet-500 resize-none"
                        placeholder={"e.g. for two inputs:\n1\n2"} />
                    </div>
                    <div className="relative">
                      <p className="text-xs text-gray-500 mb-1">Expected Output</p>
                      <textarea rows={2} value={tc.expected_output}
                        onChange={e => updateTC('visible', i, 'expected_output', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-violet-500 resize-none"
                        placeholder="expected stdout" />
                      {form.visible_test_cases.length > 1 && (
                        <button onClick={() => removeTC('visible', i)}
                          className="absolute -top-1 -right-1 text-gray-500 hover:text-red-400">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hidden test cases */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-yellow-400 flex items-center gap-1.5">
                    <EyeOff size={14} /> Hidden Test Cases
                    <span className="text-gray-500 font-normal text-xs">(only pass/fail shown to candidate)</span>
                  </label>
                  <button onClick={() => addTC('hidden')}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                    <Plus size={11} /> Add
                  </button>
                </div>
                {form.hidden_test_cases.map((tc, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Input</p>
                      <textarea rows={2} value={tc.input}
                        onChange={e => updateTC('hidden', i, 'input', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-violet-500 resize-none"
                        placeholder={"e.g. for two inputs:\n1\n2"} />
                    </div>
                    <div className="relative">
                      <p className="text-xs text-gray-500 mb-1">Expected Output</p>
                      <textarea rows={2} value={tc.expected_output}
                        onChange={e => updateTC('hidden', i, 'expected_output', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-violet-500 resize-none"
                        placeholder="expected stdout" />
                      {form.hidden_test_cases.length > 1 && (
                        <button onClick={() => removeTC('hidden', i)}
                          className="absolute -top-1 -right-1 text-gray-500 hover:text-red-400">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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

export default CodingQuestionManager;
