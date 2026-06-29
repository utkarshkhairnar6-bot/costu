// Voicely - BPO Customer Simulation & QA Audit Tool Core Logic (Offline Simulator Mode)

const SYSTEM_PROMPTS = {
  suresh: `You are Jignesh Rathod, a realistic customer who has picked up a call from Moneycontrol regarding an L&T Finance Personal Loan inquiry.
You are price-sensitive, inquisitive, and prefer speaking in Hindi or Hinglish.
Your goal is to simulate a phone conversation with a BPO agent training simulator.
Speak EXACTLY like a human on a phone line. Keep your responses short, crisp, and conversational (1-2 sentences max per turn). Never output markdown formatting, bullet points, or lists.

Follow this call flow sequence organically:
1. GREETING/INTRO: The agent calls and greets you, self-introduces, and confirms your name: e.g. "Good morning/afternoon/evening, this is Mayuri calling on behalf of Moneycontrol. Thank you for choosing Moneycontrol. Am I speaking with Mr. Jignesh?"
   Reply naturally confirming your name: "Haan, main Jignesh bol raha hoon. Ji batayein kaun bol raha hai?" (Wait for the agent's next line).
2. LANGUAGE CONSENT: The agent asks in which language you are comfortable (Hindi or English).
   Reply that you prefer Hindi: "English ya Hindi? Hindi mein continue karte hain, comfortable hai."
3. RECORDING VERBIAGE & REASON: The agent must state that the call is recorded for quality/training purposes, and the reason for calling (you started an L&T Finance loan application on Moneycontrol and it's pending).
   Reply acknowledging this: "Haan, recording se koi problem nahi hai. Haan maine application start kiya tha par pending reh gaya. Aage kya karna hoga? Mujhe poori process/journey samjhaiye ki bank account mein paise aane tak kya-kya digital verification steps karne padenge?"
4. TENURE QUERY: If the agent doesn't bring it up, ask: "Mujhe ye batayein ki is loan ko chukane ke liye mujhe kitna time milega? How much time do I get to pay it back?"
5. RATE OBJECTION: Once they explain the tenure, raise the interest rate objection: "Lekin mera bank toh mujhe kam interest rate de raha hai, unka rate starting kam hai. Main L&T Finance kyu choose karoon? Why should I choose L&T?"
6. CLOSING: If the agent pitches the L&T onboarding steps (DigiLocker eKYC, Bank Penny Drop, VKYC Video KYC, eSign, and disbursement in 24-48 hours) and pitches the standard USPs (2-minute approval, 100% paperless, zero hidden annual charges), accept the pitch: "Acha, 100% digital aur 2 minute mein approval hai, zero fees hai, aur e-sign ke baad 24 se 48 ghante mein disbursement ho jata hai? Phir toh theek hai. Main process aage poori karta hoon. Thank you!" and say goodbye.`,

  ramesh: `You are Ramesh Kumar, an impatient and busy customer in a meeting. You prefer speaking in Hinglish.
Keep your responses extremely short, direct, and slightly rushed (1-2 sentences max). Never output markdown, bullet points, or list formatting.

Call flow sequence:
1. GREETING/INTRO: Agent greets you and introduces themselves.
   Reply: "Hello! Jaldi boliye, main ek meeting mein ja raha hoon."
2. LANGUAGE CONSENT: Agent asks for language.
   Reply: "Hinglish chalega. English/Hindi mix. Boliye L&T Finance loan ka kya offer hai?"
3. RECORDING VERBIAGE & REASON: Agent states recording disclaimer and reason (pending application).
   Reply: "Haan haan, record ho raha hai to theek hai. directly point par aaiye, time nahi hai."
4. TENURE QUERY: Ask: "Is loan ko return karne ke liye tenure kitna milega max? How much time do I get to pay it back?"
5. RATE OBJECTION: Object: "But my own bank is offering a lower interest rate, why should I choose L&T?"
6. CLOSING: If they pitch L&T USPs (2-minute approval, 100% digital, zero hidden annual fees), accept: "Theek hai, 2-minute approval aur zero hidden fees hain to ye achi baat hai. Main check karta hoon online." and end call.`,

  priya: `You are Priya Sharma, a polite and detail-oriented customer who prefers English.
Keep responses conversational, polite, and brief (1-2 sentences max). Never output markdown.

Call flow sequence:
1. GREETING/INTRO: Agent greets you.
   Reply: "Hello, Priya here. Who is calling, please?"
2. LANGUAGE CONSENT: Agent asks language.
   Reply: "Yes, English is perfectly fine. Can you explain the details of the L&T Finance Personal Loan?"
3. RECORDING VERBIAGE & REASON: Agent states recording disclaimer and reason.
   Reply: "That's fine, I understand this call is recorded for quality purposes. Please go ahead."
4. TENURE QUERY: Ask: "Okay, so how much time do I get to pay it back? What are the tenure options?"
5. RATE OBJECTION: Object: "Understood. But my own bank is offering a lower interest rate, why should I choose L&T?"
6. CLOSING: If they pitch USPs, accept: "Oh, I see. 100% paperless digital process and 2-minute approval with zero annual fees? That sounds very convenient. I will proceed with this option." and say goodbye.`
};

let localMessages = [];
let useAIResponseMode = false;

