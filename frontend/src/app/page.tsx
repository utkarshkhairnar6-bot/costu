'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Send, AlertTriangle, CheckCircle, 
  TrendingUp, Users, Award, BookOpen, Upload, ShieldAlert, Clock, 
  Sparkles, Menu, Activity, Shield, ChevronDown, Check, HelpCircle, 
  RefreshCw, Home, Search, Bell, Settings, LogOut, Plus, ArrowLeft,
  ChevronRight, Play, FileAudio, PlayCircle, Eye, Info
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area
} from 'recharts';

// Define TS Interfaces
interface Persona {
  id: string;
  name: string;
  details: string;
  language: string;
  behavior: string;
  systemPrompt: string;
}

interface FatalError {
  category: string;
  severity: string;
  employeeSaid: string;
  reason: string;
  correctResponse: string;
  timestamp?: number;
}

interface Scorecard {
  communicationSkills: number;
  productKnowledge: number;
  confidence: number;
  listeningSkills: number;
  objectionHandling: number;
  compliance: number;
  closingSkills: number;
  professionalism: number;
  summary: string;
  strengths: string;
  weaknesses: string;
  managerNotes: string;
}

interface DashboardStats {
  totalCalls: number;
  averageScore: number;
  practiceTimeMinutes: number;
  fatalErrorsCount: number;
  complianceViolations: Record<string, number>;
  topAgents: Array<{ name: string; avgScore: number; callsCount: number }>;
  bottomAgents: Array<{ name: string; avgScore: number; callsCount: number }>;
  historicalTrends: Array<{ date: string; callsCount: number; avgScore: number; fatalsCount: number }>;
  improvementRate: number;
}

interface CallRecord {
  id: string;
  filename: string;
  durationText: string;
  partnerBrand: string;
  primaryIntent: string;
  status: string; // 'Ready' or percentage e.g. 'Processing 72%'
  progressValue: number; // 0 to 100
  sopScore: number;
  agentName: string;
  complianceState: {
    rates: 'PASS' | 'FAIL';
    fees: 'PASS' | 'FAIL';
    eligibility: 'PASS' | 'FAIL';
  };
  managerFeedback: string;
  transcript: Array<{ speaker: 'Agent' | 'Customer' | 'System'; text: string }>;
}

