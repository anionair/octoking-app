const state = {
  mood: "captain",
  sound: true,
  saved: JSON.parse(localStorage.getItem("octoking-saved") || "[]"),
  messages: [],
  listening: false,
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
  "바다는 왜 파란색이야?",
];

const answers = [
  {
    tags: ["문어", "다리", "팔", "8", "여덟"],
    mood: "curious",
    fact: "문어의 팔에는 빨판이 많아서 붙잡기, 맛보기, 살피기를 함께 할 수 있어.",
    answer:
      "문어왕의 여덟 팔은 바위틈을 살피고, 먹이를 붙잡고, 몸을 움직이는 데 아주 좋아. 사람 손처럼 하나씩 따로 움직일 수 있어서 좁은 곳도 능숙하게 탐험하지.",
  },
  {
    tags: ["바닷물", "짜", "소금", "염분"],
    mood: "captain",
    fact: "강물이 오래도록 바위와 흙에서 녹여 온 성분이 바다에 모여.",
    answer:
      "바닷물이 짠 까닭은 소금 성분이 아주 오래 모였기 때문이야. 물은 햇빛을 받으면 하늘로 올라가지만, 소금 성분은 바다에 남아서 짠맛이 계속 쌓여.",
  },
  {
    tags: ["고래", "물고기", "포유류", "숨"],
    mood: "gentle",
    fact: "고래는 아가미가 아니라 허파로 숨 쉬고 새끼에게 젖을 먹여.",
    answer:
      "고래는 물속에 살지만 물고기가 아니라 포유류야. 그래서 물고기처럼 아가미로 숨 쉬지 않고, 물 위로 올라와 숨구멍으로 공기를 마셔.",
  },
  {
    tags: ["심해", "깜깜", "어두", "빛"],
    mood: "brave",
    fact: "깊은 바다에서는 햇빛 대신 생물이 만드는 빛이 반짝이기도 해.",
    answer:
      "심해가 깜깜한 건 햇빛이 물속 깊은 곳까지 잘 내려가지 못해서야. 물은 빛을 조금씩 약하게 만들고, 깊어질수록 파란 빛마저 희미해져.",
  },
  {
    tags: ["상어", "잠", "쉬"],
    mood: "curious",
    fact: "상어 종류마다 쉬는 방법이 다르고, 일부는 움직이면서 쉬어.",
    answer:
      "상어도 쉬어야 해. 다만 사람처럼 누워서 자는 모습과는 달라. 어떤 상어는 천천히 헤엄치며 쉬고, 어떤 상어는 바닥 근처에서 물을 아가미로 보내며 쉬지.",
  },
  {
    tags: ["산호", "산호초", "동물", "돌"],
    mood: "gentle",
    fact: "산호초는 작은 산호 동물들이 오래 쌓아 만든 바다의 마을 같아.",
    answer:
      "산호는 돌처럼 보이지만 사실 작은 동물이야. 아주 작은 산호들이 모여 살면서 단단한 집을 만들고, 그 주변에 물고기와 여러 생물이 함께 살아.",
  },
  {
    tags: ["파도", "바람", "물결"],
    mood: "captain",
    fact: "파도는 물이 통째로 멀리 달려가는 것보다 에너지가 전달되는 움직임에 가까워.",
    answer:
      "파도는 주로 바람이 바다 표면을 밀고 흔들어서 생겨. 바람이 오래, 세게 불수록 물결은 더 커지고 멀리까지 힘을 전해.",
  },
  {
    tags: ["파란", "색", "바다색"],
    mood: "curious",
    fact: "바다는 하늘 색만 비추는 것이 아니라 물이 빛을 흡수하고 흩뜨리는 영향도 받아.",
    answer:
      "바다가 파랗게 보이는 건 빛과 물이 만나는 방식 때문이야. 물은 빨간빛을 더 잘 약하게 만들고, 파란빛은 더 많이 우리 눈에 남아서 바다가 파랗게 느껴져.",
  },
  {
    tags: ["쓰레기", "플라스틱", "오염", "환경"],
    mood: "brave",
    fact: "작은 플라스틱 조각도 바다 생물이 먹이로 착각할 수 있어.",
    answer:
      "바다 쓰레기는 생물이 다치거나 먹이로 착각하게 만들 수 있어. 그래서 쓰레기를 줄이고, 다시 쓰고, 해변에 남기지 않는 일이 바다 친구들을 지키는 힘이 돼.",
  },
];

