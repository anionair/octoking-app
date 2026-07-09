const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.4-mini";

const state = {
  mood: "captain",
  sound: true,
  voiceUnlocked: false,
  listening: false,
  saved: JSON.parse(localStorage.getItem("octoking-saved") || "[]"),
  apiKey: localStorage.getItem("octoking-openai-key") || "",
  model: localStorage.getItem("octoking-openai-model") || DEFAULT_MODEL,
  current: {
    question: "",
    answer: "",
    source: "ready",
  },
};

const moodCopy = {
  captain: "무엇이 궁금한가, 선원?",
  curious: "흠, 이건 내 망원경으로 살펴봐야겠군.",
  brave: "걱정 말게. 깊은 바다도 함께 가면 괜찮다.",
  gentle: "좋아, 천천히 물어봐도 돼.",
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
    mood: "curious",
    answer:
      "문어의 다리처럼 보이는 것은 팔이야. 여덟 팔에는 빨판이 많아서 물건을 붙잡고, 냄새와 맛도 느끼고, 좁은 바위틈도 살필 수 있어.",
  },
  {
    tags: ["바닷물", "짜", "소금", "염분"],
    mood: "captain",
    answer:
      "바닷물은 강물이 바위와 흙에서 녹여 온 소금 성분이 아주 오랫동안 바다에 모였기 때문에 짜. 물은 증발해도 소금은 바다에 남아.",
  },
  {
    tags: ["고래", "물고기", "포유류", "숨"],
    mood: "gentle",
    answer:
      "고래는 물속에 살지만 물고기가 아니라 포유류야. 아가미가 아니라 허파로 숨 쉬고, 새끼에게 젖을 먹여 키워.",
  },
];

