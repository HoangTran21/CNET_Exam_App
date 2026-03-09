const quizFiles = [
  { label: "Module 1: Cơ bản", file: "data/module1.json" },
  { label: "Module 2: Thuật toán, Hàm, Các CTDL", file: "data/module2.json" },
  { label: "Map-Zip-Đệ quy", file: "data/Map_zip_enumerate_Đệ quy.json" },
  { label: "Ôn tập map, zip, enumerate, CTDL", file: "data/Ôn tập cho Lâm.json" }
];

const quizSelect = document.getElementById("quiz-select");
const quizInfo = document.getElementById("quiz-info");
const startBtn = document.getElementById("start-btn");
const quizCard = document.getElementById("quiz-card");
const setupCard = document.getElementById("setup-card");
const nameInput = document.getElementById("student-name");
const nameError = document.getElementById("name-error");
const quizTitle = document.getElementById("quiz-title");
const timerEl = document.getElementById("timer");
const questionsEl = document.getElementById("questions");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const resultBox = document.getElementById("result-box");
const codingList = document.getElementById("coding-list");
const resultCard = document.getElementById("result-card");
const resultSummary = document.getElementById("result-summary");
const resultCoding = document.getElementById("result-coding");
const resultTime = document.getElementById("result-time");
const resultAnswers = document.getElementById("result-answers");

const LAST_SUBMIT_KEY = "cnet_exam_last_submit";
const DRAFT_KEY = "cnet_exam_draft";
const AUTO_SAVE_INTERVAL_MS = 5000;

// Set this after deploying your Google Apps Script Web App
const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbz4ExRFCcAw0uzdkG3kDPhVhMha-KN7x32NgF5gc8BbQTpTIQzX7okwCdEGQhEY3Ts/exec";

let currentQuiz = null;
let countdownId = null;
let timeLeft = 0;
let lastAutoSaveAt = 0;
let isSubmitted = false;

