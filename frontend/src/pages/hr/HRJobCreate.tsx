import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/shared/Layout'
import { jobsApi } from '../../api'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'

export default function HRJobCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', required_skills: [] as string[],
    experience_years: '', qualification: '', salary_range: '',
    resume_cutoff: 60, aptitude_cutoff: 60, sql_cutoff: 60, coding_cutoff: 60,
  })

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !form.required_skills.includes(s)) {
      setForm({ ...form, required_skills: [...form.required_skills, s] })
    }
    setSkillInput('')
  }

  const removeSkill = (s: string) => setForm({ ...form, required_skills: form.required_skills.filter(x => x !== s) })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description) { toast.error('Title and description are required'); return }
    setLoading(true)
    try {
      await jobsApi.create(form)
      toast.success('Job created successfully!')
      navigate('/hr/jobs')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create job')
    } finally { setLoading(false) }
  }

  return (
    <Layout>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-2">Create Job Opening</h1>
        <p className="text-gray-500 mb-8">Define the role requirements and assessment thresholds</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-semibold text-white">Basic Information</h2>
            <div>
              <label className="label">Job Title *</label>
              <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Senior Full Stack Developer" required />
            </div>
            <div>
              <label className="label">Job Description *</label>
              <textarea className="input min-h-32 resize-y" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the role, responsibilities, and requirements..." required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Experience Required</label>
                <input className="input" value={form.experience_years} onChange={e => setForm({...form, experience_years: e.target.value})} placeholder="e.g. 2-4 years" />
              </div>
              <div>
                <label className="label">Qualification</label>
                <input className="input" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} placeholder="e.g. B.Tech CS" />
              </div>
              <div>
                <label className="label">Salary Range</label>
                <input className="input" value={form.salary_range} onChange={e => setForm({...form, salary_range: e.target.value})} placeholder="e.g. 8-12 LPA" />
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold text-white">Required Skills</h2>
            <div className="flex gap-2">
              <input className="input" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="e.g. React, Python, SQL..." />
              <button type="button" onClick={addSkill} className="btn-secondary flex items-center gap-1"><Plus size={14} /> Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.required_skills.map(s => (
                <span key={s} className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)}><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-white mb-4">Assessment Cutoffs (%)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Resume Match', key: 'resume_cutoff' },
                { label: 'Aptitude', key: 'aptitude_cutoff' },
                { label: 'SQL', key: 'sql_cutoff' },
                { label: 'Coding', key: 'coding_cutoff' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="number" min="0" max="100" className="input" value={(form as any)[key]}
                    onChange={e => setForm({...form, [key]: Number(e.target.value)})} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Job Opening'}</button>
            <button type="button" onClick={() => navigate('/hr/jobs')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
