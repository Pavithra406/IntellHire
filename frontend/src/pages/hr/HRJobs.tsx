import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/shared/Layout'
import { jobsApi } from '../../api'
import { Job } from '../../types'
import { Plus, Briefcase, Settings } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge'
import Spinner from '../../components/ui/Spinner'

export default function HRJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobsApi.list().then(r => setJobs(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Openings</h1>
          <p className="text-gray-500 mt-1">{jobs.length} position{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/hr/jobs/create" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Job
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No job openings yet</p>
          <p className="text-gray-600 text-sm mt-1">Create your first job to get started</p>
          <Link to="/hr/jobs/create" className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus size={16} /> Create Job
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map(job => (
            <div key={job.id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-white">{job.title}</h2>
                    <span className={job.is_active ? 'badge-green' : 'badge-gray'}>
                      {job.is_active ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{job.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(job.required_skills || []).slice(0, 6).map(s => (
                      <span key={s} className="badge-blue">{s}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500">
                    <span>Resume cutoff: <strong className="text-gray-300">{job.resume_cutoff}%</strong></span>
                    <span>Aptitude: <strong className="text-gray-300">{job.aptitude_cutoff}%</strong></span>
                    <span>SQL: <strong className="text-gray-300">{job.sql_cutoff}%</strong></span>
                    <span>Coding: <strong className="text-gray-300">{job.coding_cutoff}%</strong></span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link to={`/hr/jobs/${job.id}/questions`} className="btn-secondary text-xs flex items-center gap-1">
                    <Settings size={12} /> Questions
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
