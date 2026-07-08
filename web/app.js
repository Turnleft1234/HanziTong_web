const app = document.querySelector("#app");

const lessonNames = Array.from({ length: 20 }, (_, index) => `第${chineseNumber(index + 1)}课`);
const qzwSegments = Array.from({ length: 4 }, (_, index) => `第${chineseNumber(index + 1)}段`);
const unitNames = Array.from({ length: 6 }, (_, index) => `识字小达人 ${index + 1}`).concat("千字文");
const qzwUnitName = "千字文";

const themes = [
  ["balloonGarden", "气球乐园", "./assets/balloon-garden.jpg"],
  ["sunnyClouds", "阳光云朵", "./assets/sunny-clouds.jpg"],
  ["dreamSky", "梦幻天空", "./assets/dream-sky.jpg"],
  ["mintBunny", "青草小兔", "./assets/mint-bunny.jpg"],
  ["starBalloons", "星空气球", "./assets/star-balloons.jpg"],
  ["animalDoodle", "萌宠涂鸦", "./assets/animal-doodle.jpg"],
  ["storyFrame", "童话画框", "./assets/story-frame.jpg"],
  ["cloudFriends", "云朵伙伴", "./assets/cloud-friends.jpg"],
  ["gardenClouds", "花园云朵", "./assets/garden-clouds.jpg"],
].map(([id, title, image]) => ({ id, title, image }));

const colorPresets = [
  ["default", "默认黑", "#22242c"],
  ["navy", "深蓝", "#1f3973"],
  ["brown", "深棕", "#59381f"],
  ["purple", "深紫", "#592e73"],
  ["forest", "深绿", "#1f6147"],
].map(([id, title, value]) => ({ id, title, value }));

const sizeLevels = [
  ["small", "小", 0.85],
  ["standard", "标准", 1],
  ["large", "大", 1.15],
  ["extraLarge", "特大", 1.3],
].map(([id, title, scale]) => ({ id, title, scale }));

const keys = {
  progress: "hanzitong.web.progress.v1",
  points: "hanzitong.web.points.v1",
  background: "hanzitong.web.background.v1",
  textPreset: "hanzitong.web.textPreset.v1",
  customColor: "hanzitong.web.customColor.v1",
  textSize: "hanzitong.web.textSize.v1",
  practiceUnit: "hanzitong.web.practiceUnit.v1",
  usedLessons: "hanzitong.web.usedLessons.v1",
  qzwSegments: "hanzitong.web.qzwSegments.v1",
};

const state = {
  ready: false,
  data: [],
  route: { name: "home", params: {} },
  stack: [],
  progress: loadJSON(keys.progress, {}),
  points: Number(localStorage.getItem(keys.points) || 0),
  settings: {
    background: localStorage.getItem(keys.background) || "balloonGarden",
    textPreset: localStorage.getItem(keys.textPreset) || "default",
    customColor: localStorage.getItem(keys.customColor) || "#33333f",
    textSize: localStorage.getItem(keys.textSize) || "standard",
    practiceUnit: localStorage.getItem(keys.practiceUnit) || "识字小达人 1",
    usedLessons: loadJSON(keys.usedLessons, {}),
    qzwSegments: new Set(loadJSON(keys.qzwSegments, qzwSegments)),
  },
  learningPicker: null,
  learning: null,
  practice: null,
  timer: null,
  visualProgress: {},
};

init();

async function init() {
  applyTheme();
  try {
    const [preschool, qzw] = getBundledData() || await Promise.all([
      fetch("./data/preschool_characters.json").then((response) => response.json()),
      fetch("./data/preschool_characters_QZW.json").then((response) => response.json()),
    ]);
    state.data = preschool.concat(qzw).filter(isValidEntry).map((entry) => ({
      ...entry,
      id: `${entry.stage}-${entry.hanzi}`,
    }));
    state.ready = true;
  } catch (error) {
    app.innerHTML = `<main class="screen"><section class="glass empty"><div class="empty-title">字表加载失败</div><div class="muted">${escapeHtml(error.message)}</div></section></main>`;
    return;
  }
  render();
}

