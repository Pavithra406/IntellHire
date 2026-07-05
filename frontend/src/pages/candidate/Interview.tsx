import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Play, CheckCircle, Brain, Type, Camera } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge';

type Stage = 'idle' | 'setup' | 'typed' | 'video' | 'completed';

const Interview: React.FC = () => {
  const [stage, setStage] = useState<Stage>('idle');
  const [interviewData, setInterviewData] = useState<any>(null);
  const [typedQuestions, setTypedQuestions] = useState<any[]>([]);
  const [videoQuestions, setVideoQuestions] = useState<any[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [typedAnswers, setTypedAnswers] = useState<Record<number, string>>({});
  const [currentVideoAnswer, setCurrentVideoAnswer] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [existingInterview, setExistingInterview] = useState<any>(null);
  const [candidateStatus, setCandidateStatus] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoSubmitted, setVideoSubmitted] = useState<Record<number, boolean>>({});
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/candidates/me'),
      api.get('/interview/my').catch(() => ({ data: null }))
    ]).then(([cr, ir]) => {
      setCandidateStatus(cr.data.status);
      setExistingInterview(ir.data);
      if (ir.data?.status === 'completed') setStage('completed');
    });
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      toast.error('Camera access required for video round');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  };

  // Start interview and split questions
  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await api.post('/interview/start');
      setInterviewData(res.data);
      const allQ = res.data.questions || [];
      // First 5 typed, next 5 video
      setTypedQuestions(allQ.slice(0, 5));
      setVideoQuestions(allQ.slice(5, 10));
      setStage('typed');
      setCurrentQIdx(0);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start');
    } finally {
      setLoading(false);
    }
  };

  // Submit all typed answers at once and move to video round
  const submitTypedRound = async () => {
    if (typedQuestions.some((q, i) => !typedAnswers[i]?.trim())) {
      return toast.error('Please answer all questions before proceeding');
    }
    setLoading(true);
    try {
      for (let i = 0; i < typedQuestions.length; i++) {
        await api.post(`/interview/${interviewData.interview_id}/answer`, {
          question_text: typedQuestions[i].question_text,
          answer_text: typedAnswers[i],
          sequence_order: i + 1
        });
      }
      toast.success('Typed round submitted! Starting video round...');
      setCurrentQIdx(0);
      setFollowUp('');
      await startCamera();
      setStage('video');
    } catch {
      toast.error('Submit failed');
    } finally {
      setLoading(false);
    }
  };

  // Record video answer
  const startRecording = () => {
    if (!streamRef.current) return toast.error('Camera not active');
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current);
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.start();
    mediaRecorderRef.current = rec;
    setIsRecording(true);
  };

  const stopRecording = () => {
    return new Promise<Blob | null>(resolve => {
      if (!mediaRecorderRef.current) return resolve(null);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  };

  const submitVideoAnswer = async () => {
    if (!currentVideoAnswer.trim()) return toast.error('Please type your answer summary');
    setLoading(true);
    try {
      let videoBlob: Blob | null = null;
      if (isRecording) videoBlob = await stopRecording();

      const q = followUp || videoQuestions[currentQIdx]?.question_text || '';
      const res = await api.post(`/interview/${interviewData.interview_id}/answer`, {
        question_text: q,
        answer_text: currentVideoAnswer,
        sequence_order: typedQuestions.length + currentQIdx + 1
      });

      // Upload video blob if recorded
      if (videoBlob) {
        const form = new FormData();
        form.append('file', videoBlob, `video_q${currentQIdx + 1}.webm`);
        await api.post(
          `/interview/${interviewData.interview_id}/upload-recording?recording_type=camera`,
          form, { headers: { 'Content-Type': 'multipart/form-data' } }
        ).catch(() => {});
      }

      setVideoSubmitted(v => ({ ...v, [currentQIdx]: true }));
      setCurrentVideoAnswer('');

      // Next question or finish
      if (currentQIdx >= videoQuestions.length - 1) {
        await completeInterview();
      } else {
        setCurrentQIdx(i => i + 1);
        setFollowUp(res.data.follow_up_question || '');
      }
    } catch {
      toast.error('Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const completeInterview = async () => {
    try {
      const res = await api.post(`/interview/${interviewData.interview_id}/complete`);
      setResult(res.data);
      stopCamera();
      setStage('completed');
      toast.success('Interview completed!');
    } catch { toast.error('Failed to complete'); }
  };

  const currentVideoQ = followUp || videoQuestions[currentQIdx]?.question_text || '';

  // ── Idle / Not eligible ──
  if (stage === 'idle') return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Technical Interview</h1>
        <p className="text-gray-400 text-sm mt-1">10 questions — 5 typed + 5 video recorded</p>
      </div>

      {existingInterview?.status === 'completed' ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
          <p className="text-white font-medium">Interview already completed</p>
          <button onClick={() => setStage('completed')} className="mt-4 text-violet-400 text-sm">View results →</button>
        </div>
      ) : candidateStatus === 'interview_pending' ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <Type size={24} className="text-violet-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Round 1</p>
              <p className="text-gray-400 text-xs mt-0.5">5 Typed Questions</p>
              <p className="text-gray-500 text-xs mt-1">Answer by typing</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <Camera size={24} className="text-blue-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Round 2</p>
              <p className="text-gray-400 text-xs mt-0.5">5 Video Questions</p>
              <p className="text-gray-500 text-xs mt-1">Record + type summary</p>
            </div>
          </div>
          <div className="space-y-2 mb-6">
            {['Camera & microphone will be active during video round',
              'Type your answers for Round 1',
              'Video recorded for communication evaluation',
              'AI evaluates technical knowledge and communication'].map(tip => (
              <p key={tip} className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle size={13} className="text-green-400 flex-shrink-0" /> {tip}
              </p>
            ))}
          </div>
          <button onClick={() => setStage('setup')}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-lg font-medium">
            <Play size={16} /> Begin Interview
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400">Complete all assessments to unlock the interview</p>
          <div className="mt-2"><StatusBadge status={candidateStatus} /></div>
        </div>
      )}
    </div>
  );

  // ── Setup ──
  if (stage === 'setup') return (
    <div className="max-w-md mx-auto space-y-6 py-10">
      <h2 className="text-xl font-bold text-white text-center">Ready to Start?</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <p className="text-gray-400 text-sm text-center">You'll have 10 questions total. Camera is only required for Round 2.</p>
        <button onClick={startInterview} disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
          {loading ? 'Preparing questions...' : 'Start Interview'}
        </button>
        <button onClick={() => setStage('idle')} className="w-full bg-gray-700 text-white py-2 rounded-lg text-sm">Back</button>
      </div>
    </div>
  );

  // ── Completed ──
  if (stage === 'completed') return (
    <div className="max-w-2xl mx-auto space-y-6 py-10">
      <div className="text-center">
        <CheckCircle size={52} className="text-green-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-white">Interview Completed!</h2>
        <p className="text-gray-400 mt-1">Your responses have been evaluated by AI</p>
      </div>
      {(result || existingInterview) && (() => {
        const scores = result?.scores || existingInterview;
        return (
          <div className="space-y-3">
            {[
              { label: 'Overall Score', value: scores?.overall_score },
              { label: 'Technical', value: scores?.technical_score },
              { label: 'Communication', value: scores?.communication_score },
              { label: 'Confidence', value: scores?.confidence_score },
            ].map(item => item.value != null && (
              <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className="text-white font-bold">{Number(item.value).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
            {(result?.evaluation?.ai_feedback || existingInterview?.ai_feedback) && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-2">AI Feedback</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {result?.evaluation?.ai_feedback || existingInterview?.ai_feedback}
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );

  // ── Typed Round ──
  if (stage === 'typed') return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          <Type size={16} className="text-violet-400" />
          <span className="text-white font-semibold text-sm">Round 1 — Typed Questions</span>
        </div>
        <span className="text-gray-400 text-sm">5 questions</span>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {typedQuestions.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${typedAnswers[i]?.trim() ? 'bg-violet-500' : 'bg-gray-700'}`} />
        ))}
      </div>

      {/* All 5 questions shown at once */}
      <div className="space-y-4">
        {typedQuestions.map((q, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-white font-medium mb-1">
              <span className="text-gray-500 mr-2 text-sm">Q{i + 1}.</span>{q.question_text}
            </p>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded capitalize mb-3 inline-block">
              {q.question_type}
            </span>
            <textarea
              rows={4}
              value={typedAnswers[i] || ''}
              onChange={e => setTypedAnswers(a => ({ ...a, [i]: e.target.value }))}
              placeholder="Type your answer here..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 resize-none mt-2"
            />
          </div>
        ))}
      </div>

      <button onClick={submitTypedRound} disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium text-sm">
        {loading ? 'Submitting...' : 'Submit & Start Video Round →'}
      </button>
    </div>
  );

  // ── Video Round ──
  if (stage === 'video') return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-blue-400" />
          <span className="text-white font-semibold text-sm">Round 2 — Video Questions</span>
        </div>
        <span className="text-gray-400 text-sm">Q{currentQIdx + 1} / {videoQuestions.length}</span>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {videoQuestions.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${videoSubmitted[i] ? 'bg-blue-500' : i === currentQIdx ? 'bg-blue-400 animate-pulse' : 'bg-gray-700'}`} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Camera feed */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="relative bg-black aspect-video">
            <video ref={videoRef} autoPlay muted playsInline
              className="w-full h-full object-cover" />
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff size={32} className="text-gray-600" />
              </div>
            )}
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                REC
              </div>
            )}
          </div>
          <div className="p-3 flex gap-2">
            <button onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-1 justify-center ${isRecording ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
              {isRecording ? <><MicOff size={12} /> Stop Recording</> : <><Mic size={12} /> Start Recording</>}
            </button>
          </div>
        </div>

        {/* Question + answer */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Brain size={15} className="text-blue-400" />
            </div>
            <p className="text-white text-sm font-medium leading-relaxed">{currentVideoQ}</p>
          </div>

          <p className="text-xs text-gray-500 mb-1.5">Type your answer (used for AI evaluation):</p>
          <textarea
            value={currentVideoAnswer}
            onChange={e => setCurrentVideoAnswer(e.target.value)}
            rows={6}
            placeholder="Speak your answer aloud and summarize it here..."
            className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none mb-4"
          />

          <button onClick={submitVideoAnswer} disabled={loading || !currentVideoAnswer.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium">
            {loading ? 'Processing...' : currentQIdx >= videoQuestions.length - 1 ? 'Finish Interview' : 'Next Question →'}
          </button>
        </div>
      </div>
    </div>
  );

  return null;
};

export default Interview;
