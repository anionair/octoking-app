const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.4-mini";

const state = {
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

function setVoiceButton() {
  const label = state.voiceUnlocked ? "목소리 켜짐" : "목소리 켜기";
  elements.soundToggle.querySelector("span").textContent = state.sound ? label : "목소리 꺼짐";
  elements.soundToggle.setAttribute("aria-label", state.sound ? label : "문어왕 목소리 켜기");
  elements.soundToggle.classList.toggle("ready", state.voiceUnlocked && state.sound);
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
  setOctopusBubble(state.apiKey ? "AI 연결을 저장했어. 이제 정확히 대답해볼게!" : "AI 키가 비어 있어.");
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
        "8~10세 어린이가 이해할 수 있게 쉬운 원리와 예시를 섞어 답한다.",
        "답변 길이는 보통으로, 4~6문장 정도로 답한다.",
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

  unlockVoice(false);
  elements.input.value = "";
  elements.input.style.height = "auto";
  setUserBubble(question);
  setOctopusBubble("생각하는 중...", "thinking");

  try {
    const answer = state.apiKey ? await askChatGpt(question) : localAnswer(question);
    setCurrent({ question, answer, source: state.apiKey ? "chatgpt" : "local" });
    setOctopusBubble(answer, "talking");
    speak(answer, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 연결을 확인해줘.";
    const answer = `AI 연결을 확인해줘. ${message}`;
    setCurrent({ question, answer, source: "local" });
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

function unlockVoice(announce = true) {
  if (!state.sound || !("speechSynthesis" in window)) {
    setOctopusBubble("이 브라우저는 목소리 읽기를 지원하지 않아.");
    return;
  }

  state.voiceUnlocked = true;
  setVoiceButton();

  const text = announce ? "문어왕 목소리가 켜졌어." : "응.";
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.86;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  const voice = pickKoreanVoice();
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  if (announce) {
    setOctopusBubble("문어왕 목소리가 켜졌어.", "talking");
  }
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

function speak(text, force = false) {
  if (!state.sound || !("speechSynthesis" in window) || !text) {
    return;
  }

  if (!state.voiceUnlocked && !force) {
    setOctopusBubble("소리로 들으려면 먼저 '목소리 켜기'를 눌러줘.");
    return;
  }

  const chunks = splitSpeech(text);
  const voice = pickKoreanVoice();
  let index = 0;

  window.speechSynthesis.cancel();

  const speakNext = () => {
    if (index >= chunks.length) {
      elements.stage.classList.remove("talking");
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
      setOctopusBubble("소리가 안 나면 '목소리 켜기'를 한 번 누른 뒤 다시 듣기를 눌러줘.");
    };
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
    setOctopusBubble("듣고 있어.");
  });

  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join("");
    elements.input.value = transcript;
    setUserBubble(transcript);
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
    setOctopusBubble("마이크가 잠깐 조용해졌어. 글자로 물어봐도 좋아.");
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
  if (!state.sound) {
    state.sound = true;
  }
  unlockVoice(true);
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
elements.octoImage.addEventListener("pointerdown", reactToTouch);

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
    ? "이제 질문하면 ChatGPT API로 답할게. 먼저 '목소리 켜기'를 누르면 소리도 들려."
    : "AI 연결 칸에 API 키를 저장하면 질문에 맞춰 답할게. 먼저 '목소리 켜기'를 누르면 소리도 들려.",
  source: state.apiKey ? "chatgpt" : "local",
});
setupSpeechRecognition();

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      setOctopusBubble("앱 설치 준비는 나중에 다시 시도할게.");
    });
  });
}