function getBundledData() {
  const bundled = window.HanziTongData;
  if (!bundled || !Array.isArray(bundled.preschool) || !Array.isArray(bundled.qzw)) return null;
  return [bundled.preschool, bundled.qzw];
}

function render() {
  applyTheme();
  clearTimer();
  if (!state.ready) {
    app.innerHTML = `<main class="screen"><section class="glass empty"><div class="empty-title">正在加载</div></section></main>`;
    return;
  }

  const name = state.route.name;
  if (name === "home") renderHome();
  if (name === "learningPicker") renderLearningPicker();
  if (name === "learning") renderLearning();
  if (name === "practice") renderPractice();
  if (name === "stats") renderStats();
  if (name === "unitStats") renderUnitStats();
  if (name === "practiceSettings") renderPracticeSettings();
  if (name === "backgroundSettings") renderBackgroundSettings();
  if (name === "textSettings") renderTextSettings();
}

function renderHome() {
  const total = state.data.length;
  const mastered = masteredCount(state.data);
  const percent = total ? Math.round((mastered / total) * 100) : 0;
  app.innerHTML = screen("识字统计", "", `
    <div class="home-grid">
      <section class="glass progress-card">
        <div class="metrics">
          <div class="metric">
            <div><span class="metric-value">${mastered}</span> <span class="metric-detail">/ ${total}</span></div>
            <div class="metric-label">已掌握汉字</div>
          </div>
          <div class="divider"></div>
          <div class="metric">
            <div class="metric-value">★ ${state.points}</div>
            <div class="metric-label">累计积分</div>
          </div>
        </div>
        <div class="progress-row"><span>学习进度</span><span>${percent}%</span></div>
        ${progressBar("home", percent)}
      </section>

      <section class="mode-list">
        ${modeButton("learn", "文", "汉字学习", "选择册别与课次，浏览汉字与拼音", "learningPicker")}
        ${modeButton("hanzi", "字", "认字练习", "最多三课一组，看拼音选汉字", "practice", "hanzi")}
        ${modeButton("pinyin", "音", "拼音识别", "最多三课一组，看汉字选拼音", "practice", "pinyin")}
      </section>

      <section class="settings-grid">
        ${settingsButton("▦", "学习统计", "stats")}
        ${settingsButton("☰", "练习设置", "practiceSettings")}
        ${settingsButton("▧", "背景设置", "backgroundSettings")}
        ${settingsButton("A", "文字设置", "textSettings")}
      </section>
    </div>
  `);
}

function renderLearningPicker() {
  if (!state.learningPicker) {
    const firstUnit = units()[0] || unitNames[0];
    state.learningPicker = {
      unit: firstUnit,
      lesson: lessonsInUnit(firstUnit)[0] || "",
    };
  }
  const picker = state.learningPicker;
  const lessonOptions = lessonsInUnit(picker.unit);
  const count = charsByUnitLesson(picker.unit, picker.lesson).length;

  app.innerHTML = screen("汉字学习", backButton(), `
    <section class="glass panel form-grid">
      <div class="field">
        <label for="learn-unit">选择册别</label>
        <select id="learn-unit" data-action="learn-unit">
          ${units().map((unit) => option(unit, picker.unit)).join("")}
        </select>
      </div>
      <div class="field">
        <label for="learn-lesson">选择课次</label>
        <select id="learn-lesson" data-action="learn-lesson">
          ${lessonOptions.map((lesson) => option(lesson, picker.lesson)).join("")}
        </select>
      </div>
      <div class="muted">共 ${count} 个汉字</div>
      <button class="primary-button" data-action="start-learning" ${picker.lesson ? "" : "disabled"}>开始</button>
    </section>
  `);
}