// Customer Persona configuration details
const PERSONAS = {
  suresh: {
    name: "Jignesh Rathod",
    details: "Loan Range: ₹10L | Pending application | Price Sensitive",
    language: "Hindi",
    dialogue: {
      connected: "Hello? Haan ji, kaun bol raha hai?",
      opener_heard: "Haan, main Jignesh bol raha hoon. Ji batayein kaun bol raha hai? Oh, Moneycontrol se, Mayuri? Haan ji, boliye.",
      language_checked: "English ya Hindi? Haan, main Hindi mein hi continue karunga, comfortable hai.",
      disclosure_heard: "Theek hai, recording se koi problem nahi hai. Haan, maine L&T Finance ka application form start kiya tha Moneycontrol par par aage pending reh gaya. Batayein aage kya karna hoga?",
      objection_tenure: "Mujhe ye bataiye ki is loan ko chukane ke liye mujhe kitna time milega? How much time do I get to pay it back?",
      objection_rate: "Lekin mera bank toh mujhe kam interest rate de raha hai, unka rate starting kam hai. Main L&T Finance kyu choose karoon? Why should I choose L&T?",
      closing: "Acha, aisi baat hai? 100% digital aur 2 minute mein approval hai, aur koi hidden maintenance fees bhi nahi hai? Phir toh theek hai, main application aage poori kar leta hoon. Thank you!",
      goodbye: "Haan, main website par check kar raha hoon. Thank you, Mayuri. Bye."
    }
  },
  ramesh: {
    name: "Ramesh Kumar",
    details: "Loan Enquiry Range: ₹5L | Busy & Impatient | Strict",
    language: "Hinglish",
    dialogue: {
      connected: "Hello! Jaldi boliye, main ek meeting mein ja raha hoon.",
      opener_heard: "Haan main Ramesh bol raha hoon. Moneycontrol se? Okay. Language? Let's speak in Hinglish, mix is fine. Par jaldi bataiye.",
      language_checked: "Main Hindi aur English mix chalega. Boliye L&T Finance loan ka kya offer hai?",
      disclosure_heard: "Record ho raha hai? Ok ok, directly mudde ki baat par aaiye, time nahi hai.",
      objection_tenure: "Is loan ko return karne ke liye tenure kitna milega max to max? How much time do I get to pay it back?",
      objection_rate: "But my own bank is offering a lower interest rate, why should I choose L&T?",
      closing: "Theek hai, 2-minute digital approval aur zero hidden annual maintenance charges hain to ye achi baat hai. Main isko abhi check karta hoon online. Aage badhaiye process.",
      goodbye: "Ok, thanks for calling. Bye."
    }
  },
  priya: {
    name: "Priya Sharma",
    details: "Loan Enquiry Range: ₹15L | Polite & Detail-oriented",
    language: "English",
    dialogue: {
      connected: "Hello, Priya here. Who is calling, please?",
      opener_heard: "Oh, hi Utkarsh. Yes, I was checking L&T loans on Moneycontrol. Language preference? Yes, English is perfectly fine, or Hindi is also fine. Let's speak in English.",
      language_checked: "Yes, I prefer English. Can you explain the details of the L&T Finance Personal Loan?",
      disclosure_heard: "That's fine, I understand this call is recorded for quality purposes. Please go ahead.",
      objection_tenure: "Okay, so how much time do I get to pay it back? What are the tenure options?",
      objection_rate: "Understood. But my own bank is offering a lower interest rate, why should I choose L&T?",
      closing: "Oh, I see. 100% paperless digital process and 2-minute real-time approval with zero hidden annual maintenance fees? That sounds very convenient. I will proceed with this option.",
      goodbye: "Thank you for the guidance, Utkarsh. Have a nice day. Bye."
    }
  }
};

// Simulation State Machine states
const STATES = {
  IDLE: 'idle',
  DIALING: 'dialing',
  CONNECTED: 'connected',
  OPENER_HEARD: 'opener_heard',
  LANGUAGE_PREFERENCE: 'language_preference',
  RECORDING_DISCLOSURE: 'recording_disclosure',
  ACTIVE_CONVERSATION: 'active_conversation',
  OBJECTION_TENURE_PENDING: 'objection_tenure_pending',
  OBJECTION_RATE_PENDING: 'objection_rate_pending',
  CLOSING: 'closing',
  CALL_ENDED: 'call_ended'
};

// Application State Variables
let appState = STATES.IDLE;
let activePersona = 'suresh';
let callTimerInterval = null;
let callDuration = 0; // in seconds
let isMuted = false;
let inputMode = 'voice'; // 'voice' or 'text'
let conversationLog = [];
let voiceSpeechSynthesis = window.speechSynthesis;
let voiceRecognition = null;
let isListening = false;

// Checklist Tracker
let auditChecklist = {
  opener: false,
  language: false,
  disclosure: false,
  productRate: false,
  reducing: false,
  cibil: false,
  tenure: false,
  usps: false,
  journey: false
};

// Error / Warning Logs
let fatalErrors = [];
let complianceFlags = [];

// Initialize Web Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = false;
  
  // Dynamic language setting based on current dialogue phase
  voiceRecognition.lang = 'en-IN'; // defaults to English Indian
}

