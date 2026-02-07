const quizFiles = [
  { label: "Module 1", file: "data/module1.json" },
  { label: "Module 2", file: "data/module2.json" },
  { label: "Map Zip De quy", file: "data/Map_zip_enumerate_Đệ quy.json" }
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

// Set this after deploying your Google Apps Script Web App
const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbxMryw41yc86Y1ySkYEb8W7P3nyEEqmE7JveepltgbJp6CH-AjxgGsWjM0tQwozhtmQ/exec";

let currentQuiz = null;
let countdownId = null;
let timeLeft = 0;

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
  }, 1000);
}

function clearQuestions() {
  questionsEl.innerHTML = "";
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
  } catch (err) {
    alert(err.message || "Có lỗi xảy ra");
  }
}

function onSubmitBtnClick() {
  const confirmation = confirm("Em chắc chắn muốn nộp bài không? Không thể sửa lại sau đó!");
  if (confirmation) {
    handleSubmit();
  }
}

async function handleSubmit() {
  if (!currentQuiz) return;
  const name = getStudentName();
  if (!name) return;
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

  localStorage.setItem("cnet_exam_last_submit", JSON.stringify(payload));

  const summaryHtml = `<strong>${name}</strong>, bạn đúng ${correct}/${total} câu.\nĐề: ${currentQuiz.title}`;
  resultBox.innerHTML = summaryHtml.replace(/\n/g, "<br>");
  resultBox.style.display = "block";

  renderResult(payload, currentQuiz);
  const fileName = `${sanitizeFileName(currentQuiz.title)}_${sanitizeFileName(name)}_${new Date().toISOString().slice(0,16).replace(/:/g,'-')}.doc`;
  const wordHtml = buildWordHtml(payload, currentQuiz);
  downloadWordFile(fileName, wordHtml);
  resultBox.innerHTML += "<br><span style='color: green;'>✓ File đã tải về. Gửi file cho giáo viên qua Zalo.</span>";
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
  if (countdownId) clearInterval(countdownId);
  timerEl.textContent = "00:00";
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
    resultBox.innerHTML += "<br><span style='color: green;'>✓ Da luu len Google Drive.</span>";
  } catch (err) {
    console.error("Drive upload error:", err);
    resultBox.innerHTML += `<br><span style='color: red;'>✗ Khong the luu len Google Drive: ${err.message}</span>`;
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
  const raw = localStorage.getItem("cnet_exam_last_submit");
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

startBtn.addEventListener("click", handleStart);
submitBtn.addEventListener("click", onSubmitBtnClick);
resetBtn.addEventListener("click", onResetBtnClick);
nameInput.addEventListener("input", () => setNameError(""));

questionsEl.addEventListener("change", (event) => {
  const target = event.target;
  if (!target || target.type !== "radio") return;
  const groupName = target.name;
  const radios = questionsEl.querySelectorAll(`input[name="${groupName}"]`);
  radios.forEach((radio) => {
    const option = radio.closest(".option");
    if (option) option.classList.toggle("selected", radio.checked);
  });
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