const elements = {
  messages: document.querySelector("#messages"),
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

function renderMessages() {
  elements.messages.innerHTML = "";
  state.messages.forEach((message) => {
    const bubble = document.createElement("article");
    bubble.className = `message ${message.role}`;

    const paragraph = document.createElement("p");
    paragraph.textContent = message.text;
    bubble.append(paragraph);

    if (message.role === "assistant") {
      const actions = document.createElement("div");
      actions.className = "message-meta";

      const speakButton = document.createElement("button");
      speakButton.className = "mini-action";
      speakButton.type = "button";
      speakButton.textContent = "듣기";
      speakButton.addEventListener("click", () => speak(message.text));

      const saveButton = document.createElement("button");
      saveButton.className = "mini-action";
      saveButton.type = "button";
      saveButton.textContent = "보관";
      saveButton.addEventListener("click", () => saveMessage(message));

      actions.append(speakButton, saveButton);
      bubble.append(actions);
    }

    elements.messages.append(bubble);
  });
  elements.messages.scrollTop = elements.messages.scrollHeight;
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
    restore.textContent = "대화로";
    restore.addEventListener("click", () => {
      openTab("chat");
      addMessage("user", item.question);
      addMessage("assistant", item.answer);
      setStatus("그 답변을 다시 펼쳤다네.");
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

function persistSaved() {
  localStorage.setItem("octoking-saved", JSON.stringify(state.saved));
  elements.savedCount.textContent = state.saved.length;
}

function addMessage(role, text, extra = {}) {
  state.messages.push({
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    ...extra,
  });
  renderMessages();
}

function saveMessage(message) {
  const previousUser = [...state.messages]
    .reverse()
    .find((item) => item.role === "user" && state.messages.indexOf(item) < state.messages.indexOf(message));
  const exists = state.saved.some((item) => item.messageId === message.id);

  if (exists) {
    setStatus("이미 보관함에 반짝이고 있어.");
    return;
  }

  state.saved.unshift({
    id: `saved-${Date.now()}`,
    messageId: message.id,
    question: previousUser?.text || "문어왕에게 물어본 질문",
    answer: message.text,
  });
  persistSaved();
  renderSaved();
  setStatus("보관함에 넣어두었다네.");
}

function answerTone(answer) {
  const age = elements.ageSelect.value;
  const length = elements.lengthSelect.value;
  const opener = {
    small: "좋아, 아주 쉽게 말해볼게. ",
    middle: "좋은 질문이야, 선원. ",
    big: "원리를 차근차근 보면 이래. ",
  }[age];
  const closer = {
    short: "",
    normal: " 또 궁금한 바다 비밀이 있으면 이어서 물어봐.",
    long: ` ${answer.fact} 이걸 기억하면 다음 질문도 훨씬 쉽게 풀 수 있어.`,
  }[length];

  if (length === "short") {
    return opener + answer.answer.split(".").slice(0, 2).join(".").trim() + ".";
  }

  return opener + answer.answer + closer;
}

function buildAnswer(question) {
  const clean = normalize(question);
  const match = answers.find((item) => item.tags.some((tag) => clean.includes(normalize(tag))));

  if (match) {
    return {
      mood: match.mood,
      text: answerTone(match),
    };
  }

  const generic = {
    mood: state.mood,
    fact: "바다는 빛, 물, 바람, 생물이 서로 영향을 주는 큰 세계야.",
    answer:
      `"${question}"라는 질문은 바다 탐험의 멋진 출발점이야. 먼저 무엇이 움직이고, 무엇이 변하고, 어떤 생물이 관련되는지 나눠 보면 답에 가까워질 수 있어.`,
  };

  return {
    mood: state.mood,
    text: answerTone(generic),
  };
}

function sendQuestion(rawText) {
  const question = (rawText || elements.input.value).trim();

  if (!question) {
    setStatus("짧아도 좋아. 질문 한 줄만 던져보게.");
    elements.input.focus();
    return;
  }

  addMessage("user", question);
  elements.input.value = "";
  elements.input.style.height = "auto";
  setStatus("심해 지도에서 답을 찾는 중...", "thinking");

  window.setTimeout(() => {
    const response = buildAnswer(question);
    setMood(response.mood);
    addMessage("assistant", response.text);
    setStatus("오호, 답을 건져 올렸다네.", "talking");
    speak(response.text);
    window.setTimeout(() => setStatus(moodCopy[state.mood]), 1200);
  }, 520);
}

function speak(text) {
  if (!state.sound || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.92;
  utterance.pitch = 1.08;
  setStatus("문어왕이 말하는 중...", "talking");
  utterance.onend = () => setStatus(moodCopy[state.mood]);
  utterance.onerror = () => setStatus(moodCopy[state.mood]);
  window.speechSynthesis.speak(utterance);
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
    setStatus("듣고 있다네.");
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
  if (!state.sound && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});

elements.chatTab.addEventListener("click", () => openTab("chat"));
elements.treasureTab.addEventListener("click", () => openTab("treasure"));

elements.clearSaved.addEventListener("click", () => {
  state.saved = [];
  persistSaved();
  renderSaved();
  setStatus("보관함을 비웠다네.");
});

renderSuggestions();
renderSaved();
setMood("captain");
addMessage("assistant", "나는 해군 모자를 쓴 문어왕. 바다, 생물, 파도, 심해 이야기를 물어보게.");
setupSpeechRecognition();

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      setStatus("앱 설치 준비는 나중에 다시 시도할게.");
    });
  });
}