// DOM Elements Cache
const elStatusDot = document.getElementById('system-status-dot');
const elStatusText = document.getElementById('system-status-text');
const elPersonaSelect = document.getElementById('persona-select');
const elPhoneUI = document.getElementById('phone-ui');
const elCallerName = document.getElementById('caller-name');
const elCallerDetails = document.getElementById('caller-details');
const elTimerDisplay = document.getElementById('timer-display');
const elBtnDial = document.getElementById('btn-dial');
const elBtnHangup = document.getElementById('btn-hangup');
const elBtnToggleInputMode = document.getElementById('btn-toggle-input-mode');
const elModeIcon = document.getElementById('mode-icon');
const elVoiceInputArea = document.getElementById('voice-input-area');
const elTextInputArea = document.getElementById('text-input-area');
const elBtnMicTrigger = document.getElementById('btn-mic-trigger');
const elVoiceStatusText = document.getElementById('voice-recognition-status');
const elTextResponseInput = document.getElementById('text-response-input');
const elBtnSendText = document.getElementById('btn-send-text');
// Compliance UI
const elLiveComplianceScore = document.getElementById('live-compliance-score');
const elLiveProgressFill = document.getElementById('live-progress-fill');
const elChkOpener = document.getElementById('chk-opener');
const elChkLang = document.getElementById('chk-lang');
const elChkDisclosure = document.getElementById('chk-disclosure');
const elChkProduct = document.getElementById('chk-product');
const elChkReducing = document.getElementById('chk-reducing');
const elChkCibil = document.getElementById('chk-cibil');
const elChkTenure = document.getElementById('chk-tenure');
const elChkUsps = document.getElementById('chk-usps');
const elChkJourney = document.getElementById('chk-journey');
const elLiveAlerts = document.getElementById('live-alerts');
const elLiveSubtitle = document.getElementById('live-subtitle');

// Rulebook DOM Elements
const elRulebookToggle = document.getElementById('rulebook-toggle');
const elRulebookData = document.getElementById('rulebook-data');

// Tips Card DOM Elements
const elTipsBox = document.getElementById('tips-box');
const elTipsTitle = document.getElementById('tips-title');
const elTipsBody = document.getElementById('tips-body');
const elRebuttalScript = document.getElementById('rebuttal-script');

// Audit Modal Elements
const elAuditOverlay = document.getElementById('audit-modal-overlay');
const elAuditRadialProgress = document.getElementById('audit-radial-progress');
const elAuditScoreNumber = document.getElementById('audit-score-number');
const elAuditStatOpening = document.getElementById('audit-stat-opening');
const elAuditStatLanguage = document.getElementById('audit-stat-language');
const elAuditStatRecording = document.getElementById('audit-stat-recording');
const elAuditStatErrors = document.getElementById('audit-stat-errors');
const elAuditTranscriptLogs = document.getElementById('audit-transcript-logs');
const elAuditFeedbackList = document.getElementById('audit-feedback-list');
const elBtnRestartSimulation = document.getElementById('btn-restart-simulation');
const elBtnCloseAudit = document.getElementById('btn-close-audit');

// -------------------------------------------------------------
// Core UI Event Handlers
// -------------------------------------------------------------

// Toggle Rulebook expansion
elRulebookToggle.addEventListener('click', () => {
  const isHidden = elRulebookData.style.display === 'none';
  elRulebookData.style.display = isHidden ? 'flex' : 'none';
  elRulebookToggle.classList.toggle('active', isHidden);
});

// Update selected customer persona metadata
elPersonaSelect.addEventListener('change', () => {
  activePersona = elPersonaSelect.value;
  const p = PERSONAS[activePersona];
  elCallerName.textContent = p.name;
  elCallerDetails.textContent = p.details;
});

// Start simulated call dialing
elBtnDial.addEventListener('click', () => {
  startSimulation();
});

// End call manually
elBtnHangup.addEventListener('click', () => {
  endSimulation(false); // end prematurely
});

// Toggle Voice input vs Text typing
elBtnToggleInputMode.addEventListener('click', () => {
  if (inputMode === 'voice') {
    inputMode = 'text';
    elVoiceInputArea.style.display = 'none';
    elTextInputArea.style.display = 'flex';
    elModeIcon.innerHTML = `<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>`; // Chat bubble icon
    elBtnToggleInputMode.classList.add('active');
  } else {
    inputMode = 'voice';
    elVoiceInputArea.style.display = 'flex';
    elTextInputArea.style.display = 'none';
    elModeIcon.innerHTML = `<use href="#icon-mic"></use>`;
    elBtnToggleInputMode.classList.remove('active');
  }
});

// Send custom text response
elBtnSendText.addEventListener('click', () => {
  handleTextSubmit();
});

elTextResponseInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !elBtnSendText.disabled) {
    handleTextSubmit();
  }
});

// Voice Recognition microphone activation
elBtnMicTrigger.addEventListener('click', () => {
  if (!voiceRecognition) {
    alert("Speech Recognition API is not supported in this browser. Please switch to Text Input mode.");
    return;
  }
  
  if (isListening) {
    voiceRecognition.stop();
  } else {
    startSpeechRecognition();
  }
});

// Restart Call Simulation from modal
elBtnRestartSimulation.addEventListener('click', () => {
  elAuditOverlay.classList.remove('show');
  startSimulation();
});

// Close Audit Report Modal
elBtnCloseAudit.addEventListener('click', () => {
  elAuditOverlay.classList.remove('show');
});

// API key persistence and network TTS utilities removed for pure offline local mode.


// -------------------------------------------------------------
// Speech Engine Logic
// -------------------------------------------------------------

// Make the customer speak via Text-To-Speech (TTS)
async function customerSpeak(text) {
  // End active speech recognition while customer speaks
  if (voiceRecognition && isListening) {
    voiceRecognition.stop();
  }

  // Visually trigger "Talking" rings and waveform animations
  elPhoneUI.classList.add('talking');
  elStatusDot.className = "status-dot active";
  elStatusText.textContent = "Customer Speaking";
  
  if (elLiveSubtitle) {
    elLiveSubtitle.textContent = text;
  }

  localSpeechSynthesisFallback(text);
}

