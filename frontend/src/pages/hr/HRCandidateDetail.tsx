import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/shared/Layout'
import { candidatesApi, resumeApi } from '../../api'
import { CandidateDetail } from '../../types'
import StatusBadge from '../../components/ui/StatusBadge'
import ScoreBar from '../../components/ui/ScoreBar'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { Download, AlertTriangle, CheckCircle, XCircle, Star, UserCheck } from 'lucide-react'

const ACTION_BUTTONS = [
  { action: 'shortlisted', label: 'Shortlist', cls: 'btn-secondary', icon: Star },
  { action: 'rejected', label: 'Reject', cls: 'btn-danger', icon: XCircle },
  { action: 'hired', label: 'Hire', cls: 'btn-success', icon: UserCheck },
]

export default function HRCandidateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [tab, setTab] = useState<'overview'|'resume'|'assessments'|'interview'|'violations'>('overview')

  const load = () => {
    setLoading(true)
    candidatesApi.get(Number(id)).then(r => { setCandidate(r.data); setNotes(r.data.hr_notes || '') }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      await candidatesApi.updateStatus(Number(id), { status: action, hr_notes: notes })
      toast.success(`Candidate ${action}`)
      load()
    } catch { toast.error('Action failed') } finally { setActionLoading(false) }
  }

  const handleRanking = async () => {
    setActionLoading(true)
    try {
      await candidatesApi.computeRanking(Number(id))
      toast.success('Ranking computed!')
      load()
    } catch { toast.error('Ranking failed') } finally { setActionLoading(false) }
  }

  const downloadResume = async () => {
    try {
      const res = await resumeApi.download(Number(id))
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = candidate?.resume?.file_name || 'resume'
      a.click(); URL.revokeObjectURL(url)
    } catch { toast.error('Download failed') }
  }

  if (loading) return <Layout><div className="flex justify-center py-20"><Spinner /></div></Layout>
  if (!candidate) return <Layout><p className="text-red-400">Candidate not found</p></Layout>

  const tabs = ['overview', 'resume', 'assessments', 'interview', 'violations']

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{candidate.full_name}</h1>
            <StatusBadge status={candidate.status} />
            {candidate.rank && <span className="badge-blue">Rank #{candidate.rank}</span>}
          </div>
          <p className="text-gray-500">{candidate.email} · {candidate.job_title}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleRanking} disabled={actionLoading} className="btn-secondary text-sm">
            Compute Ranking
          </button>
          {ACTION_BUTTONS.map(({ action, label, cls, icon: Icon }) => (
            <button key={action} onClick={() => handleAction(action)} disabled={actionLoading}
              className={`${cls} text-sm flex items-center gap-1`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* HR Notes */}
      <div className="card mb-6">
        <label className="label">HR Notes</label>
        <div className="flex gap-2">
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this candidate..." />
          <button onClick={() => handleAction(candidate.status)} disabled={actionLoading} className="btn-secondary">Save</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-6 gap-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-2 text-sm capitalize rounded-t-lg transition-colors ${tab === t ? 'bg-gray-900 text-white border-t border-x border-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>
            {t}
            {t === 'violations' && candidate.violations?.total > 0 && (
              <span className="ml-1 badge-red">{candidate.violations.total}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Score Overview</h3>
            <ScoreBar label="Resume Match" value={candidate.resume?.match_percentage || 0} />
            {candidate.assessments.map(a => (
              <ScoreBar key={a.id} label={`${a.type.toUpperCase()} Assessment`} value={a.percentage || 0} />
            ))}
            <ScoreBar label="Interview Score" value={candidate.interview?.overall_score || 0} />
            <ScoreBar label="Overall Score" value={candidate.overall_score || 0} />
          </div>
          <div className="card">
            <h3 className="font-semibold text-white mb-4">AI Recommendation</h3>
            {candidate.ranking?.ai_recommendation ? (
              <div className="space-y-3">
                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  candidate.ranking.ai_recommendation.recommendation?.includes('hire') ? 'bg-green-500/10 text-green-400' :
                  candidate.ranking.ai_recommendation.recommendation === 'reject' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {candidate.ranking.ai_recommendation.recommendation?.toUpperCase().replace('_', ' ')}
                </div>
                <p className="text-gray-400 text-sm">{candidate.ranking.ai_recommendation.reason}</p>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Strengths</p>
                  {candidate.ranking.ai_recommendation.strengths?.map(s => <p key={s} className="text-sm text-green-400">✓ {s}</p>)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Concerns</p>
                  {candidate.ranking.ai_recommendation.concerns?.map(c => <p key={c} className="text-sm text-red-400">✗ {c}</p>)}
                </div>
              </div>
            ) : <p className="text-gray-500 text-sm">Compute ranking to see AI recommendation</p>}
          </div>
        </div>
      )}

      {tab === 'resume' && candidate.resume && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-white">Resume Analysis</h3>
              <button onClick={downloadResume} className="btn-secondary text-xs flex items-center gap-1">
                <Download size={12} /> Download
              </button>
            </div>
            <ScoreBar label="Match Percentage" value={candidate.resume.match_percentage || 0} />
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-2">Skills</p>
                <div className="flex flex-wrap gap-1">{candidate.resume.extracted_skills?.map(s => <span key={s} className="badge-blue">{s}</span>)}</div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Missing Skills</p>
                <div className="flex flex-wrap gap-1">{candidate.resume.missing_skills?.map(s => <span key={s} className="badge-red">{s}</span>)}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Screening Result</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Strengths</p>
                {candidate.resume.strengths?.map(s => <p key={s} className="text-sm text-green-400">✓ {s}</p>)}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Weaknesses</p>
                {candidate.resume.weaknesses?.map(w => <p key={w} className="text-sm text-red-400">✗ {w}</p>)}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Recommendations</p>
                <p className="text-sm text-gray-400">{candidate.resume.recommendations}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'assessments' && (
        <div className="grid gap-4">
          {candidate.assessments.length === 0 ? (
            <p className="text-gray-500">No assessments completed</p>
          ) : candidate.assessments.map(a => (
            <div key={a.id} className="card">
              <div className="flex justify-between mb-3">
                <h3 className="font-semibold text-white capitalize">{a.type} Assessment</h3>
                <StatusBadge status={a.status} />
              </div>
              <ScoreBar label="Score" value={a.percentage || 0} />
              <p className="text-xs text-gray-500">{a.score?.toFixed(1)} / {a.total_marks?.toFixed(1)} marks</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'interview' && (
        <div className="space-y-6">
          {!candidate.interview ? (
            <p className="text-gray-500">Interview not started</p>
          ) : (
            <>
              <div className="card">
                <h3 className="font-semibold text-white mb-4">Interview Scores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {[
                    ['Overall', candidate.interview.overall_score],
                    ['Technical', candidate.interview.technical_score],
                    ['Communication', candidate.interview.communication_score],
                    ['Confidence', candidate.interview.confidence_score],
                    ['Grammar', candidate.interview.grammar_score],
                    ['Problem Solving', candidate.interview.problem_solving_score],
                  ].map(([label, val]) => (
                    <ScoreBar key={label as string} label={label as string} value={(val as number) || 0} />
                  ))}
                </div>
              </div>
              {candidate.interview.ai_feedback && (
                <div className="card">
                  <h3 className="font-semibold text-white mb-2">AI Feedback</h3>
                  <p className="text-gray-400 text-sm">{candidate.interview.ai_feedback}</p>
                </div>
              )}
              {candidate.interview.transcript?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-white mb-4">Interview Transcript</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {candidate.interview.transcript.map((t: any, i: number) => (
                      <div key={i} className="border-l-2 border-gray-700 pl-4">
                        <p className="text-blue-400 text-sm font-medium mb-1">Q: {t.question}</p>
                        <p className="text-gray-400 text-sm">A: {t.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'violations' && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            Proctoring Violations ({candidate.violations?.total || 0})
          </h3>
          <p className="text-yellow-400 text-sm mb-4">HR review required — violations do NOT automatically disqualify candidates.</p>
          {candidate.violations?.violations?.length === 0 ? (
            <p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle size={14} /> No violations recorded</p>
          ) : (
            <div className="space-y-2">
              {candidate.violations?.violations?.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <div>
                    <span className="badge-yellow mr-2">{v.violation_type.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500 text-xs">{v.session_type}</span>
                    {v.description && <p className="text-gray-500 text-xs mt-0.5">{v.description}</p>}
                  </div>
                  <span className="text-gray-600 text-xs">{new Date(v.occurred_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