function ensureConfirmModal() {
  let modal = document.getElementById("app-confirm-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "app-confirm-modal";
  modal.className = "app-modal";
  modal.innerHTML = `
    <div class="app-modal-backdrop" data-close="backdrop"></div>
    <div class="app-modal-panel" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
      <h3 id="app-modal-title" class="app-modal-title"></h3>
      <p class="app-modal-message"></p>
      <div class="app-modal-actions">
        <button type="button" class="app-modal-btn app-modal-btn-cancel">Hủy</button>
        <button type="button" class="app-modal-btn app-modal-btn-confirm">Xác nhận</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function showConfirmDialog({ title, message, confirmText = "Xác nhận", cancelText = "Hủy", danger = false }) {
  const modal = ensureConfirmModal();
  const titleEl = modal.querySelector(".app-modal-title");
  const messageEl = modal.querySelector(".app-modal-message");
  const cancelBtn = modal.querySelector(".app-modal-btn-cancel");
  const confirmBtn = modal.querySelector(".app-modal-btn-confirm");
  const backdrop = modal.querySelector(".app-modal-backdrop");

  titleEl.textContent = title || "Xác nhận";
  messageEl.textContent = message || "Bạn có muốn tiếp tục không?";
  cancelBtn.textContent = cancelText;
  confirmBtn.textContent = confirmText;
  confirmBtn.classList.toggle("danger", !!danger);

  modal.classList.add("show");
  document.body.classList.add("modal-open");

  return new Promise((resolve) => {
    const cleanup = (result) => {
      modal.classList.remove("show");
      document.body.classList.remove("modal-open");
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      backdrop.removeEventListener("click", onCancel);
      window.removeEventListener("keydown", onEsc);
      resolve(result);
    };

    const onCancel = () => cleanup(false);
    const onConfirm = () => cleanup(true);
    const onEsc = (event) => {
      if (event.key === "Escape") onCancel();
    };

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    backdrop.addEventListener("click", onCancel);
    window.addEventListener("keydown", onEsc);
    confirmBtn.focus();
  });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function setTimer(seconds) {
  timeLeft = seconds;
  timerEl.textContent = formatTime(timeLeft);
  if (countdownId) clearInterval(countdownId);
  countdownId = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      clearInterval(countdownId);
      handleSubmit();
    }
    timerEl.textContent = formatTime(timeLeft);
    saveDraft();
  }, 1000);
}

function clearQuestions() {
  questionsEl.innerHTML = "";
}

function getSelectedAnswersFromUI() {
  return Array.from(questionsEl.querySelectorAll(".question")).map((qEl) => {
    const selected = qEl.querySelector("input[type=radio]:checked");
    return selected ? Number(selected.value) : -1;
  });
}

function setSelectedAnswersToUI(selectedAnswers) {
  if (!Array.isArray(selectedAnswers)) return;
  selectedAnswers.forEach((answerIdx, qIdx) => {
    if (typeof answerIdx !== "number" || answerIdx < 0) return;
    const radio = questionsEl.querySelector(`input[name="q${qIdx}"][value="${answerIdx}"]`);
    if (radio) radio.checked = true;
  });

  Array.from(questionsEl.querySelectorAll(".question")).forEach((qEl) => {
    const optionEls = qEl.querySelectorAll(".option");
    optionEls.forEach((optEl) => {
      const radio = optEl.querySelector("input[type=radio]");
      optEl.classList.toggle("selected", !!radio?.checked);
    });
  });
}

function getCodingAnswersFromUI() {
  return Array.from(codingList.querySelectorAll("textarea")).map((el) => el.value);
}

function setCodingAnswersToUI(codingAnswers) {
  if (!Array.isArray(codingAnswers)) return;
  const textareas = Array.from(codingList.querySelectorAll("textarea"));
  textareas.forEach((el, idx) => {
    el.value = codingAnswers[idx] || "";
  });
}

function buildDraftPayload() {
  if (!currentQuiz) return null;
  return {
    name: nameInput.value.trim(),
    quizFile: quizSelect.value,
    quizTitle: currentQuiz.title,
    timeLeft,
    selectedAnswers: getSelectedAnswersFromUI(),
    codingAnswers: getCodingAnswersFromUI(),
    savedAt: new Date().toISOString()
  };
}

function saveDraft(force = false) {
  if (!currentQuiz || isSubmitted) return;
  const now = Date.now();
  if (!force && now - lastAutoSaveAt < AUTO_SAVE_INTERVAL_MS) return;
  const draft = buildDraftPayload();
  if (!draft) return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  lastAutoSaveAt = now;
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function setNameError(message) {
  if (message) {
    nameError.textContent = message;
    nameError.style.display = "block";
    nameInput.classList.add("input-error");
  } else {
    nameError.style.display = "none";
    nameInput.classList.remove("input-error");
  }
}

function getStudentName() {
  const name = nameInput.value.trim();
  if (!name) {
    setNameError("Vui lòng nhập họ và tên.");
    nameInput.focus();
    return null;
  }
  setNameError("");
  return name;
}

function buildQuestions(questions) {
  clearQuestions();
  questions.forEach((item, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "question";
    wrapper.dataset.index = idx;

    const title = document.createElement("div");
    title.className = "question-title";
    title.textContent = `Câu ${idx + 1}: ${item.q}`;
    wrapper.appendChild(title);

    const options = document.createElement("div");
    options.className = "options";

    item.opts.forEach((opt, optIdx) => {
      const label = document.createElement("label");
      label.className = "option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q${idx}`;
      radio.value = optIdx;

      const text = document.createElement("span");
      text.textContent = opt;

      label.appendChild(radio);
      label.appendChild(text);
      options.appendChild(label);
    });

    wrapper.appendChild(options);
    questionsEl.appendChild(wrapper);

    const divider = document.createElement("div");
    divider.className = "question-line";
    questionsEl.appendChild(divider);
  });
}

function setQuizInfo(data) {
  quizInfo.textContent = `${data.title} · ${data.questions.length} câu`;
}

