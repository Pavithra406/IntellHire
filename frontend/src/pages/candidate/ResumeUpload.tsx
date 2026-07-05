import React, { useEffect, useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';

const ResumeUpload: React.FC = () => {
  const [resume, setResume] = useState<any>(null);
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/candidates/me').then(r => {
      setCandidateId(r.data.id);
      return api.get(`/resume/${r.data.id}`);
    }).then(r => setResume(r.data)).catch(() => {});
  }, []);

  const handleFile = async (file: File) => {
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      return toast.error('Only PDF or DOCX files allowed');
    }
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Resume uploaded and screened!');
      // Reload
      if (candidateId) {
        const r = await api.get(`/resume/${candidateId}`);
        setResume(r.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Resume Upload</h1>
        <p className="text-gray-400 text-sm mt-1">Upload your resume for AI-powered screening</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
          dragOver ? 'border-violet-500 bg-violet-500/10' : 'border-gray-700 hover:border-gray-600 bg-gray-900'
        }`}
      >
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full" />
            <p className="text-gray-400">Uploading and screening...</p>
          </div>
        ) : (
          <>
            <Upload size={36} className="mx-auto mb-3 text-gray-500" />
            <p className="text-white font-medium">Drop your resume here or click to browse</p>
            <p className="text-gray-400 text-sm mt-1">PDF or DOCX · Max 10MB</p>
          </>
        )}
      </div>

      {/* Results */}
      {resume && (
        <div className="space-y-4">
          {/* Match score */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Screening Result</h3>
              <StatusBadge status={resume.screening_status} />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-5xl font-black ${(resume.match_percentage || 0) >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                {resume.match_percentage?.toFixed(0)}%
              </div>
              <div>
                <p className="text-white font-medium">Job Match Score</p>
                <p className="text-gray-400 text-sm">{resume.file_name}</p>
              </div>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${(resume.match_percentage || 0) >= 60 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${resume.match_percentage || 0}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skills */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Your Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {resume.extracted_skills?.map((s: string) => (
                  <span key={s} className="text-xs bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-full">{s}</span>
                ))}
                {!resume.extracted_skills?.length && <p className="text-gray-500 text-sm">None extracted</p>}
              </div>
            </div>

            {/* Missing */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Missing Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {resume.missing_skills?.map((s: string) => (
                  <span key={s} className="text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full">{s}</span>
                ))}
                {!resume.missing_skills?.length && <p className="text-green-400 text-sm">No missing skills!</p>}
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Strengths</h3>
              {resume.strengths?.map((s: string, i: number) => (
                <p key={i} className="flex items-start gap-2 text-sm text-green-400 mb-1.5">
                  <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> {s}
                </p>
              ))}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Areas to Improve</h3>
              {resume.weaknesses?.map((w: string, i: number) => (
                <p key={i} className="flex items-start gap-2 text-sm text-yellow-400 mb-1.5">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {w}
                </p>
              ))}
            </div>
          </div>

          {resume.recommendations && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2">AI Recommendations</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{resume.recommendations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