function renderLearning() {
  const learning = state.learning;
  const chars = charsByUnitLesson(learning.unit, learning.lesson);
  const current = chars[learning.index];
  if (!current) {
    app.innerHTML = screen("汉字学习", backButton(), `<section class="glass empty"><div class="empty-title">本课暂无汉字</div></section>`);
    return;
  }
  const nextLesson = adjacentLesson(learning.unit, learning.lesson, 1);
  const previousLesson = adjacentLesson(learning.unit, learning.lesson, -1);
  const canPrevious = learning.index > 0 || previousLesson;
  const canNext = learning.index < chars.length - 1 || nextLesson;

  app.innerHTML = screen("汉字学习", backButton(), `
    <section class="glass learning-card">
      <div class="practice-meta">
        <span>${escapeHtml(learning.unit)} · ${escapeHtml(learning.lesson)}</span>
        <span>${learning.index + 1}/${chars.length}</span>
      </div>
      <div class="learning-display">
        <div class="hanzi-display">${escapeHtml(current.hanzi)}</div>
        <div class="pinyin-display">${escapeHtml(current.pinyin)}</div>
      </div>
      <div class="learning-nav">
        <button class="secondary-button" data-action="learning-prev" ${canPrevious ? "" : "disabled"}>← 上一个字</button>
        <button class="secondary-button" data-action="learning-next" ${canNext ? "" : "disabled"}>下一个字 →</button>
      </div>
      ${learning.index === chars.length - 1 && nextLesson ? `<div class="soft">再点 → 进入下一课</div>` : ""}
    </section>
  `);
}

function renderPractice() {
  const session = state.practice;
  if (!session || session.group.length === 0) {
    app.innerHTML = screen(session?.title || "练习", backButton(), `
      <section class="glass empty">
        <div class="empty-title">没有生字</div>
        <div class="muted">请在练习设置中选择册别后重试</div>
      </section>
    `);
    return;
  }

  if (session.index >= session.group.length) {
    app.innerHTML = screen(session.title, backButton(), `
      <section class="glass panel completion">
        <h2>本组完成</h2>
        <div class="muted">本组 ${session.group.length} 字 · 得分 ${session.score}</div>
        <div class="soft">${escapeHtml(session.lessons.join("、"))}</div>
        <div class="actions">
          <button class="primary-button" data-action="practice-new-group">再来一组</button>
          <button class="secondary-button" data-action="finish-practice">完成</button>
        </div>
      </section>
    `);
    return;
  }

  const current = session.group[session.index];
  const question = session.questionStates[session.index];
  const hasFeedback = Boolean(question.feedback);
  const prompt = session.mode === "hanzi" ? current.pinyin : current.hanzi;
  const promptClass = session.mode === "hanzi" ? "pinyin" : "hanzi";
  const optionClass = session.mode === "pinyin" ? "pinyin" : "";
  const correctAnswer = session.mode === "hanzi" ? current.hanzi : current.pinyin;
  const feedbackImage = question.feedback === "correct" ? "./assets/success.png" : "./assets/failure.png";

  app.innerHTML = screen(session.title, `
    <button class="icon-button" data-action="finish-practice" aria-label="完成">✓</button>
  `, `
    <section class="practice-layout">
      <button class="side-nav" data-action="practice-prev" ${session.index > 0 && !session.locked ? "" : "disabled"} aria-label="上一题">‹</button>
      <div class="practice-main">
        <div class="glass prompt-panel">
          <div class="practice-meta"><span>${session.index + 1}/${session.group.length}</span><span>★ ${session.score}</span></div>
          <div class="practice-prompt ${promptClass}">${escapeHtml(prompt)}</div>
          ${hasFeedback ? `<img class="feedback-art" src="${feedbackImage}" alt="">` : ""}
          <div class="practice-context">${escapeHtml(current.stage)} · ${escapeHtml(current.unit)}</div>
        </div>
        <div class="glass options-panel">
          <div class="options-grid">
            ${question.options.map((choice) => {
              const isCorrect = hasFeedback && choice === correctAnswer;
              const isWrong = hasFeedback && question.selectedAnswer === choice && choice !== correctAnswer;
              return `<button class="option-button ${optionClass} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}" data-action="answer" data-answer="${escapeAttr(choice)}" ${session.locked || hasFeedback ? "disabled" : ""}>${escapeHtml(choice)}</button>`;
            }).join("")}
          </div>
          ${progressBar("practice", Math.round((session.index / session.group.length) * 100))}
          <button class="secondary-button" data-action="skip-question" ${session.locked || hasFeedback ? "disabled" : ""}>还没学会</button>
        </div>
      </div>
      <button class="side-nav" data-action="practice-next" ${session.index < session.group.length - 1 && !session.locked ? "" : "disabled"} aria-label="下一题">›</button>
    </section>
    ${session.encouragement ? `<div class="toast">加油！</div>` : ""}
  `);

  if (session.locked) {
    state.timer = window.setTimeout(() => {
      session.locked = false;
      session.encouragement = false;
      session.index += 1;
      render();
    }, 900);
  }
}

