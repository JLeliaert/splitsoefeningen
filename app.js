(() => {
  // ----- DOM -----
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");

  const maxInput = document.getElementById("maxInput");
  const allowTopMissing = document.getElementById("allowTopMissing");
  const startBtn = document.getElementById("startBtn");
  const startError = document.getElementById("startError");
  const startScoreInput = document.getElementById("startScoreInput");
  const threeSplit = document.getElementById("threeSplit");

  const stopBtn = document.getElementById("stopBtn");
  const scoreLabel = document.getElementById("scoreLabel");
  const maxText = document.getElementById("maxText");
  const dots = document.getElementById("dots");
  const reward = document.getElementById("reward");

  const diagram = document.getElementById("diagram");

  const topNum = document.getElementById("topNum");
  const leftNum = document.getElementById("leftNum");
  const rightNum = document.getElementById("rightNum");
  const midNum = document.getElementById("midNum");

  const topAns = document.getElementById("topAns");
  const leftAns = document.getElementById("leftAns");
  const rightAns = document.getElementById("rightAns");
  const midAns = document.getElementById("midAns");

  // ----- State -----
  let maxTop = 10;
  let allowMissingTop = false;
  let isThreeSplit = false;

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

  // Bias toward the middle (still allows 0 and max, just less often)
  // Uses average of 2 uniforms -> triangular-ish distribution.
  const biasedInt = (min, max) => {
    if (max <= min) return min;
    const t = (Math.random() + Math.random()) / 2; // 0..1, peaked around 0.5
    return min + Math.round((max - min) * t);
  };

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
    [topAns, leftAns, midAns, rightAns].forEach(inp => {
      inp.classList.remove("good", "bad");
      inp.value = "";
      inp.disabled = false;
    });
  }

  function hideAllAnswerInputs() {
    [topAns, leftAns, midAns, rightAns].forEach(inp => inp.classList.add("hidden"));
    activeInput = null;
  }

  function showAnswerInput(which) {
    hideAllAnswerInputs();
    resetInputsVisual();

    const map = { top: topAns, left: leftAns, mid: midAns, right: rightAns };
    activeInput = map[which];
    activeInput.classList.remove("hidden");
    activeInput.focus();
  }

  function showNumbers2({ top, left, right, missing }) {
    topNum.textContent = missing === "top" ? "" : String(top);
    leftNum.textContent = missing === "left" ? "" : String(left);
    rightNum.textContent = missing === "right" ? "" : String(right);
    midNum.textContent = "";
    showAnswerInput(missing);
  }

  function showNumbers3({ top, left, mid, right, missing }) {
    topNum.textContent = missing === "top" ? "" : String(top);
    leftNum.textContent = missing === "left" ? "" : String(left);
    midNum.textContent = missing === "mid" ? "" : String(mid);
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

    diagram.classList.toggle("three", isThreeSplit);

    if (!isThreeSplit) {
    let missing;
    if (allowMissingTop && Math.random() < 1/3) {
      missing = "top";
    } else {
      missing = Math.random() < 0.5 ? "left" : "right";
    }

      const top = randInt(2, maxTop);

      // biased split reduces 0 / top extremes
      const left = biasedInt(0, top);
      const right = top - left;

      if (missing === "top") correctAnswer = top;
      if (missing === "left") correctAnswer = left;
      if (missing === "right") correctAnswer = right;

      showNumbers2({ top, left, right, missing });
      updateHud();
      return;
    }

    // 3-split
    let missing;
    if (allowMissingTop && Math.random() < 1/3) {
      missing = "top";
    } else {
      const r = Math.random();
      if (r < 1/3) missing = "left";
      else if (r < 2/3) missing = "mid";
      else missing = "right";
    }

    const top = randInt(2, maxTop);

    // biased 3-way split:
    // pick left biased, then mid biased from remainder, right is rest
    const left = biasedInt(0, top);
    const rem1 = top - left;
    const mid = biasedInt(0, rem1);
    const right = rem1 - mid;

    if (missing === "top") correctAnswer = top;
    if (missing === "left") correctAnswer = left;
    if (missing === "mid") correctAnswer = mid;
    if (missing === "right") correctAnswer = right;

    showNumbers3({ top, left, mid, right, missing });
    updateHud();
  }

  // ----- Game flow -----
  function onCorrect() {
    setInputState("good", true);
    score += 1;
    streak += 1;
    updateHud();

    if (streak >= streakTarget) {
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
      setInputState(null, false);
      if (activeInput) {
        activeInput.value = "";
        activeInput.focus();
      }
    }, wrongRetryMs);
  }

  function checkAnswerAndReact() {
    if (!activeInput) return;
    if (activeInput.disabled) return;

    const val = parseAnswer();
    if (val === null) {
      onWrong();
      return;
    }
    if (val === correctAnswer) onCorrect();
    else onWrong();
  }

  function attachEnterHandlers() {
    [topAns, leftAns, midAns, rightAns].forEach(inp => {
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
    isThreeSplit = !!threeSplit.checked;

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
    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    startError.textContent = "";
    maxInput.focus();
  }

  // ----- init -----
  attachEnterHandlers();

  startBtn.addEventListener("click", startGame);
  stopBtn.addEventListener("click", stopGame);

  maxInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startGame();
  });

  setDots();
})();

