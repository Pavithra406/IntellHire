import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/shared/Layout'
import { authApi, jobsApi } from '../../api'
import { Job } from '../../types'
import toast from 'react-hot-toast'

export default function HRCreateCandidate() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '', job_id: '' })

  useEffect(() => { jobsApi.list().then(r => setJobs(r.data.filter((j: Job) => j.is_active))) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.job_id) { toast.error('Please select a job'); return }
    setLoading(true)
    try {
      const res = await authApi.createCandidate({ ...form, job_id: Number(form.job_id) })
      toast.success('Candidate account created!')
      toast.success(`Credentials: ${res.data.credentials.email} / ${res.data.credentials.password}`, { duration: 8000 })
      navigate('/hr/candidates')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create candidate')
    } finally { setLoading(false) }
  }

  return (
    <Layout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Add Candidate</h1>
        <p className="text-gray-500 mb-8">Create a candidate account and assign to a job</p>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Candidate's full name" required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="candidate@email.com" required />
          </div>
          <div>
            <label className="label">Temporary Password *</label>
            <input type="text" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Set a temporary password" required minLength={8} />
          </div>
          <div>
            <label className="label">Assign to Job *</label>
            <select className="input" value={form.job_id} onChange={e => setForm({...form, job_id: e.target.value})} required>
              <option value="">Select a job opening...</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-yellow-400 text-sm">The credentials will be shown after creation. Share them with the candidate.</p>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Candidate'}</button>
            <button type="button" onClick={() => navigate('/hr/candidates')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
