import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, FileText, BarChart2, Shield, Trophy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';

const CandidateDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const [interview, setInterview] = useState<any>(null);
  const [violations, setViolations] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const load = async () => {
    try {
      const [cr, ir, vr] = await Promise.all([
        api.get(`/candidates/${id}`),
        api.get(`/interview/detail/${id}`).catch(() => ({ data: null })),
        api.get(`/proctoring/violations/${id}`).catch(() => ({ data: null })),
      ]);
      setCandidate(cr.data);
      setNotes(cr.data?.hr_notes || '');
      setInterview(ir.data);
      setViolations(vr.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load candidate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      await api.patch(`/candidates/${id}/status`, { status: action, hr_notes: notes });
      toast.success(`Candidate status updated`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComputeRanking = async () => {
    setActionLoading('ranking');
    try {
      await api.post(`/ranking/compute/${id}`);
      toast.success('Ranking computed');
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to compute ranking');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>;
  if (!candidate) return <div className="text-center py-20 text-gray-400">Candidate not found</div>;

  const radarData = interview ? [
    { subject: 'Technical', score: interview.technical_score || 0 },
    { subject: 'Communication', score: interview.communication_score || 0 },
    { subject: 'Confidence', score: interview.confidence_score || 0 },
    { subject: 'Grammar', score: interview.grammar_score || 0 },
    { subject: 'Problem Solving', score: interview.problem_solving_score || 0 },
    { subject: 'Keywords', score: interview.keyword_coverage_score || 0 },
  ] : [];

  const tabs = ['overview', 'resume', 'assessments', 'interview', 'violations', 'ranking'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hr/candidates')} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{candidate.full_name}</h1>
          <p className="text-gray-400 text-sm">{candidate.email} · {candidate.job_title}</p>
        </div>
        <StatusBadge status={candidate.status} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition whitespace-nowrap ${activeTab === tab ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Score breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Score Overview</h3>
              <div className="space-y-3">
                {[
                  { label: 'Resume Match', value: candidate.resume?.match_percentage, color: 'bg-blue-500' },
                  { label: 'Aptitude', value: candidate.assessments?.find((a: any) => a.type === 'aptitude')?.percentage, color: 'bg-yellow-500' },
                  { label: 'SQL', value: candidate.assessments?.find((a: any) => a.type === 'sql')?.percentage, color: 'bg-green-500' },
                  { label: 'Coding', value: candidate.assessments?.find((a: any) => a.type === 'coding')?.percentage, color: 'bg-orange-500' },
                  { label: 'Interview', value: interview?.overall_score, color: 'bg-violet-500' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-white font-medium">{item.value != null ? `${item.value.toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className={`${item.color} h-1.5 rounded-full transition-all`}
                        style={{ width: `${item.value || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HR Actions */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">HR Actions</h3>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Add notes (optional)..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-violet-500 resize-none" />
              <div className="flex flex-wrap gap-2">
                {[
                  { action: 'shortlisted', label: 'Shortlist', cls: 'bg-green-600 hover:bg-green-700' },
                  { action: 'hired', label: 'Hire', cls: 'bg-blue-600 hover:bg-blue-700' },
                  { action: 'rejected', label: 'Reject', cls: 'bg-red-600 hover:bg-red-700' },
                  { action: 'interview_pending', label: 'Schedule Interview', cls: 'bg-purple-600 hover:bg-purple-700' },
                ].map(btn => (
                  <button key={btn.action} type="button" onClick={() => handleAction(btn.action)} disabled={!!actionLoading}
                    className={`${btn.cls} text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50`}>
                    {actionLoading === btn.action ? 'Saving...' : btn.label}
                  </button>
                ))}
                <button type="button" onClick={handleComputeRanking} disabled={!!actionLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                  {actionLoading === 'ranking' ? 'Computing...' : 'Compute Ranking'}
                </button>
              </div>
            </div>
          </div>

          {/* Radar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Interview Performance</h3>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Interview not completed</div>
            )}
            {candidate.ranking && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Overall Score</span>
                  <span className="text-white font-bold">{candidate.ranking.overall_score?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400 text-sm">Rank</span>
                  <span className="text-violet-400 font-bold">#{candidate.ranking.rank}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resume Tab */}
      {activeTab === 'resume' && candidate.resume && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Resume Analysis</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className={`text-3xl font-bold ${(candidate.resume.match_percentage || 0) >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                {candidate.resume.match_percentage?.toFixed(0)}%
              </div>
              <div>
                <p className="text-white text-sm font-medium">Match Score</p>
                <StatusBadge status={candidate.resume.screening_status} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Missing Skills</p>
                <div className="flex flex-wrap gap-1">
                  {candidate.resume.missing_skills?.map((s: string) => (
                    <span key={s} className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">{s}</span>
                  ))}
                  {!candidate.resume.missing_skills?.length && <span className="text-gray-500 text-xs">None</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Strengths</p>
                {candidate.resume.strengths?.map((s: string, i: number) => (
                  <p key={i} className="text-sm text-green-400 flex items-start gap-1.5 mb-1">
                    <CheckCircle size={12} className="mt-0.5 flex-shrink-0" /> {s}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Extracted Skills</h3>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {candidate.resume.extracted_skills?.map((s: string) => (
                <span key={s} className="text-xs bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Recommendations</p>
              <p className="text-sm text-gray-300 leading-relaxed">{candidate.resume.recommendations || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Assessments Tab */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          {['aptitude', 'sql', 'coding'].map(type => {
            const a = candidate.assessments?.find((a: any) => a.type === type);
            return (
              <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium capitalize">{type} Assessment</h3>
                    {a ? <p className="text-gray-400 text-sm mt-0.5">Score: {a.percentage?.toFixed(1)}%</p>
                      : <p className="text-gray-500 text-sm mt-0.5">Not attempted</p>}
                  </div>
                  {a ? <StatusBadge status={a.status} /> : <StatusBadge status="pending" />}
                </div>
                {a && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className={`h-2 rounded-full ${a.status === 'passed' ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${a.percentage || 0}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Interview Tab */}
      {activeTab === 'interview' && (
        <div className="space-y-4">
          {interview ? (
            <>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">AI Feedback</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{interview.ai_feedback || 'N/A'}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Interview Transcript</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {interview.answers?.map((a: any, i: number) => (
                    <div key={i} className="border-l-2 border-gray-700 pl-4">
                      <p className="text-sm text-violet-300 font-medium mb-1">Q: {a.question}</p>
                      <p className="text-sm text-gray-300">A: {a.answer || 'No answer'}</p>
                      {a.score != null && <p className="text-xs text-gray-500 mt-1">Score: {(a.score * 10).toFixed(0)}/100</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-500">Interview not yet completed</div>
          )}
        </div>
      )}

      {/* Violations Tab */}
      {activeTab === 'violations' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Proctoring Violations ({violations?.total_violations || 0})
          </h3>
          {violations?.violations?.length ? (
            <div className="space-y-3">
              {violations.violations.map((v: any) => (
                <div key={v.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                  <Shield size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{v.violation_type.replace('_', ' ')}</p>
                    <p className="text-gray-400 text-xs">{v.session_type} · {new Date(v.occurred_at).toLocaleString()}</p>
                    {v.description && <p className="text-gray-500 text-xs mt-0.5">{v.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">No violations recorded</p>
          )}
        </div>
      )}

      {/* Ranking Tab */}
      {activeTab === 'ranking' && (
        <div className="space-y-4">
          {candidate.ranking ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(candidate.ranking.score_breakdown || {}).map(([k, v]) => (
                  <div key={k} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-xs capitalize">{k.replace('_', ' ')}</p>
                    <p className="text-2xl font-bold text-white mt-1">{(v as number).toFixed(1)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">AI Recommendation</h3>
                <p className="text-sm font-medium text-violet-300 capitalize mb-1">
                  {candidate.ranking.ai_recommendation?.recommendation?.replace('_', ' ')}
                </p>
                <p className="text-gray-300 text-sm">{candidate.ranking.ai_recommendation?.reason}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">Ranking not computed yet</p>
              <button type="button" onClick={handleComputeRanking} disabled={!!actionLoading}
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {actionLoading === 'ranking' ? 'Computing...' : 'Compute Now'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;