function renderStats() {
  const all = state.data;
  const mastered = masteredCount(all);
  const practiced = all.filter((char) => progressFor(char).correctCount + progressFor(char).wrongCount > 0).length;
  app.innerHTML = screen("学习统计", backButton(), `
    <section class="glass panel stats-list">
      <div class="stats-row"><span>总汉字</span><strong>${all.length}</strong></div>
      <div class="stats-row"><span>已掌握</span><strong>${mastered}</strong></div>
      <div class="stats-row"><span>已练习</span><strong>${practiced}</strong></div>
      ${progressBar("stats", all.length ? Math.round((mastered / all.length) * 100) : 0)}
    </section>
    ${lessons().map((lesson) => {
      const chars = charsByLesson(lesson);
      const unitsForLesson = units().filter((unit) => chars.some((char) => char.unit === unit));
      return `<section class="glass panel lesson-card">
        <h2 class="panel-title">${escapeHtml(lesson)}</h2>
        <div class="muted">掌握 ${masteredCount(chars)} / ${chars.length}</div>
        ${unitsForLesson.map((unit) => {
          const unitChars = chars.filter((char) => char.unit === unit);
          return `<button class="unit-row" data-action="unit-stats" data-unit="${escapeAttr(unit)}" data-lesson="${escapeAttr(lesson)}"><span>${escapeHtml(unit)}</span><span>${masteredCount(unitChars)}/${unitChars.length}</span></button>`;
        }).join("")}
      </section>`;
    }).join("")}
    <section class="glass panel"><button class="danger-button" data-action="reset-progress">重置全部进度与积分</button></section>
  `);
}

function renderUnitStats() {
  const { unit, lesson } = state.route.params;
  const chars = charsByUnitLesson(unit, lesson);
  app.innerHTML = screen(unit, backButton(), `
    <section class="glass panel">
      <h2 class="panel-title">${escapeHtml(lesson)}</h2>
      <div class="mastery-grid">
        ${chars.map((char) => {
          const progress = progressFor(char);
          const tried = progress.correctCount + progress.wrongCount > 0;
          return `<div class="mastery-cell ${progress.level} ${tried && progress.level === "unknown" ? "tried" : ""}">
            <div class="mastery-hanzi">${escapeHtml(char.hanzi)}</div>
            <div class="mastery-pinyin">${escapeHtml(char.pinyin)}</div>
          </div>`;
        }).join("")}
      </div>
    </section>
  `);
}

function renderPracticeSettings() {
  const unit = state.settings.practiceUnit;
  const used = usedLessons(unit).size;
  const total = lessonsInUnit(unit).length;
  const poolCount = unitPool().length;
  app.innerHTML = screen("练习设置", backButton(), `
    <section class="glass panel">
      <h2 class="panel-title">${escapeHtml(unit)}</h2>
      <div class="muted">${unit === qzwUnitName ? `每组随机 30 字 · 覆盖 ${poolCount} 个汉字` : `每组最多 3 课 · 共 ${poolCount} 个汉字`}</div>
    </section>
    <section class="glass panel form-grid">
      <div class="field">
        <label for="practice-unit">练习册别</label>
        <select id="practice-unit" data-action="practice-unit">
          ${units().map((candidate) => option(candidate, unit)).join("")}
        </select>
      </div>
      ${unit === qzwUnitName ? qzwSettingsMarkup() : `
        <div class="muted">已练 ${used} / ${total} 课，剩余 ${Math.max(total - used, 0)} 课待练。全部练完后会自动从头轮换。</div>
        <button class="secondary-button" data-action="reset-used-lessons">重置当前册别进度</button>
      `}
    </section>
  `);
}