function normalizeCodingTasks(data) {
  if (Array.isArray(data.coding_tasks)) return data.coding_tasks;
  if (typeof data.coding_task === "string") return [data.coding_task];
  return [];
}

function renderCodingTasks(tasks) {
  codingList.innerHTML = "";
  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "coding-card";
    empty.textContent = "Không có bài tập code cho đề này.";
    codingList.appendChild(empty);
    return;
  }

  tasks.forEach((task, idx) => {
    const card = document.createElement("div");
    card.className = "coding-card";

    const title = document.createElement("h4");
    title.textContent = `Bài ${idx + 1}`;
    card.appendChild(title);

    const desc = document.createElement("div");
    desc.textContent = task;
    desc.style.marginBottom = "10px";
    card.appendChild(desc);

    const textarea = document.createElement("textarea");
    textarea.className = "coding";
    textarea.rows = 6;
    textarea.placeholder = "Nhập code của bạn...";
    textarea.dataset.index = idx;
    
    // Add auto-indent handler for Python ':'
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && textarea.value[textarea.selectionStart - 1] === ":") {
        e.preventDefault();
        const before = textarea.value.substring(0, textarea.selectionStart);
        const after = textarea.value.substring(textarea.selectionStart);
        textarea.value = before + "\n    " + after;
        textarea.selectionStart = textarea.selectionEnd = before.length + 5;
      }
    });
    
    card.appendChild(textarea);
    codingList.appendChild(card);
  });
}

async function loadQuiz(file) {
  const response = await fetch(file);
  if (!response.ok) throw new Error("Không thể tải đề thi");
  return response.json();
}

function buildSelect() {
  quizSelect.innerHTML = "";
  quizFiles.forEach((quiz) => {
    const opt = document.createElement("option");
    opt.value = quiz.file;
    opt.textContent = quiz.label;
    quizSelect.appendChild(opt);
  });
}

async function handleStart() {
  const name = getStudentName();
  if (!name) return;
  const file = quizSelect.value;
  if (!file) return;

  try {
    currentQuiz = await loadQuiz(file);
    setQuizInfo(currentQuiz);
    quizTitle.textContent = currentQuiz.title;
    buildQuestions(currentQuiz.questions || []);
    renderCodingTasks(normalizeCodingTasks(currentQuiz));
    setTimer(currentQuiz.time_seconds || 900);
    resultBox.style.display = "none";
    resultBox.textContent = "";
    setupCard.style.display = "none";
    quizCard.style.display = "block";
    resultCard.style.display = "none";
    saveDraft(true);
  } catch (err) {
    alert(err.message || "Có lỗi xảy ra");
  }
}

async function onSubmitBtnClick() {
  const confirmation = await showConfirmDialog({
    title: "Xác nhận nộp bài",
    message: "Em chắc chắn muốn nộp bài không? Sau khi nộp sẽ không thể sửa lại.",
    confirmText: "Nộp bài",
    cancelText: "Quay lại",
    danger: true
  });
  if (confirmation) {
    await handleSubmit();
  }
}

