import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/shared/Layout'
import { candidatesApi } from '../../api'
import StatusBadge from '../../components/ui/StatusBadge'
import Spinner from '../../components/ui/Spinner'
import { Search, UserPlus, ChevronRight } from 'lucide-react'

export default function HRCandidates() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    candidatesApi.list().then(r => { setCandidates(r.data); setFiltered(r.data) }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let data = candidates
    if (search) data = data.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== 'all') data = data.filter(c => c.status === statusFilter)
    setFiltered(data)
  }, [search, statusFilter, candidates])

  const statuses = ['all', ...Array.from(new Set(candidates.map(c => c.status)))]

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidates</h1>
          <p className="text-gray-500 mt-1">{filtered.length} of {candidates.length} candidates</p>
        </div>
        <Link to="/hr/candidates/create" className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Add Candidate
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-8" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Name', 'Email', 'Job', 'Status', 'Score', 'Rank', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <span className="text-blue-400 text-xs font-bold">{c.full_name?.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-white text-sm">{c.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{c.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{c.job_title}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-sm text-white">{c.overall_score ? `${c.overall_score.toFixed(1)}%` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-white">{c.rank ? `#${c.rank}` : '—'}</td>
                  <td className="px-4 py-3">
                    <Link to={`/hr/candidates/${c.id}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm">
                      View <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No candidates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
