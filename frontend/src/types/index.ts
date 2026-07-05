export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'hr' | 'candidate';
  is_active: boolean;
  created_at: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  required_skills: string[];
  experience_years: string;
  qualification: string;
  salary_range: string;
  interview_rounds: string[];
  resume_cutoff: number;
  aptitude_cutoff: number;
  sql_cutoff: number;
  coding_cutoff: number;
  is_active: boolean;
  created_at: string;
}

export interface Candidate {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  job_id: number;
  job_title: string;
  status: string;
  overall_score: number | null;
  rank: number | null;
  hr_notes: string | null;
  created_at: string;
  resume?: ResumeData | null;
  assessments?: AssessmentSummary[];
  interview?: InterviewSummary | null;
  violations?: number;
  ranking?: RankingData | null;
}

export interface ResumeData {
  id?: number;
  file_name?: string;
  match_percentage: number | null;
  screening_status: string;
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  recommendations: string;
  extracted_skills: string[];
  extracted_name?: string;
  extracted_email?: string;
  extracted_experience?: any[];
  extracted_education?: any[];
  extracted_projects?: any[];
}

export interface AssessmentSummary {
  id?: number;
  type: string;
  status: string;
  percentage: number | null;
}

export interface InterviewSummary {
  id?: number;
  status: string;
  overall_score: number | null;
  technical_score: number | null;
  communication_score: number | null;
  ai_feedback: string | null;
  transcript?: any[];
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

export interface RankingData {
  overall_score: number;
  rank: number | null;
  score_breakdown: Record<string, number>;
  ai_recommendation: {
    recommendation: string;
    reason: string;
    strengths: string[];
    concerns: string[];
  };
}

export interface DashboardStats {
  total_candidates: number;
  total_jobs: number;
  status_breakdown: Record<string, number>;
  selected: number;
  rejected: number;
  pending: number;
  avg_score: number;
  recent_candidates: Candidate[];
  jobs: Job[];
}

export interface Violation {
  id: number;
  session_type: string;
  violation_type: string;
  description: string | null;
  occurred_at: string;
}