const elements = {
  input: document.querySelector("#questionInput"),
  form: document.querySelector("#composer"),
  suggestions: document.querySelector("#suggestions"),
  status: document.querySelector("#statusText"),
  stage: document.querySelector("#octoStage"),
  soundToggle: document.querySelector("#soundToggle"),
  micButton: document.querySelector("#micButton"),
  ageSelect: document.querySelector("#ageSelect"),
  lengthSelect: document.querySelector("#lengthSelect"),
  savedCount: document.querySelector("#savedCount"),
  savedList: document.querySelector("#savedList"),
  clearSaved: document.querySelector("#clearSaved"),
  chatTab: document.querySelector("#chatTab"),
  treasureTab: document.querySelector("#treasureTab"),
  chatPanel: document.querySelector("#chatPanel"),
  treasurePanel: document.querySelector("#treasurePanel"),
  captionKicker: document.querySelector("#captionKicker"),
  captionQuestion: document.querySelector("#captionQuestion"),
  captionAnswer: document.querySelector("#captionAnswer"),
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

function setStatus(text, mode = "") {
  elements.status.textContent = text;
  elements.stage.classList.toggle("thinking", mode === "thinking");
  elements.stage.classList.toggle("talking", mode === "talking");
}

function setMood(mood) {
  state.mood = mood;
  document.querySelectorAll(".mood").forEach((button) => {
    button.classList.toggle("active", button.dataset.mood === mood);
  });
  setStatus(moodCopy[mood]);
}

function updateApiUi() {
  elements.apiKeyInput.value = state.apiKey;
  elements.modelInput.value = state.model;
  elements.apiStatus.textContent = state.apiKey ? "연결됨" : "설정 필요";
  elements.apiPanel.open = !state.apiKey;
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
  setStatus(state.apiKey ? "AI 연결을 저장했어." : "AI 키가 비어 있어.");
}

function clearApiSettings() {
  state.apiKey = "";
  localStorage.removeItem("octoking-openai-key");
  updateApiUi();
  setStatus("AI 연결을 지웠어.");
}

function setCaption({ question, answer, source = "chatgpt" }) {
  state.current = { question, answer, source };
  elements.captionKicker.textContent = source === "chatgpt" ? "ChatGPT 답변" : "문어왕 답변";
  elements.captionQuestion.textContent = question || "질문을 기다리고 있어요";
  elements.captionAnswer.textContent = answer || "바다, 생물, 파도, 심해 이야기를 물어보세요.";
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
      setCaption({ question: item.question, answer: item.answer, source: item.source || "saved" });
      setStatus("보관한 답변을 다시 보여줄게.");
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
    setStatus("먼저 질문을 해줘.");
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
  setStatus("보관함에 넣었어.");
}

function ageInstruction() {
  return {
    small: "5~7세 어린이도 이해할 수 있게 아주 쉬운 말과 짧은 문장으로 답해.",
    middle: "8~10세 어린이가 이해할 수 있게 쉬운 원리와 예시를 섞어 답해.",
    big: "11~13세 어린이가 이해할 수 있게 원인을 차근차근 설명해.",
  }[elements.ageSelect.value];
}

function lengthInstruction() {
  return {
    short: "2~3문장으로 짧게 답해.",
    normal: "4~6문장으로 답해.",
    long: "7~10문장으로 조금 자세히 답해.",
  }[elements.lengthSelect.value];
}

function outputLimit() {
  return {
    short: 220,
    normal: 420,
    long: 720,
  }[elements.lengthSelect.value];
}

function localAnswer(question) {
  const clean = normalize(question);
  const match = localAnswers.find((item) => item.tags.some((tag) => clean.includes(normalize(tag))));

  if (match) {
    return {
      mood: match.mood,
      text: `좋은 질문이야. ${match.answer}`,
    };
  }

  return {
    mood: "gentle",
    text:
      "아직 AI 연결이 안 되어 있어서 정확한 답을 만들기 어려워. AI 연결 칸에 OpenAI API 키를 저장하면 질문에 맞춰 바로 답할게.",
  };
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

async function askChatGpt(question) {
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
        "캐릭터 말투는 살리되, 질문과 상관없는 바다 이야기로 돌리지 않는다.",
        "질문에 정확히 답하고, 확실하지 않으면 모른다고 말한다.",
        "개인정보를 묻거나 위험한 행동을 시키는 질문에는 안전하게 거절한다.",
        ageInstruction(),
        lengthInstruction(),
      ].join("\n"),
      input: question,
      max_output_tokens: outputLimit(),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error?.message || "AI 연결에 실패했어.";
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
    setStatus("짧아도 좋아. 질문 한 줄만 던져보게.");
    elements.input.focus();
    return;
  }

  unlockVoice(false);
  elements.input.value = "";
  elements.input.style.height = "auto";
  setCaption({ question, answer: "생각하는 중...", source: state.apiKey ? "chatgpt" : "local" });
  setStatus("문어왕이 답을 찾는 중...", "thinking");

  try {
    const answer = state.apiKey ? await askChatGpt(question) : localAnswer(question).text;
    const source = state.apiKey ? "chatgpt" : "local";
    const mood = state.apiKey ? "captain" : localAnswer(question).mood;

    setMood(mood);
    setCaption({ question, answer, source });
    setStatus("답을 찾았어.", "talking");
    speak(answer, false);
    window.setTimeout(() => setStatus(moodCopy[state.mood]), 1200);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AI 연결을 확인해줘.";
    setMood("gentle");
    setCaption({
      question,
      answer: `AI 연결을 확인해줘. ${message}`,
      source: "local",
    });
    setStatus("AI 연결을 확인해줘.");
  }
}

function pickKoreanVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang?.toLowerCase().startsWith("ko")) || voices[0] || null;
}