function renderBackgroundSettings() {
  app.innerHTML = screen("背景设置", backButton(), `
    <section class="background-grid">
      ${themes.map((theme) => `<button class="select-card ${theme.id === state.settings.background ? "selected" : ""}" data-action="select-background" data-theme="${theme.id}">
        <img src="${theme.image}" alt="">
        <span>${escapeHtml(theme.title)}</span>
      </button>`).join("")}
    </section>
  `);
}

function renderTextSettings() {
  const custom = state.settings.customColor;
  app.innerHTML = screen("文字设置", backButton(), `
    <section class="glass panel learning-display">
      <div class="hanzi-display">人</div>
      <div class="pinyin-display">rén</div>
      <div class="muted">预览当前文字颜色与大小效果</div>
    </section>
    <section class="glass panel form-grid">
      <h2 class="panel-title">文字颜色</h2>
      <div class="chip-grid">
        ${colorPresets.map((preset) => `<button class="chip ${preset.id === state.settings.textPreset ? "selected" : ""}" data-action="select-color" data-color="${preset.id}">
          <span class="swatch" style="background:${preset.value}"></span>
          <span>${escapeHtml(preset.title)}</span>
        </button>`).join("")}
      </div>
      <div class="field">
        <label for="custom-color">自定义颜色</label>
        <input id="custom-color" type="color" value="${escapeAttr(custom)}" data-action="custom-color">
      </div>
    </section>
    <section class="glass panel form-grid">
      <h2 class="panel-title">文字大小</h2>
      <div class="segments">
        ${sizeLevels.map((level) => `<button class="segment-button ${level.id === state.settings.textSize ? "selected" : ""}" data-action="select-size" data-size="${level.id}">${escapeHtml(level.title)}</button>`).join("")}
      </div>
    </section>
  `);
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "go") {
    const route = target.dataset.route;
    if (route === "practice") startPractice(target.dataset.mode);
    else navTo(route);
  }
  if (action === "back") goBack();
  if (action === "start-learning") startLearning();
  if (action === "learning-prev") moveLearning(-1);
  if (action === "learning-next") moveLearning(1);
  if (action === "answer") answerQuestion(target.dataset.answer);
  if (action === "skip-question") skipQuestion();
  if (action === "practice-prev") movePractice(-1);
  if (action === "practice-next") movePractice(1);
  if (action === "practice-new-group") startPractice(state.practice.mode, false);
  if (action === "finish-practice") finishPractice();
  if (action === "unit-stats") navTo("unitStats", { unit: target.dataset.unit, lesson: target.dataset.lesson });
  if (action === "reset-progress") resetProgress();
  if (action === "reset-used-lessons") resetUsedLessons();
  if (action === "select-background") selectBackground(target.dataset.theme);
  if (action === "select-color") selectColor(target.dataset.color);
  if (action === "select-size") selectSize(target.dataset.size);
  if (action === "qzw-all") setAllQzw(true);
  if (action === "qzw-clear") setAllQzw(false);
});

app.addEventListener("change", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "learn-unit") {
    state.learningPicker.unit = target.value;
    state.learningPicker.lesson = lessonsInUnit(target.value)[0] || "";
    render();
  }
  if (action === "learn-lesson") {
    state.learningPicker.lesson = target.value;
  }
  if (action === "practice-unit") {
    state.settings.practiceUnit = target.value;
    localStorage.setItem(keys.practiceUnit, target.value);
    render();
  }
  if (action === "custom-color") {
    state.settings.customColor = target.value;
    state.settings.textPreset = "custom";
    localStorage.setItem(keys.customColor, target.value);
    localStorage.setItem(keys.textPreset, "custom");
    render();
  }
  if (action === "qzw-toggle") {
    if (target.checked) state.settings.qzwSegments.add(target.value);
    else state.settings.qzwSegments.delete(target.value);
    saveQzwSegments();
    render();
  }
});

