const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const SPEECH_ENDPOINT = "https://api.openai.com/v1/audio/speech";
const TRANSCRIPTION_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_MODEL = "gpt-5.5";
const LEGACY_DEFAULT_MODELS = new Set(["gpt-5.4-mini", "gpt-5.6", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]);
const TTS_MODEL = "gpt-4o-mini-tts";
const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
const VOICE_NAME = "coral";

const storedModel = localStorage.getItem("octoking-openai-model") || "";
const initialModel = !storedModel || LEGACY_DEFAULT_MODELS.has(storedModel) ? DEFAULT_MODEL : storedModel;
if (initialModel !== storedModel) {
  localStorage.setItem("octoking-openai-model", initialModel);
}

const state = {
  sound: true,
  voiceUnlocked: false,
  listening: false,
  holdingMic: false,
  transcribing: false,
  saved: JSON.parse(localStorage.getItem("octoking-saved") || "[]"),
  apiKey: localStorage.getItem("octoking-openai-key") || "",
  model: initialModel,
  micStream: null,
  mediaRecorder: null,
  recorderMimeType: "",
  audioChunks: [],
  audioContext: null,
  currentSource: null,
  lastAudioUrl: "",
  current: {
    question: "",
    answer: "",
    source: "ready",
  },
};

const suggestions = [
  "문어는 왜 다리가 8개야?",
  "바닷물은 왜 짜?",
  "고래는 왜 물고기가 아니야?",
  "심해는 왜 깜깜해?",
  "상어도 잠을 자?",
  "산호는 동물이야?",
  "파도는 왜 생겨?",
  "달은 왜 모양이 바뀌어?",
];

const localAnswers = [
  {
    tags: ["문어", "다리", "팔", "8", "여덟"],
    answer:
      "좋은 질문이야. 문어의 다리처럼 보이는 것은 팔이야. 여덟 팔에는 빨판이 많아서 물건을 붙잡고, 냄새와 맛도 느끼고, 좁은 바위틈도 살필 수 있어.",
  },
  {
    tags: ["바닷물", "짜", "소금", "염분"],
    answer:
      "좋은 질문이야. 바닷물은 강물이 바위와 흙에서 녹여 온 소금 성분이 아주 오랫동안 바다에 모였기 때문에 짜. 물은 증발해도 소금은 바다에 남아.",
  },
  {
    tags: ["고래", "물고기", "포유류", "숨"],
    answer:
      "좋은 질문이야. 고래는 물속에 살지만 물고기가 아니라 포유류야. 아가미가 아니라 허파로 숨 쉬고, 새끼에게 젖을 먹여 키워.",
  },
];

const reactions = [
  { className: "surprise", text: "앗! 갑자기 불렀느냐!" },
  { className: "ink", text: "먹물 발사! 슈우욱!" },
  { className: "dodge", text: "요리조리 피했다!" },
];