export default function PlatformPage() {
  // Navigation & Layout State
  const [activeTab, setActiveTab] = useState<'home' | 'recordings' | 'personas' | 'training' | 'analytics' | 'kb'>('training');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // API Backend connection configurations
  const [backendUrl, setBackendUrl] = useState('http://localhost:8080');
  const [apiConfig, setApiConfig] = useState({
    hasGeminiKey: false,
    hasElevenLabsKey: false,
    hasDeepgramKey: false,
    hasOpenAIKey: false,
    elevenLabsAgentId: ''
  });

  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'openai' | 'browser' | 'google'>('google');
  const [customElevenLabsKey, setCustomElevenLabsKey] = useState('');
  const [customVoiceId, setCustomVoiceId] = useState('mrQhZWGbb2k9qWJb5qeA');
  const [customOpenAIKey, setCustomOpenAIKey] = useState('');
  const [customOpenAIVoice, setCustomOpenAIVoice] = useState('alloy');

  // Simulator State Machine
  const [appState, setAppState] = useState<'idle' | 'dialing' | 'connected' | 'ended'>('idle');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('suresh');
  const [callDuration, setCallDuration] = useState(0);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const [isMuted, setIsMuted] = useState(false);
  const [speechInput, setSpeechInput] = useState('');
  const [conversation, setConversation] = useState<Array<{ speaker: 'Agent' | 'Customer' | 'System'; text: string }>>([]);
  const [checklist, setChecklist] = useState({
    opener: false,
    language: false,
    disclosure: false,
    productRate: false,
    reducing: false,
    cibil: false,
    tenure: false,
    usps: false,
    journey: false
  });
  const [fatalAlerts, setFatalAlerts] = useState<FatalError[]>([]);
  const [currentSpeechSubtitle, setCurrentSpeechSubtitle] = useState('[Phone Off-hook]');

  // Modal QA Scorecard State
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [qaScorecard, setQaScorecard] = useState<Scorecard | null>(null);
  const [coachingFeedback, setCoachingFeedback] = useState<string[]>([]);
  const [coachingRecommendations, setCoachingRecommendations] = useState('');

  // Manager Analytics State
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Admin SOP Knowledge Base State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [kbDocs, setKbDocs] = useState<Array<{ id: string; title: string; category: string; createdAt: string }>>([]);
  const [simulatedLog, setSimulatedLog] = useState<string[]>([]);

  // Web Speech recognition objects
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<typeof window.speechSynthesis | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const conversationEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Call recordings state list (Screen 2 table)
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);

  // Persona dialogues mapping for local offline simulation fallback
  const personaDialogues: Record<string, Record<string, string>> = {
    suresh: {
      connected: "गुड मॉर्निंग! धन्यवाद आपका कॉल करने के लिए। बताइए, मैं आपकी किस प्रकार सहायता कर सकता हूँ?",
      identity_confirmed: "हाँ, मैं जिग्नेश राठौड़ बोल रहा हूँ। बताइए, कैसे मदद करनी है?",
      language_checked: "मुझे दोनों भाषाएँ ठीक हैं। आप चाहे हिंदी में बात करें या अंग्रेज़ी में, मैं समझ लूँगा।",
      disclosure_heard: "हाँ, बिल्कुल ठीक है। आप रिकॉर्ड कर सकते हैं। कोई परेशानी नहीं।",
      objection_rate_raised: "मुझे जो रेट ऑफ़ इंटरेस्ट बताया गया था, वो मुझे काफी ज़्यादा लगा। इसी वजह से मैं आगे नहीं बढ़ पाया।",
      reducing_rate_understood: "अच्छा, समझ गया। तो आप बता रहे हैं कि जो इंट्रेस्ट है, वो घटते हुए बाकी बचे प्रिंसिपल पर लगेगा, जिससे कुल ब्याज कम होता जाएगा। अब मुझे स्पष्ट है। चलिए, अब आप मुझे आगे की प्रक्रिया समझा सकते हैं।",
      otp_error: "ठीक है, मैं पहले मनी कंट्रोल के पेज पर आ जाता हूँ। मैं अपना मोबाइल नंबर डाल देता हूँ, और जो ओटीपी आएगा, उसे भी भर दूँगा। आप आगे बताते रहिए। पर सर, जब मैं कंपनी का ऑफिशियल ईमेल आईडी डाल रहा हूँ अपनी कंपनी की, मेरे को मेरा ओटीपी आ नहीं रहा है, क्या करना पड़ेगा?",
      processing_fees_high: "समझ गया। तो मैं रैंडम ओटीपी डाल देता हूँ ताकि आगे की प्रक्रिया जारी रखी जा सके। लेकिन मुझे ऐसा लग रहा है कि जो प्रोसेसिंग फी और चार्जेज हैं, वो काफी ज़्यादा हैं। इस बारे में क्या किया जा सकता है?",
      address_details: "ठीक है, अगर यह एक ही बार का चार्ज है और आगे कोई अतिरिक्त फीस नहीं है, तो मुझे यह ठीक लग रहा है। और सर, यहाँ पर एड्रेस डिटेल्स में मेरे को करंट एड्रेस में यस लिखना है या नो लिखना है? मैं अपने आधार कार्ड के लोकेशन में नहीं रहता हूँ।",
      emandate_failed: "समझ गया। तो मैं नो चुनकर अपना मौजूदा पता भर देता हूँ। लेकिन सर, मेरा ई-मैंडेट सेटअप नहीं हो पा रहा है। क्या वजह हो सकती है?",
      emandate_resolved: "Hello."
    },
    ramesh: {
      connected: "Hello! Jaldi boliye, main ek meeting mein ja raha hoon.",
      opener_heard: "Haan main Ramesh bol raha hoon. Moneycontrol se? Okay. Language? Let's speak in Hinglish, mix is fine. Par jaldi bataiye.",
      language_checked: "Main Hindi aur English mix chalega. Boliye L&T Finance loan ka kya offer hai?",
      disclosure_heard: "Record ho raha hai? Ok ok, directly mudde ki baat par aaiye, time nahi hai.",
      objection_tenure: "Is loan ko return karne ke liye tenure kitna milega max to max? How much time do I get to pay it back?",
      objection_rate: "But my own bank is offering a lower interest rate, why should I choose L&T?",
      closing: "Theek hai, 2-minute digital approval aur zero hidden annual maintenance charges hain to ye achi baat hai. Main isko abhi check karta hoon online. Aage badhaiye process.",
      goodbye: "Ok, thanks for calling. Bye."
    },
    priya: {
      connected: "Hello, Priya here. Who is calling, please?",
      opener_heard: "Oh, hi Utkarsh. Yes, I was checking L&T loans on Moneycontrol. Language preference? Yes, English is perfectly fine. Let's speak in English.",
      language_checked: "Yes, I prefer English. Can you explain the details of the L&T Finance Personal Loan?",
      disclosure_heard: "That's fine, I understand this call is recorded for quality purposes. Please go ahead.",
      objection_tenure: "Okay, so how much time do I get to pay it back? What are the tenure options?",
      objection_rate: "Understood. But my own bank is offering a lower interest rate, why should I choose L&T?",
      closing: "Oh, I see. 100% paperless digital process and 2-minute real-time approval with zero hidden annual maintenance fees? That sounds very convenient. I will proceed with this option.",
      goodbye: "Thank you for the guidance, Utkarsh. Have a nice day. Bye."
    }
  };

  // Local dialogues state progression
  const [flowPhase, setFlowPhase] = useState<
    'idle' | 'greeting' | 'identity' | 'language' | 'disclosure' | 'objection_tenure' | 'objection_rate' | 'reducing_rate' | 'proceed_details' | 'otp_resolved' | 'fees_resolved' | 'address_resolved' | 'emandate_resolved' | 'closing' | 'goodbye'
  >('idle');

  const flowPhaseRef = useRef<string>('idle');
  const selectedPersonaIdRef = useRef<string>('suresh');
  const appStateRef = useRef<string>('idle');

  useEffect(() => {
    flowPhaseRef.current = flowPhase;
  }, [flowPhase]);

  useEffect(() => {
    selectedPersonaIdRef.current = selectedPersonaId;
  }, [selectedPersonaId]);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const inputModeRef = useRef<'voice' | 'text'>('text');
  useEffect(() => {
    inputModeRef.current = inputMode;
  }, [inputMode]);

  // Load configuration and static personas
  useEffect(() => {
    fetchConfig();
    fetchPersonas();
    fetchDashboardStats();
    initializeMockRecordings();
    
    // Setup browser web speech API refs
    if (typeof window !== 'undefined') {
      synthesisRef.current = window.speechSynthesis;
      const SpeechGen = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechGen) {
        const recInstance = new SpeechGen();
        recInstance.continuous = false;
        recInstance.interimResults = false;
        recInstance.lang = 'en-IN';
        
        recInstance.onresult = (e: any) => {
          const text = e.results[0][0].transcript;
          submitAgentStatement(text);
        };
        
        recInstance.onerror = (err: any) => {
          console.warn('Speech API recognition error: ', err.error);
        };
        
        recognitionRef.current = recInstance;
      }
    }

    // Set initial simulator logs
    setSimulatedLog([
      `[14:22:01] Processing File: PL_INQ_8829_KRISHNA.mp3 (Source: Ring)`,
      `[14:22:04] Customer: 'What is the flat interest rate for a loan of 5 lakhs?'`,
      `[14:22:05] Intent Identified: Interest Rate Inquiry (Confidence 0.99)`,
      `[14:22:08] Agent: 'The starting rate is 10.5% p.a., subject to credit score.'`,
      `[14:22:12] Customer: 'Are there any hidden processing fees or charges?'`,
      `[14:22:13] Intent Identified: Processing Fee Query (Confidence 0.98)`
    ]);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${backendUrl}/simulator/config`);
      const payload = await res.json();
      if (payload.success) {
        setApiConfig(payload.data);
        if (payload.data.hasGeminiKey) {
          setTtsProvider('google');
        } else if (payload.data.hasElevenLabsKey) {
          setTtsProvider('elevenlabs');
        } else if (payload.data.hasOpenAIKey) {
          setTtsProvider('openai');
        } else {
          setTtsProvider('browser');
        }
      }
    } catch (e) {
      console.warn('Backend server offline fallback configuration active.');
    }
  };

  const fetchPersonas = async () => {
    try {
      const res = await fetch(`${backendUrl}/personas`);
      const list = await res.json();
      if (list && list.length > 0) {
        setPersonas(list);
      } else {
        setFallbackPersonas();
      }
    } catch (e) {
      setFallbackPersonas();
    }
  };

  const setFallbackPersonas = () => {
    setPersonas([
      {
        id: 'suresh',
        name: 'Jignesh Rathod',
        details: 'Loan Range: ₹10L | Pending app | Price Sensitive',
        language: 'Hindi',
        behavior: 'Price Sensitive & Frustrated',
        systemPrompt: 'Jignesh Rathod system prompt'
      },
      {
        id: 'ramesh',
        name: 'Ramesh Kumar',
        details: 'Loan Range: ₹5L | Busy & Impatient | Strict',
        language: 'Hinglish',
        behavior: 'Impatient & Busy',
        systemPrompt: 'Ramesh Kumar system prompt'
      },
      {
        id: 'priya',
        name: 'Priya Sharma',
        details: 'Loan Range: ₹15L | Polite & Detail-oriented',
        language: 'English',
        behavior: 'Polite & Detail-oriented',
        systemPrompt: 'Priya Sharma system prompt'
      }
    ]);
  };

  const fetchDashboardStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch(`${backendUrl}/analytics/dashboard`);
      const payload = await res.json();
      if (payload.success) {
        setDashboardStats(payload.data);
      } else {
        setMockDashboardStats();
      }
    } catch (e) {
      setMockDashboardStats();
    } finally {
      setIsLoadingStats(false);
    }
  };

  const setMockDashboardStats = () => {
    setDashboardStats({
      totalCalls: 14284,
      averageScore: 92,
      practiceTimeMinutes: 142,
      fatalErrorsCount: 3,
      complianceViolations: {
        'False Commitment': 2,
        'Wrong Interest Rate': 1,
        'Wrong Eligibility Information': 0,
        'Incomplete Disclosure': 1,
        'Compliance Miss': 0,
        'Unprofessional Language': 0
      },
      topAgents: [
        { name: 'Utkarsh Khairnar', avgScore: 92, callsCount: 8 },
        { name: 'Ananya Sharma', avgScore: 88, callsCount: 6 },
        { name: 'Rohan Mehta', avgScore: 82, callsCount: 5 }
      ],
      bottomAgents: [
        { name: 'Sameer Sen', avgScore: 45, callsCount: 3 },
        { name: 'Preeti Das', avgScore: 62, callsCount: 2 }
      ],
      historicalTrends: [
        { date: 'June 20', callsCount: 3, avgScore: 55, fatalsCount: 2 },
        { date: 'June 21', callsCount: 5, avgScore: 68, fatalsCount: 1 },
        { date: 'June 22', callsCount: 8, avgScore: 72, fatalsCount: 1 },
        { date: 'June 23', callsCount: 12, avgScore: 78, fatalsCount: 0 },
        { date: 'June 24', callsCount: 24, avgScore: 78, fatalsCount: 3 }
      ],
      improvementRate: 14
    });
  };

  const initializeMockRecordings = () => {
    setCallRecords([
      {
        id: 'PL-8829',
        filename: 'PL_INQ_8829_KRISHNA.mp3',
        durationText: '08m 45s',
        partnerBrand: 'RING_PL',
        primaryIntent: 'Interest Rate Inquiry',
        status: 'Processing 72%',
        progressValue: 72,
        sopScore: 0,
        agentName: 'Siddharth V.',
        complianceState: { rates: 'FAIL', fees: 'FAIL', eligibility: 'FAIL' },
        managerFeedback: '',
        transcript: []
      },
      {
        id: 'PL-7721',
        filename: 'PL_APP_4401_SHARMA.wav',
        durationText: '12m 20s',
        partnerBrand: 'PREFR_LOANS',
        primaryIntent: 'Eligibility Check',
        status: 'Ready',
        progressValue: 100,
        sopScore: 72,
        agentName: 'Siddharth V.',
        complianceState: { rates: 'FAIL', fees: 'PASS', eligibility: 'FAIL' },
        managerFeedback: 'The agent struggled with explaining the floating vs fixed rate components. While the soft skills were excellent, the technical accuracy regarding EMI breakdown was lacking according to Moneycontrol\'s financial planning benchmarks.',
        transcript: [
          { speaker: 'Agent', text: 'Jignesh ji, I understand your concern. Rates are starting from 10.99% only. Hum HDFC ya Bajaj Finserv se best offer check kar rahe hain based on your credit score. No hidden charges, main ek ek line explain kar deta hoon.' },
          { speaker: 'Customer', text: 'Hidden charges ka kya scene hai? Advertisement mein kuch aur hota hai and actual application mein alag processing fees! 50 Lakhs ka loan chahiye par transparency missing hai.' },
          { speaker: 'Agent', text: 'Main Alex baat kar raha hoon from the Personal Loan department. Aapka application process check karne ke liye call kiya hai. Aapko instant cash ki requirement thi?' },
          { speaker: 'Customer', text: 'Bhai, ye 50 Lakhs tak' }
        ]
      },
      {
        id: 'PL-0022',
        filename: 'PL_CLOSURE_002_VERMA.mp3',
        durationText: '15m 10s',
        partnerBrand: 'LT_FINANCE',
        primaryIntent: 'Pre-closure Terms',
        status: 'Extracting Fees 15%',
        progressValue: 15,
        sopScore: 0,
        agentName: 'Mayuri D.',
        complianceState: { rates: 'PASS', fees: 'PASS', eligibility: 'PASS' },
        managerFeedback: '',
        transcript: []
      }
    ]);
  };

  // Dial call simulator
  const startSimulatorCall = () => {
    setAppState('dialing');
    setFatalAlerts([]);
    setConversation([]);
    setChecklist({
      opener: false,
      language: false,
      disclosure: false,
      productRate: false,
      reducing: false,
      cibil: false,
      tenure: false,
      usps: false,
      journey: false
    });
    setCallDuration(0);
    setFlowPhase('greeting');
    setCurrentSpeechSubtitle('[Dialing Customer...]');

    setTimeout(() => {
      connectCall();
    }, 2000);
  };

  const connectCall = () => {
    setAppState('connected');
    setCurrentSpeechSubtitle('Call Active');
    
    // Start duration counting
    timerIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Initial customer speech Greeting
    const greetingText = personaDialogues[selectedPersonaId].connected;
    addMessageToConsole('Customer', greetingText);
    speakUtterance(greetingText);
  };

  const speakUtterance = async (text: string) => {
    setCurrentSpeechSubtitle(text);

    if (ttsProvider === 'google') {
      try {
        const response = await fetch(`${backendUrl}/simulator/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text,
            voiceId: selectedPersonaId === 'suresh' ? 'hi-IN-Wavenet-B' : selectedPersonaId === 'ramesh' ? 'hi-IN-Wavenet-C' : 'en-IN-Wavenet-C',
            provider: 'google'
          }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current.currentTime = 0;
          }
          const audio = new Audio(audioUrl);
          activeAudioRef.current = audio;
          audio.onended = () => {
            if (inputModeRef.current === 'voice' && appStateRef.current === 'connected') {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.warn('Auto mic restart failed:', err);
              }
            }
          };
          audio.play();
          return;
        } else {
          const errData = await response.json();
          const errMsg = errData.message || 'Google TTS failed to generate synthesis.';
          setFatalAlerts(prev => {
            const errObj = {
              category: 'Google TTS API Gaps',
              severity: 'Warning',
              employeeSaid: 'Speech Engine Synthesis',
              reason: `Google TTS failed: "${errMsg}". Falling back to browser synthesis.`,
              correctResponse: 'Check backend key rotation configuration or permissions.'
            };
            if (prev.some(e => e.reason.includes(errMsg))) return prev;
            return [...prev, errObj];
          });
        }
      } catch (err: any) {
        console.warn('Google TTS failed, falling back to Web Speech Synthesis:', err);
        const errMsg = err.message || 'Network error or backend offline.';
        setFatalAlerts(prev => {
          const errObj = {
            category: 'Google TTS API Gaps',
            severity: 'Warning',
            employeeSaid: 'Speech Engine Synthesis',
            reason: `Google TTS failed: "${errMsg}". Falling back to browser synthesis.`,
            correctResponse: 'Check backend status, network connection, or API configuration.'
          };
          if (prev.some(e => e.reason.includes(errMsg))) return prev;
          return [...prev, errObj];
        });
      }
    } else if (ttsProvider === 'elevenlabs') {
      const activeKey = customElevenLabsKey || (apiConfig.hasElevenLabsKey ? 'env_key' : '');
      if (activeKey) {
        try {
          const response = await fetch(`${backendUrl}/simulator/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text,
              voiceId: customVoiceId,
              apiKey: customElevenLabsKey,
              provider: 'elevenlabs'
            }),
          });
          if (response.ok) {
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            if (activeAudioRef.current) {
              activeAudioRef.current.pause();
              activeAudioRef.current.currentTime = 0;
            }
            const audio = new Audio(audioUrl);
            activeAudioRef.current = audio;
            audio.onended = () => {
              if (inputModeRef.current === 'voice' && appStateRef.current === 'connected') {
                try {
                  recognitionRef.current.start();
                } catch (err) {
                  console.warn('Auto mic restart failed:', err);
                }
              }
            };
            audio.play();
            return;
          } else {
            const errData = await response.json();
            const errMsg = errData.message || 'ElevenLabs failed to generate synthesis.';
            
            setFatalAlerts(prev => {
              const errObj = {
                category: 'ElevenLabs API Gaps',
                severity: 'Warning',
                employeeSaid: 'Speech Engine Synthesis',
                reason: `ElevenLabs failed: "${errMsg}". Falling back to browser synthesis.`,
                correctResponse: 'Enable text_to_speech permissions for your key on the ElevenLabs developer console.'
              };
              if (prev.some(e => e.reason.includes(errMsg))) return prev;
              return [...prev, errObj];
            });
          }
        } catch (err: any) {
          console.warn('ElevenLabs TTS failed, falling back to Web Speech Synthesis:', err);
          const errMsg = err.message || 'Network error or backend offline.';
          setFatalAlerts(prev => {
            const errObj = {
              category: 'ElevenLabs API Gaps',
              severity: 'Warning',
              employeeSaid: 'Speech Engine Synthesis',
              reason: `ElevenLabs failed: "${errMsg}". Falling back to browser synthesis.`,
              correctResponse: 'Check backend status, network connection, or API configuration.'
            };
            if (prev.some(e => e.reason.includes(errMsg))) return prev;
            return [...prev, errObj];
          });
        }
      }
    } else if (ttsProvider === 'openai') {
      const activeKey = customOpenAIKey || (apiConfig.hasOpenAIKey ? 'env_key' : '');
      if (activeKey) {
        try {
          const response = await fetch(`${backendUrl}/simulator/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text,
              voiceId: customOpenAIVoice,
              apiKey: customOpenAIKey,
              provider: 'openai'
            }),
          });
          if (response.ok) {
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            if (activeAudioRef.current) {
              activeAudioRef.current.pause();
              activeAudioRef.current.currentTime = 0;
            }
            const audio = new Audio(audioUrl);
            activeAudioRef.current = audio;
            audio.onended = () => {
              if (inputModeRef.current === 'voice' && appStateRef.current === 'connected') {
                try {
                  recognitionRef.current.start();
                } catch (err) {
                  console.warn('Auto mic restart failed:', err);
                }
              }
            };
            audio.play();
            return;
          } else {
            const errData = await response.json();
            const errMsg = errData.message || 'OpenAI failed to generate synthesis.';
            
            setFatalAlerts(prev => {
              const errObj = {
                category: 'OpenAI API Gaps',
                severity: 'Warning',
                employeeSaid: 'Speech Engine Synthesis',
                reason: `OpenAI failed: "${errMsg}". Falling back to browser synthesis.`,
                correctResponse: 'Check your OpenAI API key and usage limits.'
              };
              if (prev.some(e => e.reason.includes(errMsg))) return prev;
              return [...prev, errObj];
            });
          }
        } catch (err: any) {
          console.warn('OpenAI TTS failed, falling back to Web Speech Synthesis:', err);
          const errMsg = err.message || 'Network error or backend offline.';
          setFatalAlerts(prev => {
            const errObj = {
              category: 'OpenAI API Gaps',
              severity: 'Warning',
              employeeSaid: 'Speech Engine Synthesis',
              reason: `OpenAI failed: "${errMsg}". Falling back to browser synthesis.`,
              correctResponse: 'Check backend status, network connection, or API configuration.'
            };
            if (prev.some(e => e.reason.includes(errMsg))) return prev;
            return [...prev, errObj];
          });
        }
      }
    }

    if (synthesisRef.current) {
      synthesisRef.current.cancel(); // Stop active speaking
      const utterance = new SpeechSynthesisUtterance(text);
      
      const lang = personaDialogues[selectedPersonaId].language;
      const voices = synthesisRef.current.getVoices();
      let selectedVoice = null;
      
      if (lang === 'English') {
        selectedVoice = voices.find(v => v.lang.startsWith('en-') && v.name.includes('Google'));
      } else {
        selectedVoice = voices.find(v => v.lang.startsWith('hi-') || v.name.includes('Hindi'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = 0.95;
      synthesisRef.current.speak(utterance);
    }
  };

  const addMessageToConsole = (speaker: 'Agent' | 'Customer' | 'System', text: string) => {
    setConversation(prev => [...prev, { speaker, text }]);
  };

  // Submit agent's voice transcript or typed text
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speechInput.trim()) return;
    
    submitAgentStatement(speechInput);
    setSpeechInput('');
  };

  const submitAgentStatement = async (speech: string) => {
    addMessageToConsole('Agent', speech);

    // Trigger customer reaction reply organically and instantly (non-blocking)
    if (conversationEndTimeoutRef.current) clearTimeout(conversationEndTimeoutRef.current);
    
    setTimeout(() => {
      triggerCustomerDialogReply(speech);
    }, 100);

    // Post to backend QA Service asynchronously in the background
    fetch(`${backendUrl}/qa/audit-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speech, timestamp: callDuration })
    })
      .then(res => res.json())
      .then(payload => {
        if (payload.success) {
          const { fatalError, checkedItems } = payload.data;
          
          // Update live compliance checkboxes
          if (checkedItems && checkedItems.length > 0) {
            setChecklist(prev => {
              const next = { ...prev };
              checkedItems.forEach((item: string) => {
                // @ts-ignore
                next[item] = true;
              });
              return next;
            });
          }

          // Trigger Fatal Error alerts dynamically
          if (fatalError) {
            setFatalAlerts(prev => {
              if (prev.some(err => err.category === fatalError.category)) return prev;
              return [...prev, fatalError];
            });
          }
        } else {
          localEvaluateQA(speech);
        }
      })
      .catch(err => {
        console.warn('Backend live audit failed, performing local evaluation:', err);
        localEvaluateQA(speech);
      });
  };

  const localEvaluateQA = (speech: string) => {
    const speechLower = speech.toLowerCase();
    
    if (speechLower.includes('moneycontrol') && (speechLower.includes('jignesh') || speechLower.includes('ramesh') || speechLower.includes('priya'))) {
      setChecklist(prev => ({ ...prev, opener: true }));
    }
    if (speechLower.includes('language') || speechLower.includes('comfortable') || speechLower.includes('hindi') || speechLower.includes('english')) {
      setChecklist(prev => ({ ...prev, language: true }));
    }
    if (speechLower.includes('record') && speechLower.includes('application')) {
      setChecklist(prev => ({ ...prev, disclosure: true }));
    }
    if (speechLower.includes('11%') || speechLower.includes('11 percent') || speechLower.includes('gyarah')) {
      setChecklist(prev => ({ ...prev, productRate: true }));
    }
    if (speechLower.includes('reducing')) {
      setChecklist(prev => ({ ...prev, reducing: true }));
    }
    if (speechLower.includes('cibil') || speechLower.includes('cibil score') || speechLower.includes('civil')) {
      setChecklist(prev => ({ ...prev, cibil: true }));
    }
    if (speechLower.includes('12') && speechLower.includes('72')) {
      setChecklist(prev => ({ ...prev, tenure: true }));
    }
    if (speechLower.includes('ekyc') || speechLower.includes('vkyc') || speechLower.includes('esign')) {
      setChecklist(prev => ({ ...prev, journey: true }));
    }
    if (speechLower.includes('minute') || speechLower.includes('paperless') || speechLower.includes('maintenance')) {
      setChecklist(prev => ({ ...prev, usps: true }));
    }

    // Fatal Warnings detection
    if (speechLower.includes('guarantee') || speechLower.includes('guaranteed') || speechLower.includes('pakka approve')) {
      const err: FatalError = {
        category: 'False Commitment',
        severity: 'Critical',
        employeeSaid: speech,
        reason: 'Guaranteeing final loan approval without full verification is legally non-compliant.',
        correctResponse: 'Loan approval depends on eligibility matching and document verification.'
      };
      setFatalAlerts(prev => prev.some(e => e.category === err.category) ? prev : [...prev, err]);
    }

    if (speechLower.includes('no processing fee') || speechLower.includes('processing fee nahi')) {
      const err: FatalError = {
        category: 'Incomplete Disclosure',
        severity: 'Critical',
        employeeSaid: speech,
        reason: 'L&T Finance charges processing fees. Claiming zero processing fees violates guidelines (only annual maintenance is zero).',
        correctResponse: 'There are processing charges, but there are zero hidden annual maintenance fees.'
      };
      setFatalAlerts(prev => prev.some(e => e.category === err.category) ? prev : [...prev, err]);
    }
  };

  const triggerCustomerDialogReply = (speech: string) => {
    if (appStateRef.current !== 'connected') return;

    const activePersonaId = selectedPersonaIdRef.current;
    const p = personaDialogues[activePersonaId];
    let replyText = '';

    const activePhase = flowPhaseRef.current;

    if (activePersonaId === 'suresh') {
      switch (activePhase) {
        case 'greeting':
          setFlowPhase('identity');
          replyText = p.identity_confirmed;
          break;
        case 'identity':
          setFlowPhase('language');
          replyText = p.language_checked;
          break;
        case 'language':
          setFlowPhase('disclosure');
          replyText = p.disclosure_heard;
          break;
        case 'disclosure':
          setFlowPhase('objection_rate');
          replyText = p.objection_rate_raised;
          break;
        case 'objection_rate':
          setFlowPhase('reducing_rate');
          replyText = p.reducing_rate_understood;
          break;
        case 'reducing_rate':
          setFlowPhase('proceed_details');
          replyText = p.otp_error;
          break;
        case 'proceed_details':
          setFlowPhase('otp_resolved');
          replyText = p.processing_fees_high;
          break;
        case 'otp_resolved':
          setFlowPhase('fees_resolved');
          replyText = p.address_details;
          break;
        case 'fees_resolved':
          setFlowPhase('address_resolved');
          replyText = p.emandate_failed;
          break;
        case 'address_resolved':
          setFlowPhase('emandate_resolved');
          replyText = p.emandate_resolved;
          // Schedule auto wrap-up hangup call when Jignesh says "Hello."
          conversationEndTimeoutRef.current = setTimeout(() => {
            hangupCall(true);
          }, 3000);
          break;
        default:
          replyText = 'Hello.';
          break;
      }
    } else {
      switch (activePhase) {
        case 'greeting':
          setFlowPhase('language');
          replyText = p.opener_heard;
          break;
        case 'language':
          setFlowPhase('disclosure');
          replyText = p.language_checked;
          break;
        case 'disclosure':
          setFlowPhase('objection_tenure');
          replyText = p.disclosure_heard;
          
          setTimeout(() => {
            if (appStateRef.current === 'connected') {
              addMessageToConsole('Customer', p.objection_tenure);
              speakUtterance(p.objection_tenure);
            }
          }, 5000);
          return;
        case 'objection_tenure':
          setFlowPhase('objection_rate');
          replyText = p.objection_rate;
          break;
        case 'objection_rate':
          setFlowPhase('closing');
          replyText = p.closing;
          break;
        case 'closing':
          setFlowPhase('goodbye');
          replyText = p.goodbye;
          // Schedule auto wrap-up hangup call
          conversationEndTimeoutRef.current = setTimeout(() => {
            hangupCall(true);
          }, 3000);
          break;
        default:
          replyText = 'Haan theek hai sir. Main online form complete kar raha hoon.';
          break;
      }
    }

    if (replyText) {
      addMessageToConsole('Customer', replyText);
      speakUtterance(replyText);
    }
  };

  // Hangup call simulator
  const hangupCall = async (naturalComplete = false) => {
    setAppState('ended');
    setCurrentSpeechSubtitle('[Call Ended]');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (synthesisRef.current) synthesisRef.current.cancel();
    
    // Stop active HTML5 generated speech audio playback
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }

    let scorecard = null;
    let scoreVal = 0;
    let feedbackBul = ['Evaluation compile in progress...'];
    let coachingRec = 'No recommendations compiled.';

    // Trigger POST call audit score card compiled report
    try {
      const res = await fetch(`${backendUrl}/qa/complete-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-agent-id-123',
          personaId: selectedPersonaId,
          duration: callDuration,
          transcript: conversation.map(c => ({ speaker: c.speaker, text: c.text })),
          fatalErrors: fatalAlerts.filter(alert => !alert.category.includes('API') && !alert.category.includes('Gaps'))
        })
      });
      const payload = await res.json();
      if (payload.success) {
        const data = payload.data;
        scorecard = data.scorecard;
        scoreVal = data.overallScore;
        feedbackBul = JSON.parse(data.coaching.feedback);
        coachingRec = data.coaching.recommendations;
      } else {
        const local = generateLocalFallbackScorecardData();
        scorecard = local.scorecard;
        scoreVal = local.score;
        feedbackBul = local.feedback;
        coachingRec = local.recs;
      }
    } catch (e) {
      const local = generateLocalFallbackScorecardData();
      scorecard = local.scorecard;
      scoreVal = local.score;
      feedbackBul = local.feedback;
      coachingRec = local.recs;
    }

    setFinalScore(scoreVal);
    setQaScorecard(scorecard);
    setCoachingFeedback(feedbackBul);
    setCoachingRecommendations(coachingRec);

    // Save call record in Screen 2 list
    const newRecord: CallRecord = {
      id: `PL-${Math.floor(1000 + Math.random() * 9000)}`,
      filename: `PL_CALL_${Date.now().toString().slice(-4)}.mp3`,
      durationText: formatTime(callDuration),
      partnerBrand: 'MONEYCONTROL_L&T',
      primaryIntent: 'Personal Loan Process',
      status: 'Ready',
      progressValue: 100,
      sopScore: scoreVal,
      agentName: 'Utkarsh Khairnar',
      complianceState: {
        rates: checklist.productRate ? 'PASS' : 'FAIL',
        fees: fatalAlerts.some(a => a.category === 'Incomplete Disclosure') ? 'FAIL' : 'PASS',
        eligibility: checklist.cibil ? 'PASS' : 'FAIL'
      },
      managerFeedback: scorecard?.summary || 'Standard training log completed.',
      transcript: conversation.map(c => ({ speaker: c.speaker === 'Agent' ? 'Agent' : c.speaker === 'Customer' ? 'Customer' : 'System', text: c.text }))
    };

    setCallRecords(prev => [newRecord, ...prev]);
    setScorecardModalOpen(true);
    fetchDashboardStats(); // refresh dashboard values
  };

  const generateLocalFallbackScorecardData = () => {
    const passedCount = Object.values(checklist).filter(v => v === true).length;
    let score = passedCount * 10;
    if (passedCount === 9) score += 10; // All verified checklist items bonus
    
    const complianceFatals = fatalAlerts.filter(alert => !alert.category.includes('API') && !alert.category.includes('Gaps'));
    if (complianceFatals.length > 0) score = Math.min(score, 45); // Fail cap

    const scorecard = {
      communicationSkills: Math.max(3, Math.round(score / 10)),
      productKnowledge: checklist.productRate && checklist.tenure ? 9 : 5,
      confidence: complianceFatals.length > 0 ? 4 : 8,
      listeningSkills: 8,
      objectionHandling: checklist.usps ? 9 : 4,
      compliance: checklist.opener && checklist.disclosure && complianceFatals.length === 0 ? 10 : 3,
      closingSkills: checklist.journey ? 9 : 5,
      professionalism: complianceFatals.length > 0 ? 5 : 9,
      summary: 'Simulator offline report. The call completed successfully with local evaluation checks.',
      strengths: 'Clear articulation and professional BPO onboarding language preferences check.',
      weaknesses: complianceFatals.length > 0 ? 'Triggered critical fatal commitments or incomplete fee disclosures.' : 'Missed some recommended checklist stages.',
      managerNotes: 'Training completed offline.'
    };

    const feedback = [];
    if (!checklist.opener) feedback.push('Always greet and introduce yourself as Mayuri calling on behalf of Moneycontrol.');
    if (!checklist.disclosure) feedback.push('Legally required to state call quality recording disclaimer.');
    if (complianceFatals.length > 0) {
      complianceFatals.forEach(err => {
        feedback.push(`Fatal Error: ${err.category}. Correction: ${err.correctResponse}`);
      });
    }
    if (feedback.length === 0) feedback.push('Excellent performance, all scripts followed!');
    
    return {
      scorecard,
      score,
      feedback,
      recs: 'Read page 3 of the L&T Finance Product SOP rulebook regarding reducing balance interest rate calculations.'
    };
  };

  // Web speech microphone toggle
  const toggleSpeechMic = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser. Please type in the text field instead.');
      return;
    }
    
    setInputMode(prev => {
      const next = prev === 'voice' ? 'text' : 'voice';
      if (next === 'voice') {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Speech recognition already active.');
        }
      } else {
        recognitionRef.current.stop();
      }
      return next;
    });
  };

  // SOP Knowledge Base Manager files upload mock helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const uploadSopDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadingDoc(true);
    setSimulatedLog(prev => [...prev, `[INIT] Uploading doc file: ${uploadFile.name}...`]);

    setTimeout(() => {
      setSimulatedLog(prev => [...prev, `[Deepgram] Running speech-to-text / textual parsing...`]);
      
      setTimeout(() => {
        setSimulatedLog(prev => [
          ...prev, 
          `[Gemini] Extracting intents, customer FAQs, objection templates, and compliance scripts...`,
          `[Qdrant] Indexing document chunk vectors to database collection 'bpo_knowledge_base'...`
        ]);

        setTimeout(() => {
          setSimulatedLog(prev => [...prev, `[SUCCESS] Database KB synchronized! Created vector node.`]);
          setKbDocs(prev => [
            {
              id: `doc-${Date.now()}`,
              title: uploadFile.name,
              category: 'SOP Document',
              createdAt: new Date().toLocaleDateString()
            },
            ...prev
          ]);
          setUploadFile(null);
          setUploadingDoc(false);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const renderRadarChart = () => {
    if (!qaScorecard) return null;
    const radarData = [
      { subject: 'Comms', A: qaScorecard.communicationSkills * 10 },
      { subject: 'Product', A: qaScorecard.productKnowledge * 10 },
      { subject: 'Confidence', A: qaScorecard.confidence * 10 },
      { subject: 'Listening', A: qaScorecard.listeningSkills * 10 },
      { subject: 'Objection', A: qaScorecard.objectionHandling * 10 },
      { subject: 'Compliance', A: qaScorecard.compliance * 10 },
      { subject: 'Closing', A: qaScorecard.closingSkills * 10 },
      { subject: 'Profession', A: qaScorecard.professionalism * 10 }
    ];

    return (
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid stroke="#243048" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280' }} />
          <Radar name="Agent Score" dataKey="A" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.4} />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  // Trigger detailed review view for a recording
  const handleReviewCall = (callId: string) => {
    setSelectedCallId(callId);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F19] text-[#F9FAFB]">
      
      {/* Sidebar Navigation */}
      <aside className={`flex flex-col bg-[#111827] border-r border-[#243048]/80 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        
        {/* Header Branding */}
        <div className="flex items-center gap-3 p-5 border-b border-[#243048]/60 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-[#4F46E5]/10 p-2 rounded-xl border border-[#4F46E5]/40 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white leading-none">Costu</h1>
                <span className="text-[9px] text-[#8B5CF6] font-bold uppercase tracking-widest mt-0.5 block">AI Command Center</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800/80 hidden lg:block">
              <Menu className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-6 space-y-1.5">
          <button
            onClick={() => { setActiveTab('home'); setSelectedCallId(null); }}
            className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-sm font-medium tracking-wide transition-all ${
              activeTab === 'home' 
                ? 'bg-[#1D4ED8]/10 border border-[#2563EB]/40 text-[#3B82F6]' 
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-white border border-transparent'
            }`}
          >
            <Home className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Home</span>}
          </button>

          <button
            onClick={() => { setActiveTab('recordings'); setSelectedCallId(null); }}
            className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-sm font-medium tracking-wide transition-all ${
              activeTab === 'recordings' || selectedCallId !== null
                ? 'bg-[#1D4ED8]/10 border border-[#2563EB]/40 text-[#3B82F6]' 
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-white border border-transparent'
            }`}
          >
            <FileAudio className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Recordings</span>}
          </button>

          <button
            onClick={() => { setActiveTab('personas'); setSelectedCallId(null); }}
            className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-sm font-medium tracking-wide transition-all ${
              activeTab === 'personas' 
                ? 'bg-[#1D4ED8]/10 border border-[#2563EB]/40 text-[#3B82F6]' 
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-white border border-transparent'
            }`}
          >
            <Users className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Personas</span>}
          </button>
          
          <button
            onClick={() => { setActiveTab('training'); setSelectedCallId(null); }}
            className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-sm font-medium tracking-wide transition-all ${
              activeTab === 'training' 
                ? 'bg-[#1D4ED8]/10 border border-[#2563EB]/40 text-[#3B82F6]' 
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-white border border-transparent'
            }`}
          >
            <Award className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Training</span>}
          </button>

          <button
            onClick={() => { setActiveTab('analytics'); setSelectedCallId(null); }}
            className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-sm font-medium tracking-wide transition-all ${
              activeTab === 'analytics' 
                ? 'bg-[#1D4ED8]/10 border border-[#2563EB]/40 text-[#3B82F6]' 
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-white border border-transparent'
            }`}
          >
            <TrendingUp className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Analytics</span>}
          </button>

          <button
            onClick={() => { setActiveTab('kb'); setSelectedCallId(null); }}
            className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-sm font-medium tracking-wide transition-all ${
              activeTab === 'kb' 
                ? 'bg-[#1D4ED8]/10 border border-[#2563EB]/40 text-[#3B82F6]' 
                : 'text-gray-400 hover:bg-gray-800/40 hover:text-white border border-transparent'
            }`}
          >
            <BookOpen className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Knowledge Base</span>}
          </button>
        </nav>

        {/* Dynamic bottom action trigger & standard links */}
        <div className="p-4 border-t border-[#243048]/60 space-y-3 bg-[#0E131F]/80">
          {sidebarOpen && (
            <>
              {activeTab === 'training' && (
                <button 
                  onClick={startSimulatorCall}
                  disabled={appState !== 'idle'}
                  className="w-full py-2.5 px-4 bg-[#C7D2FE] hover:bg-[#A5B4FC] text-[#312E81] text-xs font-bold tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" /> New Training Session
                </button>
              )}
              {activeTab === 'recordings' && (
                <button 
                  className="w-full py-2.5 px-4 bg-[#C7D2FE] hover:bg-[#A5B4FC] text-[#312E81] text-xs font-bold tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload Call Logs
                </button>
              )}
              {activeTab === 'analytics' && (
                <button 
                  className="w-full py-2.5 px-4 bg-[#C7D2FE] hover:bg-[#A5B4FC] text-[#312E81] text-xs font-bold tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Assessment
                </button>
              )}
            </>
          )}

          <div className="space-y-1">
            <button className="flex items-center gap-3 w-full px-3 py-2 text-xs text-gray-400 hover:text-white rounded-lg transition-all">
              <Settings className="h-4 w-4" />
              {sidebarOpen && <span>Settings</span>}
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-2 text-xs text-gray-400 hover:text-white rounded-lg transition-all">
              <LogOut className="h-4 w-4" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col overflow-hidden bg-[#0A0D16]">
        
        {/* Global Sub-Branded Topbar */}
        <header className="h-16 border-b border-[#243048]/50 bg-[#111827] flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-4 w-full max-w-xl">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800">
                <Menu className="h-5 w-5" />
              </button>
            )}
            
            {/* Search Input Box */}
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder={
                  activeTab === 'training' ? "Search training scenarios..." : 
                  activeTab === 'recordings' ? "Search loan inquiries..." : "Search loan data..."
                }
                className="w-full bg-[#182030] border border-[#243048]/60 text-xs rounded-xl pl-10 pr-4 py-2.5 text-gray-300 focus:outline-none focus:border-[#4F46E5] placeholder-gray-500"
              />
            </div>
          </div>
          
          {/* Notifications and Profile triggers */}
          <div className="flex items-center gap-5">
            {activeTab === 'training' && appState === 'connected' && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-bold bg-red-950/20 border border-red-500/20 px-3 py-1 rounded-full animate-pulse uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-red-500"></span> SESSION LIVE: {formatTime(callDuration)}
              </span>
            )}
            <button className="text-gray-400 hover:text-white relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#8B5CF6] border-2 border-[#111827]"></span>
            </button>
            <button className="text-gray-400 hover:text-white">
              <HelpCircle className="h-5 w-5" />
            </button>
            
            <div className="h-px w-6 bg-[#243048]"></div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-3">
              <img 
                src="/jignesh.png" 
                alt="Profile" 
                className="h-8 w-8 rounded-full border border-[#243048] object-cover"
                onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop'; }}
              />
              <div className="hidden md:block">
                <h4 className="text-xs font-bold text-white leading-none">Costu Admin</h4>
                <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">Personal Loan Division</span>
              </div>
            </div>
          </div>
        </header>

        {/* View Routing Core */}
        <div className="flex-1 overflow-y-auto">
          
          {/* SCREEN 4: Call Review Detail (Toggled by clicking a list item review) */}
          {selectedCallId !== null ? (
            (() => {
              const record = callRecords.find(r => r.id === selectedCallId) || callRecords[1];
              return (
                <div className="p-8 max-w-6xl mx-auto space-y-6 w-full animate-fadeIn">
                  
                  {/* Back Navigation Bar */}
                  <div className="flex items-center justify-between border-b border-[#243048]/50 pb-4 mb-4">
                    <button 
                      onClick={() => setSelectedCallId(null)}
                      className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-[#182030] px-4 py-2 rounded-xl border border-[#243048]/60 transition-all"
                    >
                      <ArrowLeft className="h-4 w-4" /> Call Review: #{record.id}
                    </button>
                    <span className="px-3.5 py-1 text-[10px] bg-red-950/20 border border-red-500/20 text-red-400 font-bold uppercase rounded-full tracking-wider">
                      Critical Review Required
                    </span>
                  </div>

                  {/* Top QA Score Summary row */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    
                    {/* Radial overall scorecard metric */}
                    <div className="glass-panel p-6 lg:col-span-2 flex flex-col items-center justify-center min-h-[220px]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start">Overall QA Score</span>
                      
                      <div className="relative my-4 flex items-center justify-center h-28 w-28 shrink-0">
                        {/* Custom Tilted Diamond container matching design */}
                        <div className="absolute inset-2 border-2 border-[#8B5CF6] rounded-xl transform rotate-45 flex items-center justify-center shadow-lg bg-[#8B5CF6]/5"></div>
                        <div className="absolute flex flex-col items-center justify-center">
                          <h3 className="text-3xl font-extrabold text-white tracking-tighter font-mono">{record.sopScore} <span className="text-xs text-gray-400 font-normal">/100</span></h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="h-2 w-2 rounded-full bg-[#8B5CF6] animate-pulse"></span>
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Passing Grade • Standard: Moneycontrol</span>
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="glass-panel p-6 lg:col-span-3 grid grid-cols-2 gap-y-4 gap-x-6">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Product Category</span>
                        <span className="text-sm font-bold text-white mt-1 block">Personal Loan</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Agent Name</span>
                        <span className="text-sm font-bold text-white mt-1 block">{record.agentName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Evaluation Framework</span>
                        <span className="text-xs font-semibold text-[#8B5CF6] mt-1 flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5" /> Financial Planning Standard
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Call Duration</span>
                        <span className="text-sm font-bold text-white mt-1 block">{record.durationText} mins</span>
                      </div>
                    </div>

                  </div>

                  {/* Middle row: compliance check indicators */}
                  <div className="glass-panel p-6 space-y-4">
                    <h3 className="font-bold text-xs text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldAlert className="h-4.5 w-4.5 text-red-500" /> Critical Compliance Audit (Fatal Errors)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${record.complianceState.rates === 'PASS' ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-red-950/10 border-red-500/20'}`}>
                        <div className={`p-1 rounded-lg ${record.complianceState.rates === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          <Check className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Interest Rate Accuracy</h4>
                          <span className="text-[10px] text-gray-500 mt-0.5 block">Misrepresenting Interest Rates</span>
                          <span className={`text-[9px] font-extrabold uppercase mt-2 px-2 py-0.5 rounded inline-block ${record.complianceState.rates === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {record.complianceState.rates === 'PASS' ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${record.complianceState.fees === 'PASS' ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-red-950/10 border-red-500/20'}`}>
                        <div className={`p-1 rounded-lg ${record.complianceState.fees === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          <Check className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Fee Transparency</h4>
                          <span className="text-[10px] text-gray-500 mt-0.5 block">Disclosure of Processing Fees</span>
                          <span className={`text-[9px] font-extrabold uppercase mt-2 px-2 py-0.5 rounded inline-block ${record.complianceState.fees === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {record.complianceState.fees === 'PASS' ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${record.complianceState.eligibility === 'PASS' ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-red-950/10 border-red-500/20'}`}>
                        <div className={`p-1 rounded-lg ${record.complianceState.eligibility === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          <Check className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Eligibility Verification</h4>
                          <span className="text-[10px] text-gray-500 mt-0.5 block">Incorrect Eligibility Criteria</span>
                          <span className={`text-[9px] font-extrabold uppercase mt-2 px-2 py-0.5 rounded inline-block ${record.complianceState.eligibility === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {record.complianceState.eligibility === 'PASS' ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: manager notes and coaching targets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Notes detail */}
                    <div className="glass-panel p-6 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-4">Manager Feedback</span>
                      <div className="relative border-l-2 border-[#8B5CF6] pl-4 py-1.5 flex-grow">
                        <p className="text-xs text-gray-300 italic font-medium leading-relaxed">
                          &quot;{record.managerFeedback || 'The agent followed standard compliance protocols. Recommending regular practice to ensure zero hidden fee representations.'}&quot;
                        </p>
                      </div>
                    </div>

                    {/* Courses link lists */}
                    <div className="glass-panel p-6 space-y-4">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Recommended Training</span>
                      
                      <div className="space-y-2">
                        <button className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#243048]/60 hover:bg-[#182030] hover:border-[#4F46E5]/40 transition-all group">
                          <div className="flex items-center gap-3">
                            <BookOpen className="h-4.5 w-4.5 text-[#8B5CF6]" />
                            <span className="text-xs font-bold text-white">Personal Loan EMI Calculation</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-all" />
                        </button>

                        <button className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#243048]/60 hover:bg-[#182030] hover:border-[#4F46E5]/40 transition-all group">
                          <div className="flex items-center gap-3">
                            <BookOpen className="h-4.5 w-4.5 text-[#8B5CF6]" />
                            <span className="text-xs font-bold text-white">Documentation Requirements</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-all" />
                        </button>

                        <button className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#243048]/60 hover:bg-[#182030] hover:border-[#4F46E5]/40 transition-all group">
                          <div className="flex items-center gap-3">
                            <BookOpen className="h-4.5 w-4.5 text-[#8B5CF6]" />
                            <span className="text-xs font-bold text-white">Compliance & Disclosures</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-all" />
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })()
          ) : null}

          {/* SCREEN 1: Training Active Outbound calling Simulator */}
          {activeTab === 'training' && selectedCallId === null && (
            <div className="h-full flex flex-col lg:flex-row p-6 gap-6 max-w-7xl mx-auto w-full animate-fadeIn">
              
              {/* Left Column - Jignesh Rathod portrait metadata */}
              <div className="w-full lg:w-80 space-y-6">
                
                {/* Portrait card details */}
                <div className="glass-panel p-5 text-center flex flex-col items-center">
                  <div className="relative mb-4">
                    <img 
                      src="/jignesh.png" 
                      alt="Jignesh Rathod" 
                      className="h-32 w-32 rounded-2xl border-2 border-red-500/40 object-cover shadow-lg"
                      onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&fit=crop'; }}
                    />
                    <div className="absolute -bottom-2 right-1/2 translate-x-1/2 px-2.5 py-0.5 bg-red-950/80 border border-red-500/40 rounded-full text-[8.5px] font-extrabold text-red-400 tracking-wider">
                      LIVE FEED
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-white">Jignesh Rathod</h3>
                  
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-[8.5px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">HIGH INTENT</span>
                    <span className="text-gray-500 text-xs">/</span>
                    <span className="text-[8.5px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">FRUSTRATED</span>
                  </div>

                  {/* Progress level index */}
                  <div className="w-full mt-4 border-t border-[#243048]/60 pt-4 text-left">
                    <div className="flex items-center justify-between text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                      <span>FRUSTRATION LEVEL</span>
                      <span className="text-red-400">92%</span>
                    </div>
                    <div className="h-2 w-full bg-[#182030] rounded-full mt-2 overflow-hidden border border-[#243048]/40">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  {/* Summary indicators grid */}
                  <div className="grid grid-cols-3 gap-2 w-full mt-5">
                    <div className="p-2 bg-[#182030]/60 rounded-xl border border-[#243048]/50 flex flex-col items-center">
                      <FileAudio className="h-4.5 w-4.5 text-[#3B82F6] mb-1" />
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Loan Need</span>
                      <span className="text-[10px] font-bold text-white mt-0.5">50L</span>
                    </div>
                    <div className="p-2 bg-[#182030]/60 rounded-xl border border-[#243048]/50 flex flex-col items-center">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-500 mb-1" />
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Fee Sensitive</span>
                      <span className="text-[10px] font-bold text-white mt-0.5">High</span>
                    </div>
                    <div className="p-2 bg-[#182030]/60 rounded-xl border border-[#243048]/50 flex flex-col items-center">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-500 mb-1" />
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Credit</span>
                      <span className="text-[10px] font-bold text-white mt-0.5">740+</span>
                    </div>
                  </div>

                </div>

                {/* Scenario details card */}
                <div className="glass-panel p-5 space-y-4">
                  <div>
                    <h4 className="text-[9.5px] font-bold text-gray-500 uppercase tracking-widest">SCENARIO CONTEXT</h4>
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      Jignesh is looking for an instant Personal Loan of up to ₹50 Lakhs. He is specifically agitated about &quot;hidden charges&quot; and &quot;processing fees&quot; he saw in the fine print.
                    </p>
                  </div>

                  <div className="border-t border-[#243048]/60 pt-4">
                    <h5 className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest">Objective:</h5>
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      Explain the interest rate structure (starting 10.99%) and processing fees clearly. Use the EMI Calculator to build trust and address Credit Score impact.
                    </p>
                  </div>
                </div>

              </div>

              {/* Center Panel: calling pads and control panels */}
              <div className="flex-1 flex flex-col gap-6">
                
                {/* Active connection board panel */}
                <div className="glass-panel p-6 flex-1 flex flex-col justify-between min-h-[460px]">
                  
                  {/* Encrypted call tag */}
                  <div className="flex items-center justify-between w-full">
                    <span className="px-3 py-1 bg-[#1E1B4B]/80 border border-[#4338CA]/40 text-[#A5B4FC] text-[8.5px] font-extrabold uppercase rounded-full tracking-wider">
                      ENCRYPTED LINE: LOAN_PL_50L
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                      OUTBOUND SIMULATION
                    </span>
                  </div>

                  {/* Big Call Timer Display */}
                  <div className="flex flex-col items-center py-6">
                    <h2 className="text-5xl font-mono font-extrabold text-white tracking-widest">
                      {appState === 'idle' && '00:00'}
                      {appState === 'dialing' && 'Ringing...'}
                      {appState === 'connected' && formatTime(callDuration)}
                      {appState === 'ended' && 'Call Ended'}
                    </h2>
                    
                    {/* Ringing / connection visual icon */}
                    <div className="relative mt-8">
                      <div className={`h-28 w-28 rounded-full bg-[#182030] border border-[#243048] flex items-center justify-center ${appState === 'dialing' || appState === 'connected' ? 'animate-ring-pulse bg-[#4F46E5]/5 border-[#4F46E5]' : ''}`}>
                        {appState === 'connected' ? (
                          <div className="h-12 flex items-end gap-1">
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="w-1 bg-[#8B5CF6] rounded-full animate-wave-bar" style={{ height: '70%', animationDelay: `${i * 0.15}s` }}></div>
                            ))}
                          </div>
                        ) : (
                          <Phone className={`h-10 w-10 text-gray-500 ${appState === 'dialing' ? 'text-[#8B5CF6]' : ''}`} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subtitle box */}
                  <div className="bg-[#0E1322] border border-[#243048]/60 rounded-xl px-5 py-4 min-h-16 flex items-center justify-center text-center text-xs italic text-gray-300 font-medium leading-relaxed">
                    &quot;{currentSpeechSubtitle}&quot;
                  </div>

                  {/* Control triggers pad */}
                  <div className="border-t border-[#243048]/60 pt-5 mt-4 flex flex-col gap-4">
                    
                    {appState === 'connected' ? (
                      <form onSubmit={handleTextSubmit} className="flex items-center gap-3 w-full">
                        <button
                          type="button"
                          onClick={toggleSpeechMic}
                          className={`p-3.5 rounded-xl border flex items-center justify-center transition-all ${
                            inputMode === 'voice' 
                              ? 'bg-red-600 border-red-600 text-white animate-pulse' 
                              : 'bg-[#182030] border-[#243048]/60 text-gray-400 hover:text-white'
                          }`}
                          title="Toggle Speech Recognition microphone"
                        >
                          {inputMode === 'voice' ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </button>
                        
                        <input
                          type="text"
                          value={speechInput}
                          onChange={(e) => setSpeechInput(e.target.value)}
                          placeholder={inputMode === 'voice' ? "Listening... Speak now or type here" : "Type your compliance script pitch response..."}
                          className="flex-grow bg-[#182030] border border-[#243048]/80 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#4F46E5] text-white"
                        />
                        
                        <button
                          type="submit"
                          className="p-3 bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl text-white flex items-center justify-center shadow-lg transition-all"
                          title="Send script response"
                        >
                          <Send className="h-4.5 w-4.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => hangupCall(false)}
                          className="p-3 bg-red-600 hover:bg-red-700 rounded-xl text-white flex items-center justify-center shadow-lg transition-all"
                          title="End Call and compile scorecard report"
                        >
                          <PhoneOff className="h-4.5 w-4.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex gap-4">
                        {appState === 'idle' ? (
                          <button
                            onClick={startSimulatorCall}
                            className="flex-1 py-3 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all"
                          >
                            <Phone className="h-4.5 w-4.5" /> Initiate Outbound Call
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 py-3 px-6 bg-[#182030] border border-[#243048] text-gray-500 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-3"
                          >
                            <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Dialing Customer...
                          </button>
                        )}
                      </div>
                    )}

                    {/* Quick setting collapse */}
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 px-1">
                      <div className="flex items-center gap-1.5">
                        <span>TTS Engine:</span>
                        <select 
                          value={ttsProvider} 
                          onChange={(e) => setTtsProvider(e.target.value as any)}
                          disabled={appState === 'connected'}
                          className="bg-[#182030] border border-[#243048]/60 text-white rounded-lg px-2 py-0.5 text-[9.5px] font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="google">Google Gemini</option>
                          <option value="elevenlabs">ElevenLabs</option>
                          <option value="openai">OpenAI</option>
                          <option value="browser">Browser Speech</option>
                        </select>
                      </div>
                      {appState === 'connected' && (
                        <button 
                          type="button"
                          onClick={() => hangupCall(false)}
                          className="text-red-400 hover:text-red-300 font-bold uppercase font-mono"
                        >
                          End Call
                        </button>
                      )}
                    </div>

                  </div>

                </div>

              </div>

              {/* Right Column: Transcription lists */}
              <div className="w-full lg:w-96 flex flex-col gap-6">
                
                {/* Live transcription history */}
                <div className="glass-panel p-5 flex-1 flex flex-col justify-between min-h-[460px]">
                  
                  <div>
                    <h3 className="font-bold text-xs text-white tracking-widest uppercase border-b border-[#243048]/60 pb-3 mb-4 flex items-center justify-between">
                      <span>Real-time Transcription</span>
                      <span className="flex items-center gap-1.5 text-[8.5px] font-bold text-red-500 tracking-wider">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-live-dot"></span> LIVE
                      </span>
                    </h3>

                    {/* Scrollable bubble log list */}
                    <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                      {conversation.length > 0 ? (
                        conversation.map((msg, i) => (
                          <div 
                            key={i} 
                            className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
                              msg.speaker === 'Agent' 
                                ? 'bg-[#182030]/80 border-[#243048]/60' 
                                : msg.speaker === 'Customer' 
                                  ? 'bg-[#1E1B4B]/30 border-[#4338CA]/20' 
                                  : 'bg-transparent border-dashed border-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[9px] font-bold tracking-wide uppercase">
                              <span className={msg.speaker === 'Agent' ? 'text-gray-400' : 'text-[#A5B4FC]'}>
                                {msg.speaker === 'Agent' ? 'YOU' : 'JIGNESH RATHOD'}
                              </span>
                              <span className="text-gray-500 font-mono">05:{i.toString().padStart(2, '0')}</span>
                            </div>
                            <p className="text-xs text-gray-300 italic font-medium leading-relaxed mt-1">
                              &quot;{msg.text}&quot;
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-xs text-gray-600 py-16 font-semibold uppercase tracking-wider leading-relaxed">
                          Awaiting connection line to stream voice packets.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Help guideline indicator */}
                  {appState === 'connected' && (
                    <div className="mt-4 p-3.5 bg-[#1E1B4B]/20 border border-[#4338CA]/30 rounded-xl flex gap-3 items-start animate-fadeIn">
                      <Info className="h-4.5 w-4.5 text-[#A5B4FC] shrink-0 mt-0.5" />
                      <div className="text-[10px] text-gray-400 leading-snug">
                        <strong className="text-white">Suggested Script:</strong> Greeting opening should specify starting rate details at exactly 11% p.a. on a reducing basis.
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* SCREEN 2: Loan recordings dashboard queue */}
          {activeTab === 'recordings' && selectedCallId === null && (
            <div className="p-8 max-w-7xl mx-auto space-y-6 w-full animate-fadeIn">
              
              {/* Aggregated KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="glass-panel p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Total Loan Inquiries</span>
                    <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">14,284</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 mt-4 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> +8.2% volume growth
                  </span>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Extracted Loan Intents</span>
                    <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">3,412</h3>
                  </div>
                  <span className="text-xs font-bold text-[#8B5CF6] mt-4 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> 92% Precision Score
                  </span>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between bg-[#1E1B4B]/10 border-[#4338CA]/20">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Portfolio Intelligence</span>
                  <p className="text-xs text-gray-400 mt-2.5 leading-relaxed font-medium">
                    Current analysis focus: interest rate sensitivity and pre-closure patterns across Ring, Prefr, and L&T Finance partner portfolios.
                  </p>
                </div>

              </div>

              {/* Import uploader section */}
              <div className="glass-panel p-6 text-center cursor-pointer hover:bg-[#182030]/20 transition-all border-dashed border-2 border-[#243048]/80 relative bg-[#111827]/40 min-h-[140px] flex flex-col items-center justify-center">
                <Upload className="h-8 w-8 text-gray-500 mb-2" />
                <h4 className="text-sm font-bold text-white">Import Loan Application Recordings</h4>
                <p className="text-xs text-gray-500 mt-1">Bulk upload MP3/WAV files for intent mining and compliance check</p>
                <span className="text-[9px] text-[#8B5CF6] font-bold uppercase tracking-widest mt-2 block">
                  Auto-tagging: Rates, Eligibility, Fees, Pre-closure
                </span>
              </div>

              {/* Extraction Queue Title Header */}
              <div className="flex items-center justify-between border-b border-[#243048]/60 pb-3 mt-4">
                <h3 className="font-extrabold text-sm text-white tracking-wide">
                  Intelligence Extraction Queue
                </h3>
                
                <div className="flex gap-2">
                  <button className="px-3.5 py-1.5 bg-[#182030] hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-bold rounded-xl border border-[#243048]/60 transition-all">
                    Filter Category
                  </button>
                  <button className="px-3.5 py-1.5 bg-[#182030] hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-bold rounded-xl border border-[#243048]/60 transition-all">
                    Export Insights
                  </button>
                </div>
              </div>

              {/* Queue table listings */}
              <div className="glass-panel overflow-hidden border border-[#243048]/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#243048]/60 bg-[#111827]/40 text-gray-500 uppercase tracking-widest text-[9.5px] font-extrabold">
                        <th className="py-4 px-6">Application Audio</th>
                        <th className="py-4 px-4">Partner Brand</th>
                        <th className="py-4 px-4">Primary Intent</th>
                        <th className="py-4 px-4">Analysis Status</th>
                        <th className="py-4 px-6 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243048]/40 text-gray-300 font-medium">
                      {callRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-[#182030]/20 transition-all">
                          <td className="py-4 px-6 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#243048]/40 text-gray-400">
                              <Phone className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white leading-none">{record.filename}</h4>
                              <span className="text-[10px] text-gray-500 block mt-1">{record.primaryIntent} • {record.durationText}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 bg-[#182030] border border-[#243048] rounded-full text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                              {record.partnerBrand}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-semibold text-gray-300">{record.primaryIntent}</span>
                          </td>
                          <td className="py-4 px-4 w-48">
                            {record.status === 'Ready' ? (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                <CheckCircle className="h-4.5 w-4.5" /> Ready
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 uppercase">
                                  <span>{record.status}</span>
                                </div>
                                <div className="h-1.5 w-32 bg-[#182030] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#8B5CF6] rounded-full" style={{ width: `${record.progressValue}%` }}></div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {record.status === 'Ready' ? (
                              <button 
                                onClick={() => handleReviewCall(record.id)}
                                className="p-2 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-lg border border-[#8B5CF6]/30 transition-all"
                                title="Review Call Audit"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            ) : (
                              <button 
                                disabled
                                className="px-3 py-1 bg-gray-800 text-gray-500 text-[10px] font-bold uppercase rounded-lg border border-[#243048] cursor-not-allowed"
                              >
                                Processing
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom split: simulated logs and health indicators */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Simulated live logs log screen */}
                <div className="glass-panel p-5 lg:col-span-2 flex flex-col justify-between min-h-[260px]">
                  <h4 className="font-bold text-xs text-white tracking-widest uppercase border-b border-[#243048]/60 pb-3 mb-4 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-live-dot"></span> Live Intent Extraction Feed
                  </h4>

                  <div className="bg-[#0A0D16] border border-[#243048]/60 rounded-xl p-4 font-mono text-[10.5px] text-[#A5B4FC] space-y-2 flex-grow overflow-y-auto max-h-[180px]">
                    {simulatedLog.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[#8B5CF6] font-bold">&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health indicators index */}
                <div className="glass-panel p-5 space-y-4">
                  <h4 className="font-bold text-xs text-white tracking-widest uppercase border-b border-[#243048]/60 pb-3">
                    Lending Health Index
                  </h4>
                  
                  <div className="space-y-4 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span>Intent Clarity (Rates)</span>
                        <span className="text-white">96.5%</span>
                      </div>
                      <div className="h-2 w-full bg-[#182030] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '96.5%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span>Eligibility Logic Match</span>
                        <span className="text-white">84.2%</span>
                      </div>
                      <div className="h-2 w-full bg-[#182030] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '84.2%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        <span>Fee Transparency Score</span>
                        <span className="text-white">79.1%</span>
                      </div>
                      <div className="h-2 w-full bg-[#182030] rounded-full overflow-hidden">
                        <div className="h-full bg-[#8B5CF6] rounded-full" style={{ width: '79.1%' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Suggestion alert */}
                  <div className="p-3 bg-[#4F46E5]/5 border border-[#4F46E5]/20 rounded-xl flex gap-2.5 items-start mt-2">
                    <Sparkles className="h-4.5 w-4.5 text-[#8B5CF6] shrink-0 mt-0.5" />
                    <div className="text-[10px] text-gray-400 leading-snug">
                      <strong className="text-white block mb-0.5">Optimization Suggestion</strong>
                      Users frequently ask about &apos;Pre-closure terms&apos; after 6 months. Update bot scripts to mention this upfront.
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* SCREEN 3: Analytics dashboard metrics */}
          {activeTab === 'analytics' && selectedCallId === null && (
            <div className="p-8 max-w-7xl mx-auto space-y-6 w-full animate-fadeIn">
              
              {/* Dashboard title header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#243048]/60 pb-4 mb-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white tracking-wide">Personal Loan Training Analytics</h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    Monitoring agent proficiency in eligibility checks (up to ₹50L) and interest rate communication (from 10.99%).
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-[#182030] border border-[#243048] rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2">
                    This Month <ChevronDown className="h-4 w-4" />
                  </button>
                  <button className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold tracking-wider uppercase rounded-xl shadow-lg transition-all">
                    Export Audit
                  </button>
                </div>
              </div>

              {/* Stats aggregates grids */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Interest Rate Accuracy card */}
                <div className="glass-panel p-6 lg:col-span-2 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Interest Rate Accuracy</span>
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-4">
                      <h3 className="text-4xl font-extrabold text-white font-mono">94.2%</h3>
                      <span className="text-xs font-bold text-emerald-400">+1.4%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">Target: 98% (Compliance Benchmark)</p>
                  </div>
                  
                  <div className="w-full border-t border-[#243048]/60 pt-4">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-gray-500">
                      <span>Avg Quoted Rate</span>
                      <span className="text-white">11.25%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#182030] rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Spline Area graph */}
                <div className="glass-panel p-6 lg:col-span-3 min-h-[220px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Eligibility Verification</span>
                      <h4 className="text-sm font-bold text-white mt-1">Application Quality (Up to ₹50 Lakhs)</h4>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-white">
                        <span className="h-2 w-2 rounded-full bg-[#8B5CF6]"></span> Valid Leads
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <span className="h-2 w-2 rounded-full bg-[#EF4444]"></span> Policy Breaches
                      </span>
                    </div>
                  </div>

                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'W1', valid: 30, breach: 5 },
                        { name: 'W2', valid: 45, breach: 8 },
                        { name: 'W3', valid: 55, breach: 4 },
                        { name: 'W4', valid: 70, breach: 9 },
                        { name: 'W5', valid: 60, breach: 6 },
                        { name: 'W6', valid: 90, breach: 3 }
                      ]}>
                        <defs>
                          <linearGradient id="validGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 9 }} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#243048', color: '#FFF' }} />
                        <Area type="monotone" dataKey="valid" name="Valid Leads" stroke="#8B5CF6" fillOpacity={1} fill="url(#validGrad)" />
                        <Line type="monotone" dataKey="breach" stroke="#EF4444" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Bottom split: matrix adherence and benchmarks */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Documentation compliance matrix */}
                <div className="glass-panel p-6 lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#243048]/60 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Documentation Compliance</span>
                      <h4 className="text-xs font-bold text-white mt-1">KYC & Income Proof Adherence</h4>
                    </div>
                    <BookOpen className="h-4.5 w-4.5 text-gray-500" />
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* KYC check tracks */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase w-20 shrink-0">KYC Check</span>
                      <div className="flex gap-1.5 flex-grow justify-between">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className={`h-4.5 w-4.5 rounded-sm ${i === 8 ? 'bg-[#EF4444]/20 border border-red-500/30' : 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/30'}`}></div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase w-20 shrink-0">Income Ver.</span>
                      <div className="flex gap-1.5 flex-grow justify-between">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className={`h-4.5 w-4.5 rounded-sm ${i === 3 ? 'bg-[#EF4444]/30 border border-red-500/50' : 'bg-[#8B5CF6]/30 border border-[#8B5CF6]/50'}`}></div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase w-20 shrink-0">Policy Disc.</span>
                      <div className="flex gap-1.5 flex-grow justify-between">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className={`h-4.5 w-4.5 rounded-sm ${i === 5 ? 'bg-red-500/20 border border-red-500/40' : 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/30'}`}></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Legend guide */}
                  <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 uppercase tracking-widest pt-4 border-t border-[#243048]/60">
                    <span>Low Accuracy</span>
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-sm bg-[#EF4444]/20"></div>
                      <div className="h-2 w-2 rounded-sm bg-[#8B5CF6]/20"></div>
                      <div className="h-2 w-2 rounded-sm bg-[#8B5CF6]/40"></div>
                      <div className="h-2 w-2 rounded-sm bg-[#8B5CF6]/80"></div>
                    </div>
                    <span>High Accuracy</span>
                  </div>

                </div>

                {/* Market benchmarks standard references */}
                <div className="glass-panel p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#243048]/60 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Market Benchmarks</span>
                      <h4 className="text-xs font-bold text-white mt-1">Current Market Trends</h4>
                    </div>
                    <span className="text-[8.5px] font-bold text-gray-500 bg-[#182030] px-2 py-0.5 rounded border border-[#243048]">
                      Source: Moneycontrol
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-[#182030]/60 rounded-xl border border-[#243048]/60">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Starting APR</span>
                      <span className="text-sm font-extrabold text-[#8B5CF6] mt-1.5 block font-mono">10.99%</span>
                    </div>

                    <div className="p-3 bg-[#182030]/60 rounded-xl border border-[#243048]/60">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Max Loan Cap</span>
                      <span className="text-sm font-extrabold text-white mt-1.5 block font-mono">₹50 Lakhs</span>
                    </div>

                    <div className="p-3 bg-[#182030]/60 rounded-xl border border-[#243048]/60">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Processing Fee</span>
                      <span className="text-sm font-extrabold text-white mt-1.5 block font-mono">0.5% - 2.5%</span>
                    </div>

                    <div className="p-3 bg-[#182030]/60 rounded-xl border border-[#243048]/60">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Avg Tenure</span>
                      <span className="text-sm font-extrabold text-white mt-1.5 block font-mono">12-60 Mos</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* HOME Tab (Landing Screen overview) */}
          {activeTab === 'home' && selectedCallId === null && (
            <div className="p-8 max-w-5xl mx-auto text-center space-y-8 animate-fadeIn">
              <div className="relative py-12 flex flex-col items-center">
                <div className="h-20 w-20 rounded-3xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center shadow-lg text-[#8B5CF6] mb-6">
                  <Activity className="h-10 w-10" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Costu AI Agent Training Console
                </h1>
                <p className="mt-4 text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
                  Analyze application transcripts, audit speech compliance metrics, evaluate loan eligibility criteria, and coaching scorecards in real-time.
                </p>
                
                <div className="mt-8 flex justify-center gap-4">
                  <button 
                    onClick={() => setActiveTab('training')}
                    className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold tracking-widest uppercase rounded-xl shadow-lg transition-all"
                  >
                    Launch Simulation Call
                  </button>
                  <button 
                    onClick={() => setActiveTab('recordings')}
                    className="px-6 py-3 bg-[#182030] hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-bold tracking-widest uppercase rounded-xl border border-[#243048] transition-all"
                  >
                    View Completed Recordings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PERSONAS Tab (Viewer list) */}
          {activeTab === 'personas' && selectedCallId === null && (
            <div className="p-8 max-w-5xl mx-auto space-y-6 w-full animate-fadeIn">
              <div className="border-b border-[#243048]/60 pb-3 mb-6">
                <h2 className="text-xl font-extrabold text-white">Applicant Personas</h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">Select a customer persona block to customize the agent calling training simulation.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {personas.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => { setSelectedPersonaId(p.id); setActiveTab('training'); }}
                    className={`glass-panel p-6 cursor-pointer border hover:border-[#8B5CF6]/50 transition-all text-center flex flex-col items-center justify-between min-h-[220px] ${selectedPersonaId === p.id ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' : ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="h-16 w-16 bg-[#182030] rounded-2xl flex items-center justify-center border border-[#243048] text-[#8B5CF6] font-bold text-lg mb-3">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <h3 className="text-sm font-extrabold text-white">{p.name}</h3>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">{p.language} Speaker</p>
                    </div>

                    <div className="border-t border-[#243048]/50 pt-4 mt-4 w-full">
                      <span className="text-[10px] text-gray-400 leading-snug block font-medium">Behavior: {p.behavior}</span>
                      <span className="text-[9px] text-[#8B5CF6] font-bold uppercase tracking-wider mt-2.5 block">Select Persona</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KB Tab (SOP PDF Uploading screen) */}
          {activeTab === 'kb' && selectedCallId === null && (
            <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-fadeIn">
              
              {/* SOP PDF documents uploader */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="glass-panel p-6 flex flex-col justify-between min-h-[300px]">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-wide mb-2 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-[#8B5CF6]" /> Upload SOP & Call Recordings
                    </h3>
                    <p className="text-xs text-gray-400 leading-snug">
                      Ingest bank product documents, SOP files, FAQs, or call recording audios (MP3, WAV, M4A) to parse scenarios and train vector searches.
                    </p>
                  </div>
                  
                  <form onSubmit={uploadSopDoc} className="space-y-5 mt-6">
                    <div className="border-2 border-dashed border-[#243048] hover:border-[#8B5CF6]/50 transition-all rounded-xl p-6 text-center cursor-pointer relative bg-[#111827]/30">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept=".pdf,.mp3,.wav,.m4a,.doc,.txt"
                      />
                      <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                      <span className="text-xs text-gray-300 font-semibold block">
                        {uploadFile ? uploadFile.name : 'Select SOP PDF or call recording'}
                      </span>
                      <span className="text-[10px] text-gray-500 block mt-1">PDF, MP3, WAV, M4A up to 25MB</span>
                    </div>

                    <button
                      type="submit"
                      disabled={!uploadFile || uploadingDoc}
                      className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold tracking-widest uppercase rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingDoc ? 'Ingesting vectors...' : 'Process Document Ingest'}
                    </button>
                  </form>
                </div>

                {/* Pipeline processing log console */}
                <div className="glass-panel p-6 lg:col-span-2 flex flex-col justify-between max-h-[320px]">
                  <h3 className="font-bold text-sm text-white tracking-wide border-b border-[#243048]/60 pb-3 mb-4">
                    Intelligence Engine Processing Log
                  </h3>
                  <div className="bg-[#0E1322] border border-[#243048]/60 rounded-xl p-4 flex-grow overflow-y-auto font-mono text-[10.5px] text-gray-400 space-y-1.5 min-h-[160px] max-h-[220px]">
                    {simulatedLog.length > 0 ? (
                      simulatedLog.map((log, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-[#8B5CF6] font-bold">&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-600 text-center py-10">
                        Awaiting file upload execution logs.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Repositories listing */}
              <div className="glass-panel p-6">
                <h3 className="font-bold text-sm text-white tracking-wide border-b border-[#243048]/60 pb-3 mb-6">
                  Knowledge Base Document Repositories
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#243048]/60 text-gray-500 uppercase tracking-widest text-[9.5px] font-extrabold">
                        <th className="py-3 px-4">Document Title</th>
                        <th className="py-3 px-4">Category Type</th>
                        <th className="py-3 px-4">Indexed Date</th>
                        <th className="py-3 px-4">Qdrant status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243048]/40 text-gray-300 font-medium">
                      <tr>
                        <td className="py-3.5 px-4 font-bold text-white">L and T finance Journey.pdf</td>
                        <td className="py-3.5 px-4">SOP Rulebook</td>
                        <td className="py-3.5 px-4">June 21, 2026</td>
                        <td className="py-3.5 px-4"><span className="px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9.5px] font-bold">Vector Ingested</span></td>
                      </tr>
                      {kbDocs.map((doc) => (
                        <tr key={doc.id}>
                          <td className="py-3.5 px-4 font-bold text-white">{doc.title}</td>
                          <td className="py-3.5 px-4">{doc.category}</td>
                          <td className="py-3.5 px-4">{doc.createdAt}</td>
                          <td className="py-3.5 px-4"><span className="px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9.5px] font-bold">Vector Ingested</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Modal post-call Scorecard overlay */}
      {scorecardModalOpen && qaScorecard && (
        <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="glass-modal w-full max-w-4xl rounded-2xl border border-[#243048]/80 max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Modal header */}
            <div className="p-6 border-b border-[#243048]/60 flex items-center justify-between bg-[#111827]">
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">Outbound Call Performance QA Audit</h3>
                <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest">
                  Moneycontrol L&T Finance Personal Loan Simulation
                </p>
              </div>
              <button 
                onClick={() => setScorecardModalOpen(false)}
                className="px-4 py-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 text-xs font-bold rounded-xl transition-all"
              >
                Close Report
              </button>
            </div>

            {/* Modal body */}
            <div className="p-8 space-y-8 flex-grow overflow-y-auto bg-[#0A0D16]">
              
              {/* Score indicators */}
              <div className="flex flex-col md:flex-row items-center gap-8 bg-[#111827]/40 border border-[#243048]/60 p-6 rounded-2xl">
                
                {/* Radial progress meter */}
                <div className="relative h-32 w-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="54" strokeWidth="6" stroke="#243048" fill="transparent" />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="54" 
                      strokeWidth="8" 
                      stroke={finalScore >= 80 ? '#10B981' : finalScore >= 50 ? '#F59E0B' : '#EF4444'} 
                      fill="transparent" 
                      strokeDasharray={339}
                      strokeDashoffset={339 - (339 * finalScore) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-white tracking-tighter font-mono">{finalScore}%</span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">QA score</span>
                  </div>
                </div>

                <div className="flex-grow space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[#182030]/60 rounded-xl border border-[#243048]/60">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Greeting Adherence</span>
                      <span className={`text-xs font-bold mt-1 block ${checklist.opener ? 'text-emerald-400' : 'text-red-400'}`}>
                        {checklist.opener ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="p-3 bg-[#182030]/60 rounded-xl border border-[#243048]/60">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Consent Verbiage</span>
                      <span className={`text-xs font-bold mt-1 block ${checklist.disclosure ? 'text-emerald-400' : 'text-red-400'}`}>
                        {checklist.disclosure ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="p-3 bg-[#182030]/60 rounded-xl border border-[#243048]/60">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Objections Handled</span>
                      <span className={`text-xs font-bold mt-1 block ${checklist.usps ? 'text-emerald-400' : 'text-red-400'}`}>
                        {checklist.usps ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="p-3 bg-[#182030]/60 rounded-xl border border-[#243048]/60">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Compliance Violations</span>
                      <span className={`text-xs font-bold mt-1 block ${fatalAlerts.filter(alert => !alert.category.includes('API') && !alert.category.includes('Gaps')).length > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                        {fatalAlerts.filter(alert => !alert.category.includes('API') && !alert.category.includes('Gaps')).length > 0 ? `${fatalAlerts.filter(alert => !alert.category.includes('API') && !alert.category.includes('Gaps')).length} Critical errors` : 'None detected'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Critical Compliance & Fatal Errors Section */}
              {fatalAlerts.filter(alert => !alert.category.includes('API') && !alert.category.includes('Gaps')).length > 0 && (
                <div className="border border-red-950 bg-red-950/20 p-6 rounded-2xl space-y-4">
                  <h4 className="font-bold text-xs text-red-400 tracking-widest uppercase flex items-center gap-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-500 animate-pulse" /> Critical SOP & Compliance Violations (Fatal)
                  </h4>
                  <div className="space-y-3">
                    {fatalAlerts.filter(alert => !alert.category.includes('API') && !alert.category.includes('Gaps')).map((err, i) => (
                      <div key={i} className="p-4 bg-red-950/30 border border-red-900/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-red-900/60 border border-red-700/60 text-red-200 text-[8.5px] font-extrabold rounded-md uppercase tracking-wider">
                            {err.category}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">Severity: {err.severity}</span>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-gray-400"><strong className="text-red-300">Agent Said:</strong> &quot;{err.employeeSaid}&quot;</p>
                          <p className="text-gray-400"><strong className="text-red-300">Violation Reason:</strong> {err.reason}</p>
                          <p className="text-gray-300"><strong className="text-emerald-400">Correct Script SOP Response:</strong> {err.correctResponse}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills rating radar & summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Radar performance rating */}
                <div className="bg-[#111827]/40 border border-[#243048]/60 p-5 rounded-2xl flex flex-col items-center">
                  <h4 className="font-bold text-xs text-white tracking-widest uppercase mb-4 self-start">Section Skills ratings</h4>
                  {renderRadarChart()}
                </div>

                {/* Call summaries feedback */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Call Conversation Summary</h4>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">{qaScorecard.summary}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agent Key Strengths</h4>
                    <p className="text-xs text-emerald-400 leading-relaxed font-semibold">{qaScorecard.strengths}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identified weaknesses / gaps</h4>
                    <p className="text-xs text-red-400 leading-relaxed font-semibold">{qaScorecard.weaknesses}</p>
                  </div>
                </div>

              </div>

              {/* Actionable coaching suggestions */}
              <div className="bg-[#4F46E5]/5 border border-[#4F46E5]/20 p-6 rounded-2xl space-y-4">
                <h4 className="font-bold text-xs text-white tracking-widest uppercase flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-[#8B5CF6]" /> AI Agent Coaching Feedback
                </h4>
                
                <div className="space-y-3 pl-1">
                  {coachingFeedback.map((bullet, i) => (
                    <div key={i} className="flex gap-2.5 text-xs text-gray-300 leading-snug">
                      <span className="text-[#8B5CF6] font-bold">•</span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#243048]/60 pt-4 mt-4">
                  <h5 className="text-[9.5px] font-extrabold text-gray-500 uppercase tracking-wider">Recommended SOP Courses:</h5>
                  <p className="text-xs text-gray-300 mt-1 font-medium">{coachingRecommendations}</p>
                </div>
              </div>

            </div>

            {/* Modal actions */}
            <div className="p-6 border-t border-[#243048]/60 flex justify-end gap-4 bg-[#111827]">
              <button
                onClick={() => {
                  setScorecardModalOpen(false);
                  startSimulatorCall();
                }}
                className="px-5 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold tracking-widest uppercase rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Restart Call training
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