function unlockVoice(announce = true) {
  if (!state.sound || !("speechSynthesis" in window)) {
    return;
  }

  state.voiceUnlocked = true;

  if (!announce) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance("문어왕 목소리가 켜졌어.");
  utterance.lang = "ko-KR";
  utterance.rate = 0.94;
  utterance.pitch = 1.05;
  const voice = pickKoreanVoice();
  if (voice) {
    utterance.voice = voice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  setStatus("문어왕 목소리가 켜졌어.", "talking");
}

function splitSpeech(text) {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？]|[다요죠까네]\.)\s+/)
    .filter(Boolean);
  const chunks = [];
  let current = "";

  for (const sentence of sentences.length ? sentences : [text]) {
    if ((current + " " + sentence).trim().length > 150 && current) {
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

function speak(text, force = false) {
  if (!state.sound || !("speechSynthesis" in window) || !text) {
    return;
  }

  if (!state.voiceUnlocked && !force) {
    setStatus("'다시 듣기'를 누르면 소리로 읽어줄게.");
    return;
  }

  const chunks = splitSpeech(text);
  const voice = pickKoreanVoice();
  let index = 0;

  window.speechSynthesis.cancel();

  const speakNext = () => {
    if (index >= chunks.length) {
      setStatus(moodCopy[state.mood]);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.pitch = 1.07;
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = () => {
      index += 1;
      speakNext();
    };
    utterance.onerror = () => setStatus("'다시 듣기' 버튼을 한 번 눌러줘.");
    setStatus("문어왕이 말하는 중...", "talking");
    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    elements.micButton.disabled = true;
    elements.micButton.title = "이 브라우저는 마이크 입력을 지원하지 않습니다.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.addEventListener("start", () => {
    state.listening = true;
    elements.micButton.classList.add("listening");
    setStatus("듣고 있어.");
  });

  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join("");
    elements.input.value = transcript;
    autoGrow();
    if (event.results[event.results.length - 1].isFinal) {
      sendQuestion(transcript);
    }
  });

  recognition.addEventListener("end", () => {
    state.listening = false;
    elements.micButton.classList.remove("listening");
  });

  recognition.addEventListener("error", () => {
    setStatus("마이크가 잠깐 조용해졌어. 글자로 물어봐도 좋아.");
  });

  elements.micButton.addEventListener("click", () => {
    if (state.listening) {
      recognition.stop();
      return;
    }
    unlockVoice(false);
    recognition.start();
  });
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

document.querySelectorAll(".mood").forEach((button) => {
  button.addEventListener("click", () => setMood(button.dataset.mood));
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendQuestion();
});

elements.input.addEventListener("input", autoGrow);

elements.soundToggle.addEventListener("click", () => {
  state.sound = !state.sound;
  elements.soundToggle.setAttribute("aria-label", state.sound ? "목소리 끄기" : "목소리 켜기");
  elements.soundToggle.style.opacity = state.sound ? "1" : "0.54";
  if (state.sound) {
    unlockVoice(true);
  } else if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    setStatus("목소리를 껐어.");
  }
});

elements.speakAgain.addEventListener("click", () => {
  unlockVoice(false);
  speak(state.current.answer, true);
});

elements.saveCurrent.addEventListener("click", saveCurrent);
elements.saveApiKey.addEventListener("click", saveApiSettings);
elements.clearApiKey.addEventListener("click", clearApiSettings);
elements.chatTab.addEventListener("click", () => openTab("chat"));
elements.treasureTab.addEventListener("click", () => openTab("treasure"));

elements.clearSaved.addEventListener("click", () => {
  state.saved = [];
  persistSaved();
  renderSaved();
  setStatus("보관함을 비웠어.");
});

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = pickKoreanVoice;
}

renderSuggestions();
renderSaved();
updateApiUi();
setMood("captain");
setCaption({
  question: "질문을 기다리고 있어요",
  answer: state.apiKey
    ? "이제 질문하면 ChatGPT API로 답할게요."
    : "AI 연결 칸에 API 키를 저장하면 질문에 맞춰 답할게요.",
  source: state.apiKey ? "chatgpt" : "local",
});
setupSpeechRecognition();

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      setStatus("앱 설치 준비는 나중에 다시 시도할게.");
    });
  });
}
