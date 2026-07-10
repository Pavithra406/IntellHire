import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Camera, Mic, Monitor, Play, Send, ChevronDown } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';

type Stage = 'list' | 'proctor_check' | 'in_progress' | 'completed';

const LANG_TEMPLATES: Record<string, string> = {
  python: `# Write your solution here\n\ndef solution():\n    pass\n\nsolution()\n`,
  java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`,
};

const Assessments: React.FC = () => {
  const [candidateStatus, setCandidateStatus] = useState('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [stage, setStage] = useState<Stage>('list');
  const [pendingType, setPendingType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [language, setLanguage] = useState('python');
  const [permsGranted, setPermsGranted] = useState(false);
  const [runResults, setRunResults] = useState<Record<number, any>>({});
  const [running, setRunning] = useState<Record<number, boolean>>({});
  const [stdin, setStdin] = useState<Record<number, string>>({});
  const timerRef = useRef<any>(null);

  const loadData = () => {
    Promise.all([api.get('/candidates/me'), api.get('/assessment/my')])
      .then(([cr, ar]) => { setCandidateStatus(cr.data.status); setAssessments(ar.data); });
  };

  useEffect(() => { loadData(); }, []);

  // Proctoring violation logging
  useEffect(() => {
    if (stage !== 'in_progress') return;
    const onVisibility = () => {
      if (document.hidden) api.post('/proctoring/violation', {
        session_type: pendingType, violation_type: 'tab_switch', description: 'Tab switched during assessment'
      }).catch(() => {});
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) api.post('/proctoring/violation', {
        session_type: pendingType, violation_type: 'fullscreen_exit', description: 'Exited fullscreen'
      }).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [stage, pendingType]);

  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      await navigator.mediaDevices.getDisplayMedia({ video: true });
      setPermsGranted(true);
      toast.success('Permissions granted');
    } catch {
      toast.error('Camera, microphone and screen share are required');
    }
  };

  const startAssessment = async (type: string) => {
    setLoading(true);
    try {
      const res = await api.post(`/assessment/start/${type}`);
      setCurrentAssessment(res.data);
      setAnswers({});
      setRunResults({});
      setStdin({});
      setStage('in_progress');
      const duration = type === 'coding' ? 5400 : 3600;
      setTimeLeft(duration);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCode = async (questionId: number) => {
    const code = answers[questionId] || '';
    if (!code.trim()) return toast.error('Write some code first');
    setRunning(r => ({ ...r, [questionId]: true }));
    try {
      const res = await api.post('/code/run', {
        code, language, stdin: stdin[questionId] || ''
      });
      setRunResults(r => ({ ...r, [questionId]: { type: 'run', ...res.data } }));
    } catch (err: any) {
      toast.error('Run failed');
    } finally {
      setRunning(r => ({ ...r, [questionId]: false }));
    }
  };

  const handleRunTests = async (questionId: number, testCases: any[]) => {
    const code = answers[questionId] || '';
    if (!code.trim()) return toast.error('Write some code first');
    const visible = testCases.filter(tc => !tc.is_hidden);
    if (!visible.length) return toast.error('No visible test cases for this question');
    setRunning(r => ({ ...r, [questionId]: true }));
    try {
      const res = await api.post('/code/run-tests', { code, language, test_cases: visible });
      setRunResults(r => ({ ...r, [questionId]: { type: 'tests', ...res.data } }));
    } catch {
      toast.error('Test run failed');
    } finally {
      setRunning(r => ({ ...r, [questionId]: false }));
    }
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    setLoading(true);
    try {
      const answersArr = (currentAssessment.questions || []).map((q: any) => ({
        question_id: q.id,
        answer: answers[q.id] || '',
        language: q.question_type === 'coding' ? language : undefined
      }));
      const res = await api.post(`/assessment/submit/${currentAssessment.assessment_id}`,
        { answers: answersArr });
      setResult(res.data);
      setStage('completed');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const typeConfig: Record<string, { label: string; status: string }> = {
    aptitude: { label: 'Aptitude Test', status: 'aptitude_pending' },
    sql: { label: 'SQL Assessment', status: 'sql_pending' },
    coding: { label: 'Coding Round', status: 'coding_pending' },
  };

  // ── Proctoring check screen ──
  if (stage === 'proctor_check') return (
    <div className="max-w-lg mx-auto space-y-6 py-10">
      <h2 className="text-xl font-bold text-white text-center">Proctoring Setup</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <p className="text-gray-400 text-sm text-center">Grant all permissions before starting.</p>
        {[{ icon: Camera, label: 'Camera' }, { icon: Mic, label: 'Microphone' }, { icon: Monitor, label: 'Screen Share' }]
          .map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <Icon size={16} className="text-violet-400" />
              <span className="text-gray-300 text-sm flex-1">{label}</span>
              {permsGranted ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-yellow-400" />}
            </div>
          ))}
        <button onClick={requestPermissions} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-medium">
          Grant Permissions
        </button>
        {permsGranted && (
          <button onClick={() => startAssessment(pendingType)} className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium">
            Start Assessment
          </button>
        )}
        <button onClick={() => setStage('list')} className="w-full bg-gray-700 text-white py-2 rounded-lg text-sm">Cancel</button>
      </div>
    </div>
  );

  // ── Result screen ──
  if (stage === 'completed' && result) return (
    <div className="max-w-lg mx-auto space-y-6 py-10">
      <div className="text-center">
        {result.status === 'passed' ? <CheckCircle size={52} className="text-green-400 mx-auto mb-3" /> : <XCircle size={52} className="text-red-400 mx-auto mb-3" />}
        <h2 className="text-2xl font-bold text-white">{result.status === 'passed' ? 'Passed!' : 'Not Passed'}</h2>
        <p className="text-gray-400 mt-1">Score: {result.percentage?.toFixed(1)}% · Cutoff: {result.cutoff}%</p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
        <div className="flex justify-between"><span className="text-gray-400">Marks</span><span className="text-white font-bold">{result.score}/{result.total}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Percentage</span><span className="text-white font-bold">{result.percentage?.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Required</span><span className="text-gray-300">{result.cutoff}%</span></div>
      </div>
      <button onClick={() => { setStage('list'); setResult(null); loadData(); }}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg font-medium">
        Back
      </button>
    </div>
  );

  // ── In-progress assessment ──
  if (stage === 'in_progress' && currentAssessment) {
    const isCoding = currentAssessment.assessment_type === 'coding';

    return (
      <div className="space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 sticky top-0 z-10">
          <h2 className="text-white font-semibold capitalize">{currentAssessment.assessment_type} Assessment</h2>
          <div className="flex items-center gap-3">
            {isCoding && (
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300">
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
              </select>
            )}
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Clock size={15} />
              <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
              <Send size={13} /> {loading ? 'Submitting...' : 'Submit All'}
            </button>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {currentAssessment.questions?.map((q: any, idx: number) => (
            <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Question header */}
              <div className="px-5 py-4 border-b border-gray-800">
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 text-sm flex-shrink-0 mt-0.5">Q{idx + 1}.</span>
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded capitalize">{q.question_type?.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-500">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="p-5">
                {/* MCQ */}
                {q.question_type === 'mcq' && (
                  <div className="space-y-2">
                    {q.options?.map((opt: any) => (
                      <label key={opt.label} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                        answers[q.id] === opt.label
                          ? 'bg-violet-500/20 border border-violet-500'
                          : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                      }`}>
                        <input type="radio" name={`q_${q.id}`} value={opt.label}
                          checked={answers[q.id] === opt.label}
                          onChange={() => setAnswers(a => ({ ...a, [q.id]: opt.label }))}
                          className="text-violet-500 flex-shrink-0" />
                        <span className="text-gray-300 text-sm"><strong className="text-white">{opt.label}.</strong> {opt.text}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* SQL Write */}
                {q.question_type === 'sql_write' && (
                  <textarea rows={6} value={answers[q.id] || ''}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Write your SQL query here..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500 resize-none" />
                )}

                {/* Coding */}
                {q.question_type === 'coding' && (
                  <div className="space-y-3">
                    {/* Visible test cases */}
                    {q.options?.filter((tc: any) => !tc.is_hidden)?.length > 0 && (
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Visible Test Cases</p>
                        <div className="space-y-2">
                          {q.options.filter((tc: any) => !tc.is_hidden).map((tc: any, i: number) => (
                            <div key={i} className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <div className="bg-gray-900 rounded p-2">
                                <p className="text-gray-500 mb-1">Input:</p>
                                <p className="text-gray-300">{tc.input || '(empty)'}</p>
                              </div>
                              <div className="bg-gray-900 rounded p-2">
                                <p className="text-gray-500 mb-1">Expected:</p>
                                <p className="text-green-400">{tc.expected_output}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Code editor */}
                    <div className="rounded-lg overflow-hidden border border-gray-700" style={{ height: 320 }}>
                      <Editor
                        language={language === 'c' ? 'c' : language}
                        theme="vs-dark"
                        value={answers[q.id] || LANG_TEMPLATES[language]}
                        onChange={val => setAnswers(a => ({ ...a, [q.id]: val || '' }))}
                        options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                      />
                    </div>

                    {/* Custom stdin */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Custom Input (stdin):</p>
                      <textarea rows={2} value={stdin[q.id] || ''}
                        onChange={e => setStdin(s => ({ ...s, [q.id]: e.target.value }))}
                        placeholder="Enter input to test manually..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-violet-500 resize-none" />
                    </div>

                    {/* Run buttons */}
                    <div className="flex gap-2">
                      <button onClick={() => handleRunCode(q.id)} disabled={running[q.id]}
                        className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        <Play size={13} /> {running[q.id] ? 'Running...' : 'Run Code'}
                      </button>
                      {q.options?.some((tc: any) => !tc.is_hidden) && (
                        <button onClick={() => handleRunTests(q.id, q.options)} disabled={running[q.id]}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                          <CheckCircle size={13} /> Run Test Cases
                        </button>
                      )}
                    </div>

                    {/* Run output */}
                    {runResults[q.id] && (
                      <div className="bg-gray-800 rounded-lg p-4 text-sm font-mono">
                        {runResults[q.id].type === 'run' ? (
                          <>
                            <p className="text-gray-400 text-xs mb-1">Output:</p>
                            <p className={runResults[q.id].stderr ? 'text-red-400' : 'text-green-300'}>
                              {runResults[q.id].stderr || runResults[q.id].stdout || '(no output)'}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-gray-400 text-xs mb-2">
                              Test Results: {runResults[q.id].passed}/{runResults[q.id].total} passed
                            </p>
                            <div className="space-y-1">
                              {runResults[q.id].results?.map((r: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded ${r.passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {r.passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                  <span>Test {r.test_case}</span>
                                  {!r.passed && r.actual !== 'Failed' && (
                                    <span className="text-gray-500 ml-auto">got: {r.actual || 'error'}</span>
                                  )}
                                  {r.stderr && <span className="text-red-400 ml-1">{r.stderr}</span>}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Assessment list ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Assessments</h1>
        <p className="text-gray-400 text-sm mt-1">Complete all rounds to proceed to the interview</p>
      </div>
      <div className="space-y-4">
        {Object.entries(typeConfig).map(([type, cfg]) => {
          const done = assessments.find(a => a.type === type && ['completed', 'passed', 'failed'].includes(a.status));
          const isActive = candidateStatus === cfg.status;
          return (
            <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">{cfg.label}</h3>
                  {done
                    ? <p className="text-gray-400 text-sm mt-0.5">Score: {done.percentage?.toFixed(1)}%</p>
                    : <p className="text-gray-500 text-sm mt-0.5">{isActive ? 'Ready to start' : 'Not yet available'}</p>}
                  {type === 'coding' && isActive && (
                    <p className="text-gray-500 text-xs mt-1">Supported: Python · Java · C</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {done && <StatusBadge status={done.status} />}
                  {isActive && !done && (
                    <button onClick={() => { setPendingType(type); setStage('proctor_check'); }}
                      className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      Start
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Assessments;
