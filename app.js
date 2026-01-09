(() => {
  // ----- DOM -----
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");

  const maxInput = document.getElementById("maxInput");
  const allowTopMissing = document.getElementById("allowTopMissing");
  const startBtn = document.getElementById("startBtn");
  const startError = document.getElementById("startError");
  const startScoreInput = document.getElementById("startScoreInput");


  const stopBtn = document.getElementById("stopBtn");
  const scoreLabel = document.getElementById("scoreLabel");
  const maxText = document.getElementById("maxText");
  const dots = document.getElementById("dots");
  const reward = document.getElementById("reward");

  const topNum = document.getElementById("topNum");
  const leftNum = document.getElementById("leftNum");
  const rightNum = document.getElementById("rightNum");

  const topAns = document.getElementById("topAns");
  const leftAns = document.getElementById("leftAns");
  const rightAns = document.getElementById("rightAns");

  // ----- State -----
  let maxTop = 10;
  let allowMissingTop = false;

  let score = 0;
  let streak = 0;
  const streakTarget = 5;

  let correctAnswer = null;
  let activeInput = null;

  let retryTimer = null;
  let nextTimer = null;
  let rewardTimer = null;

  // timings
  const wrongRetryMs = 2000;
  const nextAfterCorrectMs = 700;
  const rewardDurationMs = 3000;

  // ----- Helpers -----
  const clampInt = (v, min, max) => Math.max(min, Math.min(max, v));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function clearTimers() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
    if (rewardTimer) { clearTimeout(rewardTimer); rewardTimer = null; }
  }

  function setDots() {
    dots.innerHTML = "";
    for (let i = 0; i < streakTarget; i++) {
      const d = document.createElement("div");
      d.className = "dot" + (i < streak ? " filled" : "");
      dots.appendChild(d);
    }
  }

  function resetInputsVisual() {
    [topAns, leftAns, rightAns].forEach(inp => {
      inp.classList.remove("good", "bad");
      inp.value = "";
      inp.disabled = false;
    });
  }

  function hideAllAnswerInputs() {
    [topAns, leftAns, rightAns].forEach(inp => inp.classList.add("hidden"));
    activeInput = null;
  }

  function showAnswerInput(which) {
    hideAllAnswerInputs();
    resetInputsVisual();

    const map = { top: topAns, left: leftAns, right: rightAns };
    activeInput = map[which];
    activeInput.classList.remove("hidden");
    activeInput.focus();
  }

  function showNumbers({ top, left, right, missing }) {
    // missing: "top" | "left" | "right"
    topNum.textContent = missing === "top" ? "" : String(top);
    leftNum.textContent = missing === "left" ? "" : String(left);
    rightNum.textContent = missing === "right" ? "" : String(right);

    showAnswerInput(missing);
  }

  function updateHud() {
    scoreLabel.textContent = `Score: ${score}`;
    maxText.textContent = `Max: ${maxTop}`;
    setDots();
  }

  function parseAnswer() {
    if (!activeInput) return null;
    const t = activeInput.value.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isInteger(n)) return null;
    return n;
  }

  function setInputState(colorClass, disabled) {
    if (!activeInput) return;
    activeInput.classList.remove("good", "bad");
    if (colorClass) activeInput.classList.add(colorClass);
    activeInput.disabled = !!disabled;
  }

  // ----- Exercise generation -----
  function newExercise() {
    clearTimers();
    reward.classList.add("hidden");

    // choose missing box
    const cases = allowMissingTop ? ["left", "right", "top"] : ["left", "right"];
    const missing = cases[randInt(0, cases.length - 1)];

    let top, left, right;

    if (missing === "top") {
      // pick bottom numbers first, ensure sum <= maxTop and >= 2
      left = randInt(0, maxTop);
      right = randInt(0, maxTop - left);
      top = left + right;

      if (top < 2) {
        top = 2;
        left = randInt(0, top);
        right = top - left;
      }
    } else {
      top = randInt(2, maxTop);
      left = randInt(0, top);
      right = top - left;
    }

    if (missing === "top") correctAnswer = top;
    if (missing === "left") correctAnswer = left;
    if (missing === "right") correctAnswer = right;

    showNumbers({ top, left, right, missing });
    updateHud();
  }

  // ----- Game flow -----
  function onCorrect() {
    setInputState("good", true);
    score += 1;
    streak += 1;
    updateHud();

    if (streak >= streakTarget) {
      // reward
      reward.classList.remove("hidden");

      rewardTimer = setTimeout(() => {
        maxTop += 2;
        streak = 0;
        updateHud();
        newExercise();
      }, rewardDurationMs);
    } else {
      nextTimer = setTimeout(() => newExercise(), nextAfterCorrectMs);
    }
  }

  function onWrong() {
    setInputState("bad", true);
    streak = 0;
    updateHud();

    retryTimer = setTimeout(() => {
      // same exercise, just allow retry
      setInputState(null, false);
      if (activeInput) {
        activeInput.value = "";
        activeInput.focus();
      }
    }, wrongRetryMs);
  }

  function checkAnswerAndReact() {
    if (!activeInput) return;
    if (activeInput.disabled) return; // ignore during timers

    const val = parseAnswer();
    if (val === null) {
      onWrong();
      return;
    }
    if (val === correctAnswer) onCorrect();
    else onWrong();
  }

  // enter key on the active input
  function attachEnterHandlers() {
    [topAns, leftAns, rightAns].forEach(inp => {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") checkAnswerAndReact();
      });
    });
  }

  // ----- Start / Stop -----
  function startGame() {
    startError.textContent = "";

    const n = Number(maxInput.value);
    if (!Number.isInteger(n)) {
      startError.textContent = "Kies een geheel getal (bv. 10).";
      return;
    }
    if (n < 2) {
      startError.textContent = "Kies minstens 2.";
      return;
    }
    if (n > 500) {
      startError.textContent = "Kies iets kleiner (max 500).";
      return;
    }

    maxTop = clampInt(n, 2, 500);
    allowMissingTop = !!allowTopMissing.checked;
    
    const s = Number(startScoreInput.value);
    if (!Number.isInteger(s) || s < 0) {
      startError.textContent = "Startscore moet 0 of groter zijn.";
      return;
    }
    
    score = s;
    streak = 0;
    updateHud();
    

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    newExercise();
  }

  function stopGame() {
    clearTimers();
    // back to start screen
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    startError.textContent = "";
    // focus max input
    maxInput.focus();
  }

  // ----- init -----
  attachEnterHandlers();

  startBtn.addEventListener("click", startGame);
  stopBtn.addEventListener("click", stopGame);

  // allow pressing Enter on start screen
  maxInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startGame();
  });

  // initial dots
  setDots();
})();