function localSpeechSynthesisFallback(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  const p = PERSONAS[activePersona];
  const voices = voiceSpeechSynthesis.getVoices();
  
  let targetVoice = null;
  if (p.language === 'English') {
    targetVoice = voices.find(v => v.lang.startsWith('en-') && v.name.includes('Google'));
  } else {
    targetVoice = voices.find(v => v.lang.startsWith('hi-') || v.name.includes('Hindi'));
  }

  if (targetVoice) utterance.voice = targetVoice;
  utterance.rate = 1.0;
  
  utterance.onend = () => {
    elPhoneUI.classList.remove('talking');
    elStatusDot.className = "status-dot warning";
    elStatusText.textContent = "Listening";
    
    if (inputMode === 'voice' && appState !== STATES.CALL_ENDED && appState !== STATES.IDLE) {
      setTimeout(startSpeechRecognition, 300);
    }
  };

  utterance.onerror = (err) => {
    console.error("Local TTS Error:", err);
    elPhoneUI.classList.remove('talking');
  };

  voiceSpeechSynthesis.speak(utterance);
}


// Start Speech recognition listening
function startSpeechRecognition() {
  if (!voiceRecognition || isListening) return;

  // Determine speech model language matches
  const p = PERSONAS[activePersona];
  if (p.language === 'English') {
    voiceRecognition.lang = 'en-US';
  } else {
    voiceRecognition.lang = 'hi-IN'; // set Hindi listener
  }

  try {
    voiceRecognition.start();
  } catch (e) {
    console.warn("Recognition start failed: ", e);
  }
}

if (voiceRecognition) {
  voiceRecognition.onstart = () => {
    isListening = true;
    elBtnMicTrigger.classList.add('listening');
    elBtnMicTrigger.innerHTML = `<svg><use href="#icon-mute"></use></svg> Stop`;
    elVoiceStatusText.textContent = "Listening to your response...";
  };

  voiceRecognition.onend = () => {
    isListening = false;
    elBtnMicTrigger.classList.remove('listening');
    elBtnMicTrigger.innerHTML = `<svg><use href="#icon-mic"></use></svg> Talk Now`;
    elVoiceStatusText.textContent = "Click to speak response";
  };

  voiceRecognition.onresult = (event) => {
    const transcriptText = event.results[0][0].transcript;
    console.log("Transcribed Spoken Input: ", transcriptText);
    processAgentResponse(transcriptText);
  };

  voiceRecognition.onerror = (e) => {
    console.warn("Speech recognition error: ", e.error);
    if (e.error === 'not-allowed') {
      elVoiceStatusText.textContent = "Microphone access blocked. Toggle text mode.";
    }
  };
}

// Submit manually typed text
function handleTextSubmit() {
  const typedVal = elTextResponseInput.value.trim();
  if (!typedVal) return;
  
  elTextResponseInput.value = '';
  processAgentResponse(typedVal);
}

// -------------------------------------------------------------
// Dialog State Machine & Flow Logic
// -------------------------------------------------------------

// Start dialing process
function startSimulation() {
  // Clear any existing logs
  conversationLog = [];
  fatalErrors = [];
  complianceFlags = [];
  callDuration = 0;
  auditChecklist = { opener: false, language: false, disclosure: false, productRate: false, reducing: false, cibil: false, tenure: false, usps: false, journey: false };
  
  // Initialize offline history
  useAIResponseMode = false;
  localMessages = [
    { role: "system", content: SYSTEM_PROMPTS[elPersonaSelect.value] }
  ];
  
  const statusLabel = document.getElementById("ai-status-label");
  if (statusLabel) {
    statusLabel.textContent = "Local Simulator Mode";
    statusLabel.style.color = "var(--color-success)";
  }

  // Reset UI markers
  resetComplianceUI();
  
  if (elLiveSubtitle) {
    elLiveSubtitle.textContent = "[Dialing Jignesh Rathod...]";
  }
  
  // Transition State
  appState = STATES.DIALING;
  activePersona = elPersonaSelect.value;
  
  elPersonaSelect.disabled = true;
  const elVoiceSelect = document.getElementById('voice-select');
  if (elVoiceSelect) elVoiceSelect.disabled = true;
  elBtnDial.style.display = 'none';
  elBtnHangup.style.display = 'flex';
  
  elPhoneUI.className = "phone-interface ringing";
  elStatusDot.className = "status-dot warning";
  elStatusText.textContent = "Calling...";
  elTimerDisplay.className = "call-timer active";
  elTimerDisplay.textContent = "Ringing";

  // Dynamic coaching card update
  updateTipsCard(
    "SIMULATOR OUTGOING DIAL",
    "Customer is picking up. Open the call professionally using your Moneycontrol agent script immediately.",
    `Greeting: "Good morning/afternoon/evening. This is Mayuri calling on behalf of Moneycontrol. Thank you for choosing Moneycontrol. Am I speaking with Mr. Jignesh?"`
  );

  // Play Dial ring tone or delay for pickup
  setTimeout(() => {
    if (appState === STATES.DIALING) {
      triggerPickup();
    }
  }, 2500);
}

// Trigger call connected
function triggerPickup() {
  appState = STATES.CONNECTED;
  elPhoneUI.className = "phone-interface";
  elStatusDot.className = "status-dot active";
  elStatusText.textContent = "Call Active";
  
  // Active Timer counting
  elTimerDisplay.textContent = "00:00";
  callDuration = 0;
  callTimerInterval = setInterval(() => {
    callDuration++;
    const minutes = Math.floor(callDuration / 60).toString().padStart(2, '0');
    const seconds = (callDuration % 60).toString().padStart(2, '0');
    elTimerDisplay.textContent = `${minutes}:${seconds}`;
  }, 1000);

  // Enable Inputs
  elTextResponseInput.disabled = false;
  elBtnSendText.disabled = false;

  // Customer connected speech introduction
  const greetingText = PERSONAS[activePersona].dialogue.connected;
  logMessage("Customer", greetingText);
  customerSpeak(greetingText);

  // Prompt Coaching Tip
  updateTipsCard(
    "AGENT SCRIPT ADHERENCE",
    "The customer has picked up the call. State the official introduction script now to secure compliance credits.",
    `Script opener: "Good morning/afternoon/evening. This is Mayuri calling on behalf of Moneycontrol. Thank you for choosing Moneycontrol. Am I speaking with Mr. Jignesh?"`
  );
}

