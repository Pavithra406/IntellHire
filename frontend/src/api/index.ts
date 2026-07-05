import api from './client'

// Auth
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  createCandidate: (data: any) => api.post('/auth/create-candidate', data),
}

// Company
export const companyApi = {
  create: (data: any) => api.post('/company/', data),
  getMe: () => api.get('/company/me'),
  update: (data: any) => api.put('/company/me', data),
}

// Jobs
export const jobsApi = {
  create: (data: any) => api.post('/jobs/', data),
  list: () => api.get('/jobs/'),
  get: (id: number) => api.get(`/jobs/${id}`),
  update: (id: number, data: any) => api.put(`/jobs/${id}`, data),
  delete: (id: number) => api.delete(`/jobs/${id}`),
}

// Candidates
export const candidatesApi = {
  list: () => api.get('/candidates/'),
  me: () => api.get('/candidates/me'),
  get: (id: number) => api.get(`/candidates/${id}`),
  updateStatus: (id: number, data: any) => api.patch(`/candidates/${id}/status`, data),
  computeRanking: (id: number) => api.post(`/candidates/${id}/compute-ranking`),
  getViolations: (id: number) => api.get(`/candidates/${id}/violations`),
}

// Resume
export const resumeApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/resume/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getMy: () => api.get('/resume/my-resume'),
  download: (candidateId: number) =>
    api.get(`/resume/download/${candidateId}`, { responseType: 'blob' }),
}

// Assessment
export const assessmentApi = {
  start: (type: string) => api.post(`/assessment/start/${type}`),
  submit: (id: number, answers: any[]) =>
    api.post(`/assessment/submit/${id}`, { answers }),
  getMy: () => api.get('/assessment/my-assessments'),
  getQuestions: (id: number) => api.get(`/assessment/${id}/questions`),
  logViolation: (data: any) => api.post('/assessment/violation', data),
}

// Interview
export const interviewApi = {
  generateQuestions: (data: any) => api.post('/interview/questions/generate', data),
  getQuestions: (jobId: number) => api.get(`/interview/questions/${jobId}`),
  addQuestion: (data: any) => api.post('/interview/questions', data),
  updateQuestion: (id: number, data: any) => api.put(`/interview/questions/${id}`, data),
  deleteQuestion: (id: number) => api.delete(`/interview/questions/${id}`),
  start: () => api.post('/interview/start'),
  submitAnswer: (interviewId: number, data: any) =>
    api.post(`/interview/answer?interview_id=${interviewId}`, data),
  complete: (interviewId: number) => api.post(`/interview/complete/${interviewId}`),
  getMy: () => api.get('/interview/my-interview'),
  uploadRecording: (interviewId: number, file: Blob, type: string) => {
    const form = new FormData()
    form.append('file', file, `${type}_recording.webm`)
    return api.post(`/interview/upload-recording/${interviewId}?recording_type=${type}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  rankings: (jobId: number) => api.get(`/dashboard/rankings/${jobId}`),
  report: (jobId: number) => api.get(`/dashboard/report/${jobId}`),
}