const elements = {
  input: document.querySelector("#questionInput"),
  form: document.querySelector("#composer"),
  suggestions: document.querySelector("#suggestions"),
  status: document.querySelector("#statusText"),
  stage: document.querySelector("#octoStage"),
  octoImage: document.querySelector("#octoImage"),
  inkSplash: document.querySelector("#inkSplash"),
  userBubble: document.querySelector("#userBubble"),
  soundToggle: document.querySelector("#soundToggle"),
  micButton: document.querySelector("#micButton"),
  voiceAudio: document.querySelector("#voiceAudio"),
  savedCount: document.querySelector("#savedCount"),
  savedList: document.querySelector("#savedList"),
  clearSaved: document.querySelector("#clearSaved"),
  chatTab: document.querySelector("#chatTab"),
  treasureTab: document.querySelector("#treasureTab"),
  chatPanel: document.querySelector("#chatPanel"),
  treasurePanel: document.querySelector("#treasurePanel"),
  speakAgain: document.querySelector("#speakAgain"),
  saveCurrent: document.querySelector("#saveCurrent"),
  apiPanel: document.querySelector("#apiPanel"),
  apiStatus: document.querySelector("#apiStatus"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  modelInput: document.querySelector("#modelInput"),
  saveApiKey: document.querySelector("#saveApiKey"),
  clearApiKey: document.querySelector("#clearApiKey"),
};

function normalize(text) {
  return text.replace(/\s/g, "").toLowerCase();
}

function setOctopusBubble(text, mode = "") {
  elements.status.textContent = text;
  elements.stage.classList.toggle("thinking", mode === "thinking");
  elements.stage.classList.toggle("talking", mode === "talking");
}

function setUserBubble(text) {
  elements.userBubble.textContent = text || "질문을 말하거나 입력하면 여기에 보여요.";
  elements.userBubble.classList.toggle("has-question", Boolean(text));
}

function markVoiceReady() {
  state.voiceUnlocked = true;
  setVoiceButton();
}

function setVoiceButton() {
  let label = state.voiceUnlocked ? "목소리 켜짐" : "목소리 켜기";
  if (!state.apiKey && !("speechSynthesis" in window)) {
    label = "AI 키 필요";
  }

  elements.soundToggle.querySelector("span").textContent = state.sound ? label : "목소리 꺼짐";
  elements.soundToggle.setAttribute("aria-label", state.sound ? label : "문어왕 목소리 켜기");
  elements.soundToggle.classList.toggle("ready", state.voiceUnlocked && state.sound && Boolean(state.apiKey));
}

function updateApiUi() {
  elements.apiKeyInput.value = state.apiKey;
  elements.modelInput.value = state.model;
  elements.apiStatus.textContent = state.apiKey ? "연결됨" : "설정 필요";
  elements.apiPanel.open = !state.apiKey;
  setVoiceButton();
}

function saveApiSettings() {
  state.apiKey = elements.apiKeyInput.value.trim();
  state.model = elements.modelInput.value.trim() || DEFAULT_MODEL;

  if (state.apiKey) {
    localStorage.setItem("octoking-openai-key", state.apiKey);
  } else {
    localStorage.removeItem("octoking-openai-key");
  }

  localStorage.setItem("octoking-openai-model", state.model);
  updateApiUi();
  setOctopusBubble(state.apiKey ? "AI 연결을 저장했어. 이제 정확히 대답해볼게!" : "AI 키가 비어 있어.");
}

function switchToDefaultModel() {
  state.model = DEFAULT_MODEL;
  localStorage.setItem("octoking-openai-model", state.model);
  updateApiUi();
}

function shouldRetryWithDefaultModel(message) {
  return (
    state.model !== DEFAULT_MODEL &&
    /gpt-5\.6|limited preview|not available|does not exist|unsupported|access/i.test(message)
  );
}

function clearApiSettings() {
  state.apiKey = "";
  localStorage.removeItem("octoking-openai-key");
  updateApiUi();
  setOctopusBubble("AI 연결을 지웠어.");
}

function setCurrent({ question, answer, source = "chatgpt" }) {
  state.current = { question, answer, source };
  setUserBubble(question);
  setOctopusBubble(answer || "무엇이 궁금한가, 선원?");
  elements.saveCurrent.disabled = !answer;
  elements.speakAgain.disabled = !answer;
}

function renderSuggestions() {
  elements.suggestions.innerHTML = "";
  suggestions.forEach((text) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", () => sendQuestion(text));
    elements.suggestions.append(button);
  });
}

function persistSaved() {
  localStorage.setItem("octoking-saved", JSON.stringify(state.saved));
  elements.savedCount.textContent = state.saved.length;
}

function renderSaved() {
  elements.savedCount.textContent = state.saved.length;
  elements.savedList.innerHTML = "";

  if (!state.saved.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "아직 보관한 답변이 없어.";
    elements.savedList.append(empty);
    return;
  }

  state.saved.forEach((item) => {
    const card = document.createElement("article");
    card.className = "saved-card";

    const question = document.createElement("strong");
    question.textContent = item.question;

    const answer = document.createElement("p");
    answer.textContent = item.answer;

    const actions = document.createElement("div");
    actions.className = "message-meta";

    const restore = document.createElement("button");
    restore.className = "mini-action";
    restore.type = "button";
    restore.textContent = "보기";
    restore.addEventListener("click", () => {
      openTab("chat");
      setCurrent({ question: item.question, answer: item.answer, source: item.source || "saved" });
      setOctopusBubble(item.answer);
    });

    const remove = document.createElement("button");
    remove.className = "mini-action";
    remove.type = "button";
    remove.textContent = "삭제";
    remove.addEventListener("click", () => {
      state.saved = state.saved.filter((saved) => saved.id !== item.id);
      persistSaved();
      renderSaved();
    });

    actions.append(restore, remove);
    card.append(question, answer, actions);
    elements.savedList.append(card);
  });
}