// Process the input statement from the agent
function processAgentResponse(rawText) {
  logMessage("Agent (You)", rawText);
  
  // Perform QA audit on raw string
  evaluateComplianceAndRules(rawText);
  
  // Update Live compliance bar progress
  updateLiveScore();

  // If simulation is ended hidden token is sent
  if (rawText.toUpperCase().includes("END_SIMULATION")) {
    endSimulation(true);
    return;
  }

  // Conversation State Machine Transitions
  setTimeout(() => {
    generateCustomerReply(rawText);
  }, 1200);
}

// Generate dialogue answers based on agent speech and current state
async function generateCustomerReply(agentSpeech) {
  const speechNormalized = agentSpeech.toLowerCase();
  const p = PERSONAS[activePersona];
  
  // Update co-pilot tips dynamically based on audit checklist
  updateCoPilotTips();

  const replyText = getLocalScriptReply(speechNormalized, p);

  // Speak and log response
  if (replyText) {
    logMessage("Customer", replyText);
    customerSpeak(replyText);
  }
}

// Local script dialogue generator fallback
function getLocalScriptReply(speechNormalized, p) {
  let replyText = "";
  switch (appState) {
    case STATES.CONNECTED:
      appState = STATES.OPENER_HEARD;
      replyText = p.dialogue.opener_heard;
      break;

    case STATES.OPENER_HEARD:
      appState = STATES.LANGUAGE_PREFERENCE;
      replyText = p.dialogue.language_checked;
      break;

    case STATES.LANGUAGE_PREFERENCE:
      appState = STATES.RECORDING_DISCLOSURE;
      replyText = p.dialogue.disclosure_heard;
      setTimeout(() => {
        appState = STATES.OBJECTION_TENURE_PENDING;
        const qTenure = p.dialogue.objection_tenure;
        logMessage("Customer", qTenure);
        customerSpeak(qTenure);
      }, 3000);
      return ""; // Handled within timeout, skip direct return

    case STATES.OBJECTION_TENURE_PENDING:
      appState = STATES.OBJECTION_RATE_PENDING;
      replyText = p.dialogue.objection_rate;
      break;

    case STATES.OBJECTION_RATE_PENDING:
      appState = STATES.CLOSING;
      replyText = p.dialogue.closing;
      break;

    case STATES.CLOSING:
      appState = STATES.CALL_ENDED;
      replyText = p.dialogue.goodbye;
      setTimeout(() => {
        endSimulation(true);
      }, 2500);
      break;

    default:
      replyText = "The call is connecting. Please stand by.";
      break;
  }
  return replyText;
}


// Update the dynamic co-pilot tips card on the Advisor panel
function updateCoPilotTips() {
  if (!auditChecklist.opener) {
    updateTipsCard(
      "AGENT SCRIPT ADHERENCE",
      "Greet the customer professionally. Intro: calling on behalf of Moneycontrol. Right party check: Am I speaking with Mr. Jignesh?",
      `Script: "Good morning/afternoon/evening. This is Mayuri calling on behalf of Moneycontrol. Thank you for choosing Moneycontrol. Am I speaking with Mr. Jignesh?"`
    );
  } else if (!auditChecklist.language) {
    updateTipsCard(
      "LANGUAGE CONSENT",
      "Confirm preferred language choices with the customer.",
      `Language check: "Sir, In which Language are you comfortable Hindi or English ?"`
    );
  } else if (!auditChecklist.disclosure) {
    updateTipsCard(
      "RECORDING CONSENT & REASON FOR CALLING",
      "Provide quality recording disclaimer and mention pending L&T Finance loan application reason.",
      `Script: "Sir, aage proceed karne se pehle main aapko inform karna chahungi ki yeh call quality aur training purposes ke liye record ki ja rahi hai. Sir, main dekh pa rahi hoon ki aapne Moneycontrol ke through L&T Finance ka loan application process start kiya tha. Kisi wajah se aapka application process complete nahi ho paya aur abhi pending hai."`
    );
  } else if (!auditChecklist.tenure) {
    updateTipsCard(
      "PRODUCT QUERY: TENURE LIMITS",
      "Customer is inquiring about L&T Finance loan terms. Be ready to explain tenure limits (12 to 72 months flexible terms).",
      `Rulebook: "L&T Finance flexible tenure ranges from 12 months to 72 months max."`
    );
  } else if (!auditChecklist.usps) {
    updateTipsCard(
      "OBJECTION HANDLING: COMPETITIVE RATE",
      "Customer objects that their own bank has a lower rate. Pitch the L&T USPs: 100% paperless, 2-minute real-time digital approval, zero annual maintenance fees.",
      `Rebuttal: "L&T Finance offers a 100% paperless digital process and 2-minute real-time approval with zero hidden annual maintenance charges."`
    );
  } else {
    updateTipsCard(
      "CONCLUDING SIMULATION CALL",
      "Offer final assistance, confirm application status, and end call professionally.",
      `Closing script: "Aapka loan application online status processing mein hai, thank you for choosing Moneycontrol."`
    );
  }
}

// -------------------------------------------------------------
// Silent Auditor QA Monitor Engine
// -------------------------------------------------------------

