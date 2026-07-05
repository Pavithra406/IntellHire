import { useEffect, useState } from 'react'
import Layout from '../../components/shared/Layout'
import { companyApi } from '../../api'
import toast from 'react-hot-toast'
import { Building2 } from 'lucide-react'

export default function HRCompanyProfile() {
  const [form, setForm] = useState({ company_name: '', industry: '', website: '', description: '', location: '' })
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    companyApi.getMe().then(r => { setForm(r.data); setExists(true) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (exists) await companyApi.update(form)
      else await companyApi.create(form)
      toast.success('Company profile saved!')
      setExists(true)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Building2 size={24} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Company Profile</h1>
            <p className="text-gray-500 text-sm">Set up your company information</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {[
            { label: 'Company Name *', key: 'company_name', placeholder: 'Acme Technologies' },
            { label: 'Industry', key: 'industry', placeholder: 'Information Technology' },
            { label: 'Website', key: 'website', placeholder: 'https://acme.com' },
            { label: 'Location', key: 'location', placeholder: 'Bangalore, India' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" value={(form as any)[key]} onChange={e => setForm({...form, [key]: e.target.value})} placeholder={placeholder} required={label.includes('*')} />
            </div>
          ))}
          <div>
            <label className="label">About Company</label>
            <textarea className="input min-h-24 resize-y" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief description of your company..." />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : exists ? 'Update Profile' : 'Create Profile'}</button>
        </form>
      </div>
    </Layout>
  )
}