function saveCurrent() {
  if (!state.current.answer) {
    setOctopusBubble("먼저 질문을 해줘.");
    return;
  }

  state.saved.unshift({
    id: `saved-${Date.now()}`,
    question: state.current.question,
    answer: state.current.answer,
    source: state.current.source,
  });
  persistSaved();
  renderSaved();
  setOctopusBubble("보관함에 넣었어.");
}

function localAnswer(question) {
  const clean = normalize(question);
  const match = localAnswers.find((item) => item.tags.some((tag) => clean.includes(normalize(tag))));

  if (match) {
    return match.answer;
  }

  return "AI 연결이 아직 안 되어 있어서 정확한 답을 만들기 어려워. AI 연결 칸에 OpenAI API 키를 저장하면 질문에 맞춰 바로 답할게.";
}

function extractResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function askChatGpt(question, retryWithDefault = true) {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.apiKey}`,
    },
    body: JSON.stringify({
      model: state.model,
      instructions: [
        "너는 '문어왕'이라는 친근한 한국어 어린이 설명 선생님이다.",
        "8~10세 어린이가 이해할 수 있게 쉬운 원리와 예시를 섞어 답한다.",
        "답변 길이는 보통으로, 꼭 필요한 내용은 유지하면서 4~6문장 정도로 답한다.",
        "캐릭터 말투는 살리되, 질문과 상관없는 바다 이야기로 돌리지 않는다.",
        "질문에 정확히 답하고, 확실하지 않으면 모른다고 말한다.",
        "개인정보를 묻거나 위험한 행동을 시키는 질문에는 안전하게 거절한다.",
      ].join("\n"),
      input: question,
      max_output_tokens: 420,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error?.message || "AI 연결에 실패했어.";
    if (retryWithDefault && shouldRetryWithDefaultModel(message)) {
      switchToDefaultModel();
      return askChatGpt(question, false);
    }
    throw new Error(message);
  }

  const text = extractResponseText(data);
  if (!text) {
    throw new Error("AI 답변이 비어 있어.");
  }

  return text;
}

async function sendQuestion(rawText) {
  const question = (rawText || elements.input.value).trim();

  if (!question) {
    setOctopusBubble("짧아도 좋아. 질문 한 줄만 던져보게.");
    elements.input.focus();
    return;
  }

  markVoiceReady();
  void primeAudioHardware();
  elements.input.value = "";
  elements.input.style.height = "auto";
  setUserBubble(question);
  setOctopusBubble("생각하는 중...", "thinking");

  try {
    const answer = state.apiKey ? await askChatGpt(question) : localAnswer(question);
    setCurrent({ question, answer, source: state.apiKey ? "chatgpt" : "local" });
    setOctopusBubble(answer, "talking");
    await speak(answer, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 연결을 확인해줘.";
    const answer = `AI 연결을 확인해줘. ${message}`;
    setCurrent({ question, answer, source: "local" });
  }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  return state.audioContext;
}

async function primeAudioHardware() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    await context.resume();
  }
}

function stopCurrentAudio() {
  if (state.currentSource) {
    try {
      state.currentSource.stop();
    } catch {
      // Already stopped.
    }
    state.currentSource = null;
  }

  elements.voiceAudio.pause();
  elements.voiceAudio.removeAttribute("src");
  elements.voiceAudio.load();
}

async function playBlobWithAudioContext(blob) {
  const context = getAudioContext();
  if (!context) {
    throw new Error("AudioContext not available");
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  const buffer = await blob.arrayBuffer();
  const audioBuffer = await context.decodeAudioData(buffer.slice(0));

  return new Promise((resolve, reject) => {
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    source.onended = () => {
      if (state.currentSource === source) {
        state.currentSource = null;
      }
      elements.stage.classList.remove("talking");
      resolve();
    };

    stopCurrentAudio();
    state.currentSource = source;
    elements.stage.classList.add("talking");

    try {
      source.start(0);
    } catch (error) {
      elements.stage.classList.remove("talking");
      reject(error);
    }
  });
}

async function playBlobWithAudioElement(blob) {
  if (state.lastAudioUrl) {
    URL.revokeObjectURL(state.lastAudioUrl);
  }

  state.lastAudioUrl = URL.createObjectURL(blob);
  stopCurrentAudio();
  elements.voiceAudio.src = state.lastAudioUrl;
  elements.voiceAudio.volume = 1;
  elements.voiceAudio.muted = false;
  elements.voiceAudio.playsInline = true;
  elements.stage.classList.add("talking");

  await elements.voiceAudio.play();
  elements.voiceAudio.onended = () => elements.stage.classList.remove("talking");
}

async function speakWithOpenAi(text) {
  const response = await fetch(SPEECH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.apiKey}`,
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: VOICE_NAME,
      input: text.slice(0, 3900),
      instructions: "한국어로 또렷하고 밝게 말해. 어린이에게 설명하는 문어왕 선장처럼 친근하지만 너무 빠르지 않게 말해.",
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || "목소리 만들기에 실패했어.");
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error("목소리 파일이 비어 있어.");
  }

  try {
    await playBlobWithAudioContext(blob);
  } catch {
    await playBlobWithAudioElement(blob);
  }
}

function pickKoreanVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang?.toLowerCase() === "ko-kr") ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("ko")) ||
    voices[0] ||
    null
  );
}

function splitSpeech(text) {
  const chunks = [];
  let current = "";
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?。！？]|[가-힣][다요죠까네])\s+/).filter(Boolean);

  for (const sentence of sentences.length ? sentences : [text]) {
    if ((current + " " + sentence).trim().length > 120 && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = (current + " " + sentence).trim();
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length ? chunks : [text];
}

function speakWithBrowser(text) {
  if (!("speechSynthesis" in window)) {
    return Promise.reject(new Error("이 브라우저는 목소리 읽기를 지원하지 않아."));
  }

  const chunks = splitSpeech(text);
  const voice = pickKoreanVoice();
  let index = 0;

  window.speechSynthesis.cancel();

  return new Promise((resolve, reject) => {
    const speakNext = () => {
      if (index >= chunks.length) {
        elements.stage.classList.remove("talking");
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = "ko-KR";
      utterance.rate = 0.86;
      utterance.pitch = 1.02;
      utterance.volume = 1;
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onstart = () => elements.stage.classList.add("talking");
      utterance.onend = () => {
        index += 1;
        speakNext();
      };
      utterance.onerror = () => {
        elements.stage.classList.remove("talking");
        reject(new Error("브라우저 목소리 재생에 실패했어."));
      };
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  });
}

async function unlockVoice(announce = true) {
  if (!state.sound) {
    state.sound = true;
  }

  markVoiceReady();

  try {
    await primeAudioHardware();
  } catch {
    // The OpenAI MP3 fallback can still work through the audio element.
  }

  if (!announce) {
    return;
  }

  if (!state.apiKey && !("speechSynthesis" in window)) {
    setOctopusBubble("AI 연결에 API 키를 저장하면 문어왕 목소리가 나와.");
    return;
  }

  setOctopusBubble("문어왕 목소리를 켜는 중...", "thinking");
  await speak("문어왕 목소리가 켜졌어.", true);
}

async function speak(text, force = false) {
  if (!state.sound || !text) {
    return;
  }

  if (!state.voiceUnlocked && !force) {
    return;
  }

  try {
    if (state.apiKey) {
      await speakWithOpenAi(text);
      return;
    }

    await speakWithBrowser(text);
  } catch (error) {
    elements.stage.classList.remove("talking");
    if (state.apiKey && "speechSynthesis" in window) {
      try {
        await speakWithBrowser(text);
        return;
      } catch {
        // Show the clearer message below.
      }
    }

    if (force) {
      const message = error instanceof Error ? error.message : "목소리 재생이 막혔어.";
      setOctopusBubble(`목소리 재생을 확인해줘. ${message}`);
    }
  }
}

function canRecordAudio() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

function pickRecorderMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
  return types.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function recordingFileName(mimeType) {
  if (mimeType.includes("mp4")) {
    return "question.mp4";
  }
  if (mimeType.includes("ogg")) {
    return "question.ogg";
  }
  return "question.webm";
}

function setMicRecording(active) {
  state.listening = active;
  elements.micButton.classList.toggle("listening", active);
  elements.micButton.classList.toggle("recording", active);
  elements.micButton.setAttribute("aria-pressed", String(active));
}

async function ensureMicPermission({ quiet = false } = {}) {
  if (!state.apiKey) {
    if (!quiet) {
      setOctopusBubble("마이크 질문은 AI 연결에 API 키를 저장한 뒤 사용할 수 있어.");
    }
    throw new Error("API key required");
  }

  if (!canRecordAudio()) {
    if (!quiet) {
      setOctopusBubble("이 브라우저는 녹음 기능을 지원하지 않아. 휴대폰 기본 브라우저나 크롬으로 열어줘.");
    }
    throw new Error("Audio recording not supported");
  }

  const liveTrack = state.micStream?.getAudioTracks().find((track) => track.readyState === "live");
  if (state.micStream && liveTrack) {
    return state.micStream;
  }

  try {
    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    elements.micButton.classList.add("ready");
    elements.micButton.title = "누르고 있는 동안 말하기";
    return state.micStream;
  } catch (error) {
    if (!quiet) {
      setOctopusBubble("마이크 허용을 눌러줘. 한 번 허용하면 계속 길게 눌러 말할 수 있어.");
    }
    throw error;
  }
}

async function transcribeAudio(blob) {
  const formData = new FormData();
  const mimeType = blob.type || state.recorderMimeType || "audio/webm";
  formData.append("file", blob, recordingFileName(mimeType));
  formData.append("model", TRANSCRIBE_MODEL);
  formData.append("language", "ko");
  formData.append("response_format", "json");

  const response = await fetch(TRANSCRIPTION_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.apiKey}`,
    },
    body: formData,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    throw new Error(data.error?.message || "마이크 말을 글자로 바꾸지 못했어.");
  }

  return (data.text || "").trim();
}

async function handleRecordingStop() {
  const chunks = state.audioChunks.slice();
  const mimeType = state.recorderMimeType || "audio/webm";
  state.audioChunks = [];
  state.mediaRecorder = null;
  setMicRecording(false);

  const blob = new Blob(chunks, { type: mimeType });
  if (blob.size < 1200) {
    setOctopusBubble("조금 더 길게 말해줘. 마이크를 누른 채로 말하고, 끝나면 손을 떼면 돼.");
    return;
  }

  state.transcribing = true;
  elements.micButton.disabled = true;
  setOctopusBubble("말을 글자로 바꾸는 중...", "thinking");

  try {
    const transcript = await transcribeAudio(blob);
    if (!transcript) {
      setOctopusBubble("잘 못 들었어. 마이크를 누른 채로 다시 말해줘.");
      return;
    }

    elements.input.value = transcript;
    setUserBubble(transcript);
    autoGrow();
    await sendQuestion(transcript);
  } catch (error) {
    const message = error instanceof Error ? error.message : "마이크 입력을 확인해줘.";
    setOctopusBubble(`마이크 입력을 확인해줘. ${message}`);
  } finally {
    state.transcribing = false;
    elements.micButton.disabled = false;
  }
}

async function startRecording(event) {
  event.preventDefault();

  if (state.listening || state.transcribing) {
    return;
  }

  state.holdingMic = true;
  markVoiceReady();
  void primeAudioHardware();

  try {
    if (typeof event.pointerId === "number") {
      elements.micButton.setPointerCapture(event.pointerId);
    }
  } catch {
    // Pointer capture is not available in every mobile browser.
  }

  try {
    const stream = await ensureMicPermission();
    if (!state.holdingMic) {
      setOctopusBubble("다시 마이크를 길게 누르고 말해줘.");
      return;
    }

    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.mediaRecorder = recorder;
    state.recorderMimeType = recorder.mimeType || mimeType || "audio/webm";
    state.audioChunks = [];

    recorder.addEventListener("dataavailable", (recordEvent) => {
      if (recordEvent.data?.size) {
        state.audioChunks.push(recordEvent.data);
      }
    });
    recorder.addEventListener("stop", () => {
      void handleRecordingStop();
    });

    recorder.start();
    setMicRecording(true);
    setUserBubble("듣고 있어... 버튼을 떼면 질문할게.");
    setOctopusBubble("마이크 버튼을 누른 채로 말해줘.");
  } catch {
    state.holdingMic = false;
    setMicRecording(false);
  }
}

function stopRecording(event) {
  event?.preventDefault?.();
  state.holdingMic = false;

  if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") {
    return;
  }

  try {
    state.mediaRecorder.stop();
  } catch {
    setMicRecording(false);
  }
}

function releaseMicStream() {
  state.micStream?.getTracks().forEach((track) => track.stop());
  state.micStream = null;
}

function prepareMicrophoneOnStartup() {
  elements.micButton.title = state.apiKey ? "누르고 있는 동안 말하기" : "AI 키 저장 후 마이크 사용";

  if (!state.apiKey || !canRecordAudio() || window.location.protocol === "file:") {
    return;
  }

  window.setTimeout(() => {
    ensureMicPermission({ quiet: true }).catch(() => {
      elements.micButton.title = "처음 사용할 때 마이크 허용을 눌러주세요";
    });
  }, 800);
}

function reactToTouch() {
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  elements.stage.classList.remove("surprise", "ink", "dodge");
  void elements.stage.offsetWidth;
  elements.stage.classList.add(reaction.className);
  setOctopusBubble(reaction.text);

  window.setTimeout(() => {
    elements.stage.classList.remove(reaction.className);
    if (state.current.answer) {
      setOctopusBubble(state.current.answer);
    } else {
      setOctopusBubble("무엇이 궁금한가, 선원?");
    }
  }, 1050);
}

function autoGrow() {
  elements.input.style.height = "auto";
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 130)}px`;
}

function openTab(name) {
  const chat = name === "chat";
  elements.chatTab.classList.toggle("active", chat);
  elements.treasureTab.classList.toggle("active", !chat);
  elements.chatPanel.classList.toggle("active", chat);
  elements.treasurePanel.classList.toggle("active", !chat);
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendQuestion();
});

elements.input.addEventListener("input", () => {
  setUserBubble(elements.input.value.trim());
  autoGrow();
});

elements.soundToggle.addEventListener("click", () => {
  void unlockVoice(true);
});

elements.speakAgain.addEventListener("click", () => {
  void unlockVoice(false).then(() => speak(state.current.answer, true));
});

elements.saveCurrent.addEventListener("click", saveCurrent);
elements.saveApiKey.addEventListener("click", saveApiSettings);
elements.clearApiKey.addEventListener("click", clearApiSettings);
elements.chatTab.addEventListener("click", () => openTab("chat"));
elements.treasureTab.addEventListener("click", () => openTab("treasure"));
elements.octoImage.addEventListener("pointerdown", reactToTouch);

elements.micButton.addEventListener("pointerdown", startRecording);
elements.micButton.addEventListener("pointerup", stopRecording);
elements.micButton.addEventListener("pointercancel", stopRecording);
elements.micButton.addEventListener("lostpointercapture", stopRecording);
elements.micButton.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("pointerup", stopRecording);
window.addEventListener("pagehide", releaseMicStream);

elements.micButton.addEventListener("keydown", (event) => {
  if ((event.key === " " || event.key === "Enter") && !event.repeat) {
    startRecording(event);
  }
});

elements.micButton.addEventListener("keyup", (event) => {
  if (event.key === " " || event.key === "Enter") {
    stopRecording(event);
  }
});

elements.clearSaved.addEventListener("click", () => {
  state.saved = [];
  persistSaved();
  renderSaved();
  setOctopusBubble("보관함을 비웠어.");
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = pickKoreanVoice;
}

renderSuggestions();
renderSaved();
updateApiUi();
setVoiceButton();
setCurrent({
  question: "",
  answer: state.apiKey
    ? "이제 질문하면 ChatGPT API로 답할게. 먼저 '목소리 켜기'를 누르면 문어왕 목소리도 들려."
    : "AI 연결 칸에 API 키를 저장하면 질문에 맞춰 답할게. API 키가 있으면 문어왕 목소리도 나와.",
  source: state.apiKey ? "chatgpt" : "local",
});
prepareMicrophoneOnStartup();

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      setOctopusBubble("앱 설치 준비는 나중에 다시 시도할게.");
    });
  });
}