function evaluateComplianceAndRules(text) {
  const speech = text.toLowerCase();

  // 1. Greet / Introduces representing Moneycontrol & Right Party Confirmation
  if (!auditChecklist.opener) {
    const hasMoneycontrol = speech.includes("moneycontrol");
    const hasName = speech.includes("jignesh");
    const hasGreetingIntro = speech.includes("morning") || speech.includes("afternoon") || speech.includes("evening") || speech.includes("calling") || speech.includes("this is") || speech.includes("thank you");
    
    if (hasMoneycontrol && hasName && hasGreetingIntro) {
      auditChecklist.opener = true;
      markChecklistItemPassed(elChkOpener);
    }
  }

  // 2. Language Consent Check
  if (!auditChecklist.language) {
    const hasLangKeywords = speech.includes("language") || speech.includes("comfortable") || speech.includes("bhasha") || 
      speech.includes("hindi") || speech.includes("english") || speech.includes("preferred");
      
    if (hasLangKeywords) {
      auditChecklist.language = true;
      markChecklistItemPassed(elChkLang);
    }
  }

  // 3. Recording Consent & Reason for Calling Check
  if (!auditChecklist.disclosure) {
    const hasDisclosure = speech.includes("record") || speech.includes("recording") || speech.includes("quality") || speech.includes("training") || speech.includes("purposes");
    const hasReason = speech.includes("pending") || speech.includes("complete") || speech.includes("l&t") || speech.includes("application");
    
    if (hasDisclosure && hasReason) {
      auditChecklist.disclosure = true;
      markChecklistItemPassed(elChkDisclosure);
    }
  }

  // 4. Starting Loan Rate 11% Mention
  if (!auditChecklist.productRate) {
    const hasRate = speech.includes("11%") || speech.includes("11 percent") || speech.includes("gyarah") || speech.includes("11 pratishat");
    
    // Check Compliance Flag: Guaranteed disbursement
    const isGuaranteedText = speech.includes("guarantee") || speech.includes("guaranteed") || speech.includes("disbursement guaranteed") || 
      speech.includes("pakka mil jayega") || speech.includes("definitely approved");
      
    if (isGuaranteedText) {
      triggerFatalError("COMPLIANCE VIOLATION", "Guaranteeing final loan disbursement without verification details.");
    }

    if (hasRate) {
      auditChecklist.productRate = true;
      markChecklistItemPassed(elChkProduct);
    }
  }

  // Reducing Rate check
  if (!auditChecklist.reducing) {
    const hasReducing = speech.includes("reducing") || speech.includes("ghat-te") || speech.includes("ghat-ta") || speech.includes("reducing balance") || speech.includes("reducing basis");
    if (hasReducing) {
      auditChecklist.reducing = true;
      markChecklistItemPassed(elChkReducing);
    }
  }

  // CIBIL and Eligibility check
  if (!auditChecklist.cibil) {
    const hasCibil = speech.includes("cibil") || speech.includes("civil") || speech.includes("income") || speech.includes("obligation") || speech.includes("obligations") || speech.includes("salary") || speech.includes("profile");
    if (hasCibil) {
      auditChecklist.cibil = true;
      markChecklistItemPassed(elChkCibil);
    }
  }

  // L&T Onboarding Journey check
  if (!auditChecklist.journey) {
    const keywords = ["ekyc", "digilocker", "otp", "penny drop", "pennydrop", "vkyc", "video kyc", "video call", "esign", "e-sign", "digital sign", "disbursement", "disburse", "24 to 48", "24-48", "24 se 48", "24 se 48 ghante"];
    let matchCount = 0;
    keywords.forEach(kw => {
      if (speech.includes(kw)) matchCount++;
    });
    if (matchCount >= 3) {
      auditChecklist.journey = true;
      markChecklistItemPassed(elChkJourney);
    }
  }

  // 5. Flexible Tenure 12-72 months check
  if (!auditChecklist.tenure) {
    // Match tenure numbers
    const containsTenureWord = speech.includes("month") || speech.includes("months") || speech.includes("saal") || speech.includes("year") || speech.includes("tenure");
    
    // Detect fatal errors of quoting outside 12-72 months bounds
    const numbersInSpeech = speech.match(/\d+/g);
    if (numbersInSpeech) {
      numbersInSpeech.forEach(numStr => {
        const num = parseInt(numStr, 10);
        // If they quote saal (years), convert to months
        const saalKeywords = ["year", "years", "saal", "varsh"];
        const isSaal = saalKeywords.some(w => speech.includes(w));
        
        const monthEquiv = isSaal ? num * 12 : num;
        
        if (monthEquiv > 0 && (monthEquiv < 12 || monthEquiv > 72)) {
          triggerFatalError("WRONG PRODUCT INFO", `Quoting interest tenure limits (${num} ${isSaal ? 'yrs' : 'months'}) outside 12-72 months bounds.`);
        }
      });
    }

    const hasTenureValid = (speech.includes("12") && speech.includes("72")) || 
      (speech.includes("1") && speech.includes("6") && (speech.includes("year") || speech.includes("saal")));
      
    if (hasTenureValid && containsTenureWord) {
      auditChecklist.tenure = true;
      markChecklistItemPassed(elChkTenure);
    }
  }

  // 6. Pitch USPs: paperless, 2-minute real-time, zero hidden fees
  if (!auditChecklist.usps) {
    const hasUSP1 = speech.includes("2 minute") || speech.includes("2-minute") || speech.includes("real-time") || speech.includes("do minute") || speech.includes("real time");
    const hasUSP2 = speech.includes("paperless") || speech.includes("digital") || speech.includes("bina kagaz");
    const hasUSP3 = speech.includes("maintenance") || speech.includes("hidden fees") || speech.includes("hidden charges") || speech.includes("zero fees");

    // Compliance check: saying "no processing fees" (L&T Finance charges processing fees. Zero fees is only for hidden annual maintenance!).
    if (speech.includes("no processing fees") || speech.includes("processing fees nahi hai") || speech.includes("zero processing fee")) {
      triggerFatalError("COMPLIANCE VIOLATION", "Falsely claiming zero processing fees to hide charges (only annual maintenance fees are zero).");
    }

    if (hasUSP1 || hasUSP2 || hasUSP3) {
      auditChecklist.usps = true;
      markChecklistItemPassed(elChkUsps);
    }
  }
}

