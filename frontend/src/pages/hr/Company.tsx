import React, { useEffect, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const Company: React.FC = () => {
  const [company, setCompany] = useState<any>(null);
  const [form, setForm] = useState({
    company_name: '', industry: '', website: '', description: '', location: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/company')
      .then(r => { setCompany(r.data); setForm(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (company) {
        const r = await api.put('/company', form);
        setCompany(r.data);
        toast.success('Company profile updated');
      } else {
        const r = await api.post('/company', form);
        setCompany(r.data);
        toast.success('Company profile created');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Building2 size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Company Profile</h1>
          <p className="text-gray-400 text-sm">{company ? 'Update your company details' : 'Create your company profile to post jobs'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Company Name *</label>
          <input required value={form.company_name}
            onChange={e => setForm({ ...form, company_name: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500"
            placeholder="e.g. TechCorp Solutions" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Industry</label>
            <input value={form.industry}
              onChange={e => setForm({ ...form, industry: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500"
              placeholder="e.g. Information Technology" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label>
            <input value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500"
              placeholder="e.g. Bangalore, India" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Website</label>
          <input value={form.website}
            onChange={e => setForm({ ...form, website: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500"
            placeholder="https://yourcompany.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea rows={4} value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 resize-none"
            placeholder="Brief description of your company..." />
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition">
          <Save size={16} />
          {saving ? 'Saving...' : company ? 'Update Profile' : 'Create Profile'}
        </button>
      </form>

      {company && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Current Profile</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2"><span className="text-gray-400 w-24">Company</span><span className="text-white">{company.company_name}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-24">Industry</span><span className="text-white">{company.industry || '—'}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-24">Location</span><span className="text-white">{company.location || '—'}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-24">Website</span><span className="text-white">{company.website || '—'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Company;