async function handleSubmit() {
  if (!currentQuiz) return;
  const name = getStudentName();
  if (!name) return;
  
  // Clear draft and mark as submitted to prevent auto-save
  clearDraft();
  isSubmitted = true;
  
  const answers = Array.from(questionsEl.querySelectorAll(".question"));
  const selectedAnswers = [];
  let correct = 0;
  answers.forEach((qEl, idx) => {
    const selected = qEl.querySelector("input[type=radio]:checked");
    const correctIdx = currentQuiz.questions[idx].ans;
    const optionEls = qEl.querySelectorAll(".option");
    optionEls.forEach((optEl, optIdx) => {
      optEl.classList.remove("correct", "wrong");
      if (optIdx === correctIdx) optEl.classList.add("correct");
    });
    if (selected && Number(selected.value) === correctIdx) {
      correct += 1;
    } else if (selected) {
      optionEls[Number(selected.value)]?.classList.add("wrong");
    }
    selectedAnswers.push(selected ? Number(selected.value) : -1);
  });

  const total = currentQuiz.questions.length;
  const codingAnswers = Array.from(codingList.querySelectorAll("textarea")).map((el) => el.value.trim());
  const quizFile = quizSelect.value;

  const payload = {
    name,
    quizTitle: currentQuiz.title,
    quizFile,
    score: `${correct}/${total}`,
    timeLeft,
    submittedAt: new Date().toISOString(),
    codingAnswers,
    selectedAnswers
  };

  localStorage.setItem(LAST_SUBMIT_KEY, JSON.stringify(payload));

  const summaryHtml = `<strong>${name}</strong>, bạn đúng ${correct}/${total} câu.\nĐề: ${currentQuiz.title}`;
  resultBox.innerHTML = summaryHtml.replace(/\n/g, "<br>");
  resultBox.style.display = "block";

  renderResult(payload, currentQuiz);
  const fileName = `${sanitizeFileName(currentQuiz.title)}_${sanitizeFileName(name)}_${new Date().toISOString().slice(0,16).replace(/:/g,'-')}.doc`;
  const wordHtml = buildWordHtml(payload, currentQuiz);

  const drivePayload = {
    ...payload,
    questionResults: buildDetailedQuestionResults(currentQuiz, selectedAnswers)
  };

  downloadWordFile(fileName, wordHtml);
  resultBox.innerHTML += "<br><span style='color: green;'>✓ File đã tải về. Gửi file cho giáo viên qua Zalo.</span>";
  await uploadToDrive(fileName, wordHtml, drivePayload);
  resultCard.style.display = "block";
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  if (countdownId) clearInterval(countdownId);
}

function onResetBtnClick() {
  const confirmation = confirm("Em có chắc chắn muốn làm lại? Dữ liệu hiện tại sẽ mất!");
  if (confirmation) {
    handleReset();
  }
}

function handleReset() {
  quizCard.style.display = "none";
  setupCard.style.display = "block";
  resultCard.style.display = "none";
  clearQuestions();
  codingList.innerHTML = "";
  currentQuiz = null;
  isSubmitted = false;
  if (countdownId) clearInterval(countdownId);
  timerEl.textContent = "00:00";
  clearDraft();
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("vi-VN");
  } catch {
    return value;
  }
}

function sanitizeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

function buildDetailedQuestionResults(quizData, selectedAnswers) {
  if (!quizData?.questions?.length) return [];
  return quizData.questions.map((q, idx) => {
    const picked = selectedAnswers?.[idx] ?? -1;
    const correctIdx = q.ans;
    return {
      index: idx + 1,
      question: q.q,
      pickedIndex: picked,
      pickedText: picked === -1 ? "(Bỏ trống)" : q.opts[picked],
      correctIndex: correctIdx,
      correctText: q.opts[correctIdx],
      isCorrect: picked === correctIdx
    };
  });
}

function buildWordHtml(payload, quizData) {
  const lines = [];
  lines.push(`<h1>${payload.quizTitle}</h1>`);
  lines.push(`<p><strong>Học sinh:</strong> ${payload.name}</p>`);
  lines.push(`<p><strong>Điểm trắc nghiệm:</strong> ${payload.score}</p>`);
  lines.push(`<p><strong>Thời gian nộp:</strong> ${formatDate(payload.submittedAt)}</p>`);

  lines.push("<h2>I. PHẦN TRẮC NGHIỆM</h2>");
  if (quizData?.questions?.length) {
    quizData.questions.forEach((q, idx) => {
      const picked = payload.selectedAnswers?.[idx] ?? -1;
      const pickedText = picked === -1 ? "(Bỏ trống)" : q.opts[picked];
      lines.push(`<p><strong>Câu ${idx + 1}:</strong> ${q.q}</p>`);
      lines.push(`<p>Trả lời: ${pickedText}</p>`);
      lines.push(`<p>Đáp án đúng: ${q.opts[q.ans]}</p>`);
      lines.push("<br />");
    });
  }

  lines.push("<h2>II. PHẦN TỰ LUẬN (CODE)</h2>");
  if (payload.codingAnswers?.length) {
    payload.codingAnswers.forEach((ans, idx) => {
      const value = ans || "(Bỏ trống)";
      lines.push(`<p><strong>Bài ${idx + 1}:</strong></p>`);
      lines.push(`<pre style=\"background:#f5f5f5;padding:10px;border-radius:6px;\">${value}</pre>`);
    });
  } else {
    lines.push("<p>(Không có bài tập code)</p>");
  }

  return `<!doctype html><html><head><meta charset=\"utf-8\"></head><body style=\"font-family:Times New Roman, serif;\">${lines.join("\n")}</body></html>`;
}