function screen(title, left, content) {
  return `
    <main class="screen">
      <header class="topbar">
        ${left || `<span class="topbar-spacer"></span>`}
        <h1 class="topbar-title">${escapeHtml(title)}</h1>
        <span class="topbar-spacer"></span>
      </header>
      ${content}
    </main>
  `;
}

function backButton() {
  return `<button class="icon-button" data-action="back" aria-label="返回">‹</button>`;
}

function modeButton(iconClass, icon, title, subtitle, route, mode = "") {
  return `<button class="mode-button" data-action="go" data-route="${route}" data-mode="${mode}">
    <span class="mode-icon ${iconClass}">${icon}</span>
    <span><span class="mode-title">${escapeHtml(title)}</span><span class="mode-subtitle">${escapeHtml(subtitle)}</span></span>
    <span class="chevron">›</span>
  </button>`;
}

function settingsButton(icon, title, route) {
  return `<button class="settings-button" data-action="go" data-route="${route}"><span>${icon}</span><span>${escapeHtml(title)}</span></button>`;
}

function option(value, selected) {
  return `<option value="${escapeAttr(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`;
}

function progressBar(id, percent) {
  const current = Math.max(0, Math.min(100, percent));
  const previous = state.visualProgress[id] ?? current;
  state.visualProgress[id] = current;
  return `<div class="progress-track"><div class="progress-fill" style="--progress-start:${previous}%;--progress:${current}%"></div></div>`;
}

function navTo(name, params = {}) {
  state.stack.push(state.route);
  state.route = { name, params };
  render();
}

function goBack() {
  state.route = state.stack.pop() || { name: "home", params: {} };
  render();
}

function startLearning() {
  const picker = state.learningPicker;
  state.learning = { unit: picker.unit, lesson: picker.lesson, index: 0 };
  navTo("learning");
}

function moveLearning(delta) {
  const learning = state.learning;
  const chars = charsByUnitLesson(learning.unit, learning.lesson);
  const nextIndex = learning.index + delta;
  if (nextIndex >= 0 && nextIndex < chars.length) {
    learning.index = nextIndex;
    render();
    return;
  }
  const nextLesson = adjacentLesson(learning.unit, learning.lesson, delta);
  if (!nextLesson) return;
  const nextChars = charsByUnitLesson(learning.unit, nextLesson);
  learning.lesson = nextLesson;
  learning.index = delta > 0 ? 0 : Math.max(nextChars.length - 1, 0);
  render();
}

function startPractice(mode, resetSession = true) {
  const selection = consumeNextGroup();
  const title = mode === "hanzi" ? "认字练习" : "拼音识别";
  state.practice = {
    mode,
    title,
    group: selection.characters,
    lessons: selection.lessons,
    index: 0,
    score: 0,
    correctCount: resetSession || !state.practice ? 0 : state.practice.correctCount,
    wrongCount: resetSession || !state.practice ? 0 : state.practice.wrongCount,
    questionStates: selection.characters.map((char) => ({
      options: generateOptions(char, mode),
      selectedAnswer: "",
      feedback: "",
    })),
    locked: false,
    encouragement: false,
    committed: false,
  };
  if (state.route.name !== "practice") navTo("practice");
  else render();
}

function answerQuestion(answer) {
  const session = state.practice;
  if (!session || session.locked) return;
  const current = session.group[session.index];
  const question = session.questionStates[session.index];
  if (question.feedback) return;
  const correctAnswer = session.mode === "hanzi" ? current.hanzi : current.pinyin;
  const correct = answer === correctAnswer;
  question.selectedAnswer = answer;
  question.feedback = correct ? "correct" : "wrong";
  session.score += correct ? 1 : -1;
  session.correctCount += correct ? 1 : 0;
  session.wrongCount += correct ? 0 : 1;
  session.locked = true;
  recordQuiz(current, correct);
  render();
}

function skipQuestion() {
  const session = state.practice;
  if (!session || session.locked) return;
  session.locked = true;
  session.encouragement = true;
  render();
}