// Mark checklist visual node as verified
function markChecklistItemPassed(el) {
  if (!el) return;
  el.classList.add('passed');
  el.classList.remove('failed');
}

// Add Fatal Error alert trigger
function triggerFatalError(type, message) {
  const errorObj = { type, message, time: callDuration };
  
  // Avoid duplicate error logs
  if (fatalErrors.some(e => e.message === message)) return;
  
  fatalErrors.push(errorObj);
  console.error(`FATAL ERROR DETECTED: [${type}] ${message}`);

  // Create Visual Alert on UI
  const alertNode = document.createElement('div');
  alertNode.className = "alert-card fatal";
  alertNode.innerHTML = `
    <svg><use href="#icon-warning"></use></svg>
    <div>
      <strong>FATAL ERROR: ${type}</strong><br>
      ${message}
    </div>
  `;
  elLiveAlerts.prepend(alertNode);
  
  // Make system status indicator blink red
  elStatusDot.className = "status-dot error";
  elStatusText.textContent = "Audit Violation";
}

// Calculate active compliance metric
function calculateCurrentScore() {
  let score = 0;
  if (auditChecklist.opener) score += 10;
  if (auditChecklist.language) score += 10;
  if (auditChecklist.disclosure) score += 10;
  if (auditChecklist.productRate) score += 10;
  if (auditChecklist.reducing) score += 10;
  if (auditChecklist.cibil) score += 10;
  if (auditChecklist.tenure) score += 10;
  if (auditChecklist.usps) score += 10;
  if (auditChecklist.journey) score += 10;

  // Add 10 points bonus if all 9 criteria are satisfied (full standard BPO script adherence!)
  if (auditChecklist.opener && auditChecklist.language && auditChecklist.disclosure && 
      auditChecklist.productRate && auditChecklist.reducing && auditChecklist.cibil && 
      auditChecklist.tenure && auditChecklist.usps && auditChecklist.journey) {
    score += 10;
  }

  // Severe Caps: Fatal errors cap final performance score at 45% (FAIL)
  if (fatalErrors.length > 0) {
    score = Math.min(score, 45);
  }

  return score;
}

// Reset checklist indicators
function resetComplianceUI() {
  const items = [elChkOpener, elChkLang, elChkDisclosure, elChkProduct, elChkReducing, elChkCibil, elChkTenure, elChkUsps, elChkJourney];
  items.forEach(el => {
    if (el) el.className = "checklist-item";
  });
  elLiveAlerts.innerHTML = '';
  updateLiveScore();
}

function updateLiveScore() {
  const score = calculateCurrentScore();
  elLiveComplianceScore.textContent = `${score}%`;
  elLiveProgressFill.style.width = `${score}%`;
}

// -------------------------------------------------------------
// Post-Call Audit Generation (Stage 2)
// -------------------------------------------------------------

function endSimulation(naturalEnding = true) {
  appState = STATES.CALL_ENDED;
  
  // Stop Speech & Recognitions
  if (voiceSpeechSynthesis) voiceSpeechSynthesis.cancel();
  if (voiceRecognition && isListening) voiceRecognition.stop();
  
  // Reset Timer
  clearInterval(callTimerInterval);
  
  // Toggle UI active controls
  elBtnDial.style.display = 'flex';
  elBtnHangup.style.display = 'none';
  elPersonaSelect.disabled = false;
  const elVoiceSelect = document.getElementById('voice-select');
  if (elVoiceSelect) elVoiceSelect.disabled = false;
  elTextResponseInput.disabled = true;
  elBtnSendText.disabled = true;
  
  elPhoneUI.className = "phone-interface";
  elStatusDot.className = "status-dot";
  elStatusText.textContent = "Standby";

  updateTipsCard(
    "SIMULATION ENDED",
    "The BPO call has concluded. Generating compliance audits and agent scorecard report dashboard...",
    "No active prompts."
  );

  // Generate Post-Call Audit Modal Report
  generateAuditDashboard();
}