function downloadWordFile(fileName, htmlContent) {
  const blob = new Blob([htmlContent], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function uploadToDrive(fileName, htmlContent, payload) {
  if (!DRIVE_UPLOAD_URL) {
    console.log("DRIVE_UPLOAD_URL not set");
    return;
  }

  console.log("Uploading to Drive:", fileName);
  
  try {
    const response = await fetch(DRIVE_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: "cnet_secret_2026",
        fileName,
        htmlContent,
        payload
      })
    });

    console.log("Drive response status:", response.status);
    const result = await response.json().catch(() => null);
    console.log("Drive response:", result);
    
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || "Upload failed");
    }
    resultBox.innerHTML += "<br><span style='color: green;'>✓ Đã lưu lên Google Drive.</span>";
  } catch (err) {
    console.error("Drive upload error:", err);
    resultBox.innerHTML += `<br><span style='color: red;'>✗ Không thể lưu lên Google Drive: ${err.message}</span>`;
  }
}

function buildAnswerSummary(quizData, selectedAnswers) {
  resultAnswers.innerHTML = "";
  if (!quizData || !Array.isArray(quizData.questions)) return;
  quizData.questions.forEach((q, idx) => {
    const item = document.createElement("div");
    item.className = "answer-item";

    const picked = selectedAnswers?.[idx] ?? -1;
    const isCorrect = picked === q.ans;
    
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display: grid; grid-template-columns: 40px 1fr 150px; gap: 12px; align-items: start; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;";
    
    const numTag = document.createElement("span");
    numTag.textContent = `${idx + 1}`;
    numTag.style.cssText = "font-weight: bold; color: #3498db;";
    
    const questionText = document.createElement("div");
    questionText.textContent = q.q;
    questionText.style.cssText = "font-weight: 500;";
    
    const statusTag = document.createElement("span");
    statusTag.className = `answer-tag${isCorrect ? "" : " wrong"}`;
    statusTag.textContent = isCorrect ? "✓ Đúng" : "✗ Sai";
    statusTag.style.cssText = `text-align: center; padding: 4px 8px; border-radius: 4px; font-weight: bold; ${isCorrect ? "background: #d4edda; color: #155724;" : "background: #f8d7da; color: #721c24;"}`;
    
    headerRow.appendChild(numTag);
    headerRow.appendChild(questionText);
    headerRow.appendChild(statusTag);
    item.appendChild(headerRow);

    const answerRow = document.createElement("div");
    answerRow.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 8px; padding-left: 40px;";
    
    const studentDiv = document.createElement("div");
    const studentText = picked === -1 ? "(không chọn)" : q.opts[picked];
    studentDiv.innerHTML = `<strong>Trả lời:</strong> ${studentText}`;
    studentDiv.style.cssText = "color: #555;";
    
    const correctDiv = document.createElement("div");
    correctDiv.innerHTML = `<strong>Đáp án:</strong> ${q.opts[q.ans]}`;
    correctDiv.style.cssText = "color: #28a745; font-weight: 500;";
    
    answerRow.appendChild(studentDiv);
    answerRow.appendChild(correctDiv);
    item.appendChild(answerRow);

    resultAnswers.appendChild(item);
  });
}