function movePractice(delta) {
  const session = state.practice;
  if (!session || session.locked) return;
  const nextIndex = session.index + delta;
  if (nextIndex < 0 || nextIndex >= session.group.length) return;
  session.index = nextIndex;
  render();
}

function finishPractice() {
  const session = state.practice;
  if (!session) return;
  clearTimer();
  const points = session.correctCount - session.wrongCount;
  if (!session.committed) {
    state.points += points;
    localStorage.setItem(keys.points, String(state.points));
    session.committed = true;
  }
  window.alert(`本次学习\n正确：${session.correctCount} 个\n错误：${session.wrongCount} 个\n获得积分：${points}`);
  state.practice = null;
  state.route = { name: "home", params: {} };
  state.stack = [];
  render();
}

function resetProgress() {
  if (!window.confirm("确定重置全部进度与积分？")) return;
  state.progress = {};
  state.points = 0;
  localStorage.setItem(keys.progress, JSON.stringify(state.progress));
  localStorage.setItem(keys.points, "0");
  render();
}

function resetUsedLessons() {
  state.settings.usedLessons[state.settings.practiceUnit] = [];
  localStorage.setItem(keys.usedLessons, JSON.stringify(state.settings.usedLessons));
  render();
}

function selectBackground(themeId) {
  state.settings.background = themeId;
  localStorage.setItem(keys.background, themeId);
  render();
}

function selectColor(colorId) {
  state.settings.textPreset = colorId;
  localStorage.setItem(keys.textPreset, colorId);
  render();
}

function selectSize(sizeId) {
  state.settings.textSize = sizeId;
  localStorage.setItem(keys.textSize, sizeId);
  render();
}

function setAllQzw(enabled) {
  state.settings.qzwSegments = new Set(enabled ? qzwSegments : []);
  saveQzwSegments();
  render();
}

function qzwSettingsMarkup() {
  return `
    <div class="muted">已勾选 ${state.settings.qzwSegments.size} / ${qzwSegments.length} 段。</div>
    <div class="qzw-list">
      ${qzwSegments.map((segment) => `<label class="toggle-row">
        <span>${escapeHtml(segment)}</span>
        <input type="checkbox" value="${escapeAttr(segment)}" data-action="qzw-toggle" ${state.settings.qzwSegments.has(segment) ? "checked" : ""}>
      </label>`).join("")}
    </div>
    <div class="actions">
      <button class="primary-button" data-action="qzw-all">全选</button>
      <button class="secondary-button" data-action="qzw-clear">清空</button>
    </div>
  `;
}

function consumeNextGroup() {
  const unit = state.settings.practiceUnit;
  if (unit === qzwUnitName) {
    const enabled = qzwSegments.filter((segment) => state.settings.qzwSegments.has(segment));
    const pool = shuffle(charsByUnitLessons(qzwUnitName, enabled));
    return {
      lessons: enabled,
      characters: pool.slice(0, Math.min(30, pool.length)),
    };
  }

  const allLessons = lessonsInUnit(unit);
  let used = usedLessons(unit);
  let remaining = allLessons.filter((lesson) => !used.has(lesson));
  if (remaining.length === 0) {
    used = new Set();
    remaining = allLessons;
  }
  const selectedLessons = shuffle(remaining).slice(0, Math.min(3, remaining.length));
  selectedLessons.forEach((lesson) => used.add(lesson));
  state.settings.usedLessons[unit] = Array.from(used).sort(lessonSort);
  localStorage.setItem(keys.usedLessons, JSON.stringify(state.settings.usedLessons));

  return {
    lessons: selectedLessons,
    characters: shuffle(charsByUnitLessons(unit, selectedLessons)),
  };
}

function unitPool() {
  const unit = state.settings.practiceUnit;
  if (unit === qzwUnitName) {
    return charsByUnitLessons(qzwUnitName, qzwSegments.filter((segment) => state.settings.qzwSegments.has(segment)));
  }
  return charsByUnit(unit);
}