function generateAuditDashboard() {
  const finalScore = calculateCurrentScore();
  
  // SVG circular loader dashboard metric
  const offset = 440 - (440 * finalScore) / 100;
  elAuditRadialProgress.style.strokeDashoffset = offset;
  elAuditScoreNumber.textContent = `${finalScore}%`;

  // Color coordinate loader metric
  if (finalScore >= 80) {
    elAuditRadialProgress.style.stroke = "var(--color-success)";
  } else if (finalScore >= 50) {
    elAuditRadialProgress.style.stroke = "var(--color-warning)";
  } else {
    elAuditRadialProgress.style.stroke = "var(--color-error)";
  }

  // Stat markers
  elAuditStatOpening.textContent = auditChecklist.opener ? "PASSED" : "FAILED (No introduction)";
  elAuditStatOpening.className = auditChecklist.opener ? "stat-val pass" : "stat-val fail";
  
  elAuditStatLanguage.textContent = auditChecklist.language ? "PASSED" : "FAILED (No preference check)";
  elAuditStatLanguage.className = auditChecklist.language ? "stat-val pass" : "stat-val fail";
  
  elAuditStatRecording.textContent = auditChecklist.disclosure ? "PASSED" : "FAILED (Recording disclosure missed)";
  elAuditStatRecording.className = auditChecklist.disclosure ? "stat-val pass" : "stat-val fail";

  if (fatalErrors.length > 0) {
    elAuditStatErrors.textContent = `YES (${fatalErrors.length} detected)`;
    elAuditStatErrors.className = "stat-val fail";
  } else {
    elAuditStatErrors.textContent = "NO";
    elAuditStatErrors.className = "stat-val pass";
  }

  // Populate Transcript reviewer
  elAuditTranscriptLogs.innerHTML = '';
  conversationLog.forEach(log => {
    const bubble = document.createElement('div');
    const speakerClass = log.speaker.includes("Customer") ? "customer" : "agent";
    bubble.className = `log-bubble ${speakerClass}`;
    bubble.innerHTML = `
      <span class="bubble-speaker">${log.speaker}</span>
      <span class="bubble-text">${log.text}</span>
    `;
    elAuditTranscriptLogs.appendChild(bubble);
  });

  // Populate Feedback & Recommendations list
  elAuditFeedbackList.innerHTML = '';
  
  if (fatalErrors.length > 0) {
    const errorBox = document.createElement('div');
    errorBox.style.background = "rgba(255, 23, 68, 0.05)";
    errorBox.style.border = "1px solid var(--color-error)";
    errorBox.style.borderRadius = "12px";
    errorBox.style.padding = "0.75rem";
    errorBox.style.marginBottom = "0.75rem";
    errorBox.style.color = "#ff8a80";
    
    let errHTML = `<strong>FATAL VIOLATIONS DETECTED:</strong><ul style="padding-left:1rem;margin-top:0.25rem;">`;
    fatalErrors.forEach(err => {
      errHTML += `<li>[${err.type}] ${err.message}</li>`;
    });
    errHTML += `</ul>`;
    errorBox.innerHTML = errHTML;
    elAuditFeedbackList.appendChild(errorBox);
  }

  // Construct recommendations list
  const recList = document.createElement('div');
  let recsHTML = '';
  
  if (!auditChecklist.opener) {
    recsHTML += `<p class="feedback-bullet"><strong>Adhere to Opening Scripts</strong>: You failed to follow the official script. Ensure your intro mentions "calling on behalf of Moneycontrol" and "thank you for choosing Moneycontrol".</p>`;
  }
  if (!auditChecklist.language) {
    recsHTML += `<p class="feedback-bullet"><strong>Verify Language Preference</strong>: Proactively query the customer on whether they prefer English or Hindi to enhance communication.</p>`;
  }
  if (!auditChecklist.disclosure) {
    recsHTML += `<p class="feedback-bullet"><strong>Recording Consent & Reason</strong>: You missed stating the recording disclosure or the reason for calling. For legal compliance, mention "Ye call quality aur training purposes ke liye record ki ja rahi hai." and state that you are calling about the pending L&T Finance loan application.</p>`;
  }
  if (!auditChecklist.productRate) {
    recsHTML += `<p class="feedback-bullet"><strong>Accurate Loan Rate Quotation</strong>: Introduce starting interest rates accurately at 11% p.a. without implying guarantees.</p>`;
  }
  if (!auditChecklist.reducing) {
    recsHTML += `<p class="feedback-bullet"><strong>Explain Reducing Rate Basis</strong>: When competitive interest rate queries are raised, explicitly clarify that L&T's rate starting at 11% is calculated on a reducing balance basis ("reducing basis").</p>`;
  }
  if (!auditChecklist.cibil) {
    recsHTML += `<p class="feedback-bullet"><strong>State CIBIL &amp; Eligibility Factors</strong>: Always mention that the final rate is customizable depending on the applicant's CIBIL score, income profile, and other financial obligations.</p>`;
  }
  if (!auditChecklist.tenure) {
    recsHTML += `<p class="feedback-bullet"><strong>Explain Tenure Limits</strong>: Customer asked about loan timelines. Explicitly quote the 12 to 72 months flexible tenure limits.</p>`;
  }
  if (!auditChecklist.usps) {
    recsHTML += `<p class="feedback-bullet"><strong>Handle Interest Rate Objections</strong>: Pitch L&T USPs when competitive bank rates are raised. Highlight "2-minute real-time approval", "100% digital paperless workflow", and "zero annual maintenance fees".</p>`;
  }
  if (!auditChecklist.journey) {
    recsHTML += `<p class="feedback-bullet"><strong>Explain L&T Onboarding Journey</strong>: Customer inquired about next steps. Explicitly outline the onboarding phases (Aadhaar DigiLocker eKYC, Bank Penny Drop verification, Video KYC, eSign agreement, and final disbursement within 24-48 hours).</p>`;
  }

  if (recsHTML === '') {
    recsHTML = `<p style="color:var(--color-success);font-weight:700;">Excellent work! You adhered to all scripts, product rulebooks, and compliance standards perfectly on this call.</p>`;
  }
  
  recList.innerHTML = recsHTML;
  elAuditFeedbackList.appendChild(recList);

  // Render modal layout visible
  elAuditOverlay.classList.add('show');
}

// Helper logging
function logMessage(speaker, text) {
  conversationLog.push({ speaker, text });
}

// Update live advisor tips card
function updateTipsCard(title, body, suggestion) {
  elTipsTitle.innerHTML = `<svg><use href="#icon-bulb"></use></svg> ${title}`;
  elTipsBody.textContent = body;
  elRebuttalScript.textContent = suggestion;
}