function renderResult(payload, quizData) {
  const summary = `<strong>${payload.name}</strong>, bạn đúng ${payload.score} câu.\nĐề: ${payload.quizTitle}\nThời gian nộp: ${formatDate(payload.submittedAt)}`;
  resultSummary.innerHTML = summary.replace(/\n/g, "<br>");
  resultTime.textContent = `Còn lại: ${formatTime(payload.timeLeft || 0)}`;
  resultCoding.value = "Giáo viên sẽ chấm phần tự luận sau.";
  buildAnswerSummary(quizData, payload.selectedAnswers || []);
}

async function hydrateFromStorage() {
  const raw = localStorage.getItem(LAST_SUBMIT_KEY);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    if (!payload || !payload.quizFile) return;
    const quizData = await loadQuiz(payload.quizFile);
    renderResult(payload, quizData);
  } catch {
    // Do nothing
  }
}

async function restoreDraftIfExists() {
  // Don't restore if already submitted
  if (isSubmitted) return;
  
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    clearDraft();
    return;
  }

  if (!draft?.quizFile) {
    clearDraft();
    return;
  }

  const savedAt = draft.savedAt ? formatDate(draft.savedAt) : "gần đây";
  const wantRestore = await showConfirmDialog({
    title: "Phát hiện bài chưa nộp",
    message: `Hệ thống phát hiện bài làm chưa nộp (lưu lúc ${savedAt}). Em có muốn khôi phục không?`,
    confirmText: "Khôi phục",
    cancelText: "Bỏ qua"
  });
  if (!wantRestore) return;

  try {
    currentQuiz = await loadQuiz(draft.quizFile);
    quizSelect.value = draft.quizFile;
    setQuizInfo(currentQuiz);
    quizTitle.textContent = currentQuiz.title;
    buildQuestions(currentQuiz.questions || []);
    renderCodingTasks(normalizeCodingTasks(currentQuiz));

    const defaultTime = currentQuiz.time_seconds || 900;
    const restoredTime = Number(draft.timeLeft);
    setTimer(restoredTime > 0 ? restoredTime : defaultTime);

    nameInput.value = draft.name || "";
    setSelectedAnswersToUI(draft.selectedAnswers);
    setCodingAnswersToUI(draft.codingAnswers);

    resultBox.style.display = "none";
    resultBox.textContent = "";
    setupCard.style.display = "none";
    quizCard.style.display = "block";
    resultCard.style.display = "none";
    saveDraft(true);
  } catch {
    alert("Không thể khôi phục bài cũ. Có thể đề thi đã thay đổi hoặc không tải được dữ liệu.");
  }
}

startBtn.addEventListener("click", handleStart);
submitBtn.addEventListener("click", onSubmitBtnClick);
resetBtn.addEventListener("click", onResetBtnClick);
nameInput.addEventListener("input", () => {
  setNameError("");
  if (currentQuiz) saveDraft(true);
});

questionsEl.addEventListener("change", (event) => {
  const target = event.target;
  if (!target || target.type !== "radio") return;
  const groupName = target.name;
  const radios = questionsEl.querySelectorAll(`input[name="${groupName}"]`);
  radios.forEach((radio) => {
    const option = radio.closest(".option");
    if (option) option.classList.toggle("selected", radio.checked);
  });
  saveDraft(true);
});

codingList.addEventListener("input", () => {
  saveDraft(true);
});

window.addEventListener("beforeunload", () => {
  saveDraft(true);
});

buildSelect();
quizSelect.addEventListener("change", async () => {
  const file = quizSelect.value;
  if (!file) return;
  try {
    const data = await loadQuiz(file);
    setQuizInfo(data);
  } catch {
    quizInfo.textContent = "Không thể đọc đề thi";
  }
});

if (quizFiles.length) {
  quizSelect.value = quizFiles[0].file;
  loadQuiz(quizFiles[0].file).then(setQuizInfo).catch(() => {
    quizInfo.textContent = "Không thể đọc đề thi";
  });
}

hydrateFromStorage();
restoreDraftIfExists();