function generateOptions(char, mode) {
  const prop = mode === "hanzi" ? "hanzi" : "pinyin";
  const pool = new Set(unitPool().map((item) => item[prop]).concat(state.data.map((item) => item[prop])));
  pool.delete(char[prop]);
  return shuffle([char[prop]].concat(shuffle(Array.from(pool)).slice(0, 3)));
}

function recordQuiz(char, correct) {
  const entry = progressFor(char);
  if (correct) entry.correctCount += 1;
  else entry.wrongCount += 1;
  entry.lastReviewed = new Date().toISOString();

  if (entry.level === "unknown") {
    entry.level = correct ? "learning" : "unknown";
  } else if (entry.level === "learning") {
    if (correct && entry.correctCount >= 2) entry.level = "mastered";
    if (!correct && entry.wrongCount >= 2) entry.level = "unknown";
  } else if (entry.level === "mastered" && !correct) {
    entry.level = "learning";
  }

  state.progress[char.id] = entry;
  localStorage.setItem(keys.progress, JSON.stringify(state.progress));
}

function progressFor(char) {
  return state.progress[char.id] || {
    level: "unknown",
    correctCount: 0,
    wrongCount: 0,
    lastReviewed: null,
  };
}

function masteredCount(chars) {
  return chars.filter((char) => progressFor(char).level === "mastered").length;
}

function units() {
  const present = new Set(state.data.map((char) => char.unit));
  return unitNames.filter((unit) => present.has(unit));
}

function lessons() {
  const present = new Set(state.data.map((char) => char.stage));
  return lessonNames.concat(qzwSegments).filter((lesson) => present.has(lesson));
}

function lessonsInUnit(unit) {
  const present = new Set(charsByUnit(unit).map((char) => char.stage));
  return lessonNames.concat(qzwSegments).filter((lesson) => present.has(lesson));
}

function charsByUnit(unit) {
  return state.data.filter((char) => char.unit === unit);
}

function charsByLesson(lesson) {
  return state.data.filter((char) => char.stage === lesson);
}

function charsByUnitLesson(unit, lesson) {
  return state.data.filter((char) => char.unit === unit && char.stage === lesson);
}

function charsByUnitLessons(unit, selectedLessons) {
  const selected = new Set(selectedLessons);
  return state.data.filter((char) => char.unit === unit && selected.has(char.stage));
}

function adjacentLesson(unit, lesson, delta) {
  const list = lessonsInUnit(unit);
  const index = list.indexOf(lesson);
  if (index < 0) return "";
  return list[index + delta] || "";
}

function usedLessons(unit) {
  return new Set(state.settings.usedLessons[unit] || []);
}

function saveQzwSegments() {
  localStorage.setItem(keys.qzwSegments, JSON.stringify(Array.from(state.settings.qzwSegments).sort(lessonSort)));
}

function clearTimer() {
  if (state.timer) {
    window.clearTimeout(state.timer);
    state.timer = null;
  }
}

function applyTheme() {
  const theme = themes.find((item) => item.id === state.settings.background) || themes[0];
  const preset = colorPresets.find((item) => item.id === state.settings.textPreset);
  const color = preset ? preset.value : state.settings.customColor;
  const size = sizeLevels.find((item) => item.id === state.settings.textSize) || sizeLevels[1];
  app.style.setProperty("--app-bg", `url("${theme.image}")`);
  app.style.setProperty("--text-color", color);
  app.style.setProperty("--text-muted", hexToRgba(color, 0.72));
  app.style.setProperty("--text-soft", hexToRgba(color, 0.52));
  app.style.setProperty("--font-scale", String(size.scale));
}

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function isValidEntry(entry) {
  return entry && entry.hanzi && entry.pinyin && lessonNames.concat(qzwSegments).includes(entry.stage) && unitNames.includes(entry.unit);
}

function shuffle(items) {
  const output = items.slice();
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function lessonSort(a, b) {
  const order = lessonNames.concat(qzwSegments);
  return order.indexOf(a) - order.indexOf(b);
}

function chineseNumber(number) {
  const digits = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (number <= 9) return digits[number];
  if (number === 10) return "十";
  if (number < 20) return `十${digits[number - 10]}`;
  if (number === 20) return "二十";
  return "";
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
