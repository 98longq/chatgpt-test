const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");
const difficultyButtons = document.querySelectorAll(".difficulty-option");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const modeLabelEl = document.getElementById("modeLabel");
const powerStatusEl = document.getElementById("powerStatus");

const W = canvas.width;
const H = canvas.height;
const input = { left: false, right: false, up: false, down: false };
const HIGH_SCORE_KEY = "interstellarCourierHighScore";

const DIFFICULTIES = {
  easy: {
    label: "轻松",
    lives: 4,
    playerSpeed: 390,
    scoreMultiplier: 0.9,
    asteroidSpeedMultiplier: 0.84,
    asteroidIntervalBonus: 0.18,
    crystalInterval: 1.3,
    shieldInterval: 8,
    magnetInterval: 10,
    repairInterval: 12
  },
  normal: {
    label: "普通",
    lives: 3,
    playerSpeed: 360,
    scoreMultiplier: 1,
    asteroidSpeedMultiplier: 1,
    asteroidIntervalBonus: 0,
    crystalInterval: 1.5,
    shieldInterval: 9.5,
    magnetInterval: 11.5,
    repairInterval: 14
  },
  hard: {
    label: "困难",
    lives: 2,
    playerSpeed: 350,
    scoreMultiplier: 1.25,
    asteroidSpeedMultiplier: 1.18,
    asteroidIntervalBonus: -0.1,
    crystalInterval: 1.7,
    shieldInterval: 11.5,
    magnetInterval: 13,
    repairInterval: 16
  }
};

let selectedDifficulty = "normal";

function getDifficulty() {
  return DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.normal;
}

function readHighScore() {
  const saved = Number(localStorage.getItem(HIGH_SCORE_KEY));
  return Number.isFinite(saved) ? saved : 0;
}

function saveHighScore(score) {
  localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)));
}

function createImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const assets = {
  background: createImage("assets/space-bg.svg"),
  player: createImage("assets/player.svg"),
  asteroid: createImage("assets/asteroid.svg"),
  crystal: createImage("assets/crystal.svg"),
  shield: createImage("assets/shield.svg"),
  magnet: createImage("assets/magnet.svg"),
  repair: createImage("assets/repair.svg")
};

const game = {
  started: false,
  running: false,
  paused: false,
  over: false,
  score: 0,
  highScore: readHighScore(),
  lives: 3,
  maxLives: 3,
  level: 1,
  time: 0,
  spawnTimer: 0,
  crystalTimer: 0,
  shieldTimer: 0,
  magnetTimer: 0,
  repairTimer: 0,
  flashTimer: 0,
  bonusText: "",
  bonusTimer: 0,
  player: null,
  asteroids: [],
  crystals: [],
  shields: [],
  magnets: [],
  repairs: [],
  stars: []
};

function formatTimer(value) {
  return `${Math.ceil(value)}秒`;
}

function updateHud() {
  const difficulty = getDifficulty();
  const activePowers = [];

  scoreEl.textContent = Math.floor(game.score);
  highScoreEl.textContent = Math.max(game.highScore, Math.floor(game.score));
  livesEl.textContent = `${game.lives}/${game.maxLives}`;
  levelEl.textContent = game.level;
  modeLabelEl.textContent = difficulty.label;

  if (game.player) {
    if (game.player.shield > 0) activePowers.push(`护盾${formatTimer(game.player.shield)}`);
    if (game.player.magnet > 0) activePowers.push(`磁吸${formatTimer(game.player.magnet)}`);
  }

  powerStatusEl.textContent = activePowers.length ? activePowers.join(" · ") : "无";
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function showStartOverlay() {
  overlay.classList.remove("hidden");
  overlayTitle.textContent = "准备启程";
  overlayText.textContent = "选择难度后开始任务。躲开陨石，收集蓝色晶体和各种能量道具。";
  startButton.classList.remove("hidden");
  restartButton.classList.add("hidden");
  difficultyButtons.forEach((button) => {
    button.disabled = false;
  });
}

function updateHighScore() {
  const finalScore = Math.floor(game.score);
  if (finalScore > game.highScore) {
    game.highScore = finalScore;
    saveHighScore(game.highScore);
  }
}

function showGameOverOverlay() {
  updateHighScore();
  overlay.classList.remove("hidden");
  overlayTitle.textContent = "任务结束";
  overlayText.textContent = `本局 ${Math.floor(game.score)} 分，历史最高 ${game.highScore} 分，${getDifficulty().label}模式下最高到达 ${game.level} 级。再来一局吧！`;
  startButton.classList.add("hidden");
  restartButton.classList.remove("hidden");
  difficultyButtons.forEach((button) => {
    button.disabled = false;
  });
  updateHud();
}

function showFloatingBonus(text) {
  game.bonusText = text;
  game.bonusTimer = 1.2;
}

function resetGame() {
  const difficulty = getDifficulty();

  game.started = true;
  game.running = true;
  game.paused = false;
  game.over = false;
  game.score = 0;
  game.lives = difficulty.lives;
  game.maxLives = difficulty.lives;
  game.level = 1;
  game.time = 0;
  game.spawnTimer = 0;
  game.crystalTimer = 0;
  game.shieldTimer = 0;
  game.magnetTimer = 0;
  game.repairTimer = 0;
  game.flashTimer = 0;
  game.bonusText = "";
  game.bonusTimer = 0;
  game.asteroids = [];
  game.crystals = [];
  game.shields = [];
  game.magnets = [];
  game.repairs = [];
  game.stars = Array.from({ length: 32 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 1 + Math.random() * 2,
    a: 0.25 + Math.random() * 0.5,
    s: 8 + Math.random() * 22
  }));
  game.player = {
    x: W * 0.5 - 35,
    y: H - 120,
    w: 70,
    h: 70,
    speed: difficulty.playerSpeed,
    invincible: 0,
    shield: 0,
    magnet: 0
  };

  difficultyButtons.forEach((button) => {
    button.disabled = true;
  });
  updateHud();
  hideOverlay();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnAsteroid() {
  const difficulty = getDifficulty();
  const size = 34 + Math.random() * 40;
  game.asteroids.push({
    x: Math.random() * (W - size),
    y: -size,
    w: size,
    h: size,
    vy: (180 + Math.random() * 140 + game.level * 22) * difficulty.asteroidSpeedMultiplier,
    drift: (Math.random() * 2 - 1) * 45,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() * 2 - 1) * 2.2
  });
}

function spawnCrystal() {
  const size = 30 + Math.random() * 18;
  game.crystals.push({
    x: Math.random() * (W - size),
    y: -size,
    w: size,
    h: size,
    vy: 150 + Math.random() * 90,
    sway: Math.random() * Math.PI * 2
  });
}

function spawnShield() {
  const size = 42 + Math.random() * 12;
  game.shields.push({
    x: Math.random() * (W - size),
    y: -size,
    w: size,
    h: size,
    vy: 115 + Math.random() * 70,
    sway: Math.random() * Math.PI * 2,
    pulse: Math.random() * Math.PI * 2
  });
}

function spawnMagnet() {
  const size = 44 + Math.random() * 10;
  game.magnets.push({
    x: Math.random() * (W - size),
    y: -size,
    w: size,
    h: size,
    vy: 120 + Math.random() * 70,
    sway: Math.random() * Math.PI * 2,
    pulse: Math.random() * Math.PI * 2
  });
}

function spawnRepair() {
  const size = 42 + Math.random() * 12;
  game.repairs.push({
    x: Math.random() * (W - size),
    y: -size,
    w: size,
    h: size,
    vy: 118 + Math.random() * 68,
    sway: Math.random() * Math.PI * 2,
    pulse: Math.random() * Math.PI * 2
  });
}

function takeHit() {
  if (game.player.invincible > 0) return;

  if (game.player.shield > 0) {
    game.player.shield = 0;
    game.player.invincible = 0.8;
    game.flashTimer = 0.25;
    showFloatingBonus("护盾抵挡！");
    updateHud();
    return;
  }

  game.lives -= 1;
  game.player.invincible = 1.2;
  game.flashTimer = 0.5;
  if (game.lives <= 0) {
    game.lives = 0;
    game.running = false;
    game.over = true;
    showGameOverOverlay();
  }
  updateHud();
}

function pullTowardPlayer(item, dt, range = 190, strength = 620) {
  if (!game.player || game.player.magnet <= 0) return;

  const playerCenterX = game.player.x + game.player.w / 2;
  const playerCenterY = game.player.y + game.player.h / 2;
  const itemCenterX = item.x + item.w / 2;
  const itemCenterY = item.y + item.h / 2;
  const dx = playerCenterX - itemCenterX;
  const dy = playerCenterY - itemCenterY;
  const distance = Math.hypot(dx, dy);

  if (distance > 0 && distance < range) {
    const pull = (1 - distance / range) * strength * dt;
    item.x += (dx / distance) * pull;
    item.y += (dy / distance) * pull;
  }
}

function updateFallingItem(item, dt, swaySpeed, swayAmount) {
  item.y += item.vy * dt;
  item.sway += dt * swaySpeed;
  item.pulse += dt * 5;
  item.x += Math.sin(item.sway) * swayAmount * dt;
  pullTowardPlayer(item, dt);
}

function update(dt) {
  if (!game.running || game.paused) return;

  const difficulty = getDifficulty();

  game.time += dt;
  game.level = 1 + Math.floor(game.time / 15);
  game.score += dt * (5 + game.level * 0.6) * difficulty.scoreMultiplier;
  game.player.invincible = Math.max(0, game.player.invincible - dt);
  game.player.shield = Math.max(0, game.player.shield - dt);
  game.player.magnet = Math.max(0, game.player.magnet - dt);
  game.flashTimer = Math.max(0, game.flashTimer - dt);
  game.bonusTimer = Math.max(0, game.bonusTimer - dt);

  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;

  game.player.x += (moveX / len) * game.player.speed * dt;
  game.player.y += (moveY / len) * game.player.speed * dt;
  game.player.x = Math.max(10, Math.min(W - game.player.w - 10, game.player.x));
  game.player.y = Math.max(20, Math.min(H - game.player.h - 10, game.player.y));

  const asteroidInterval = Math.max(0.22, 1.0 + difficulty.asteroidIntervalBonus - game.level * 0.05);
  game.spawnTimer += dt;
  if (game.spawnTimer >= asteroidInterval) {
    game.spawnTimer = 0;
    spawnAsteroid();
  }

  game.crystalTimer += dt;
  if (game.crystalTimer >= difficulty.crystalInterval) {
    game.crystalTimer = 0;
    spawnCrystal();
  }

  const shieldInterval = Math.max(5.5, difficulty.shieldInterval - game.level * 0.2);
  game.shieldTimer += dt;
  if (game.shieldTimer >= shieldInterval) {
    game.shieldTimer = 0;
    spawnShield();
  }

  const magnetInterval = Math.max(6.5, difficulty.magnetInterval - game.level * 0.16);
  game.magnetTimer += dt;
  if (game.magnetTimer >= magnetInterval) {
    game.magnetTimer = 0;
    spawnMagnet();
  }

  const repairInterval = Math.max(8, difficulty.repairInterval - game.level * 0.12);
  game.repairTimer += dt;
  if (game.repairTimer >= repairInterval) {
    game.repairTimer = 0;
    spawnRepair();
  }

  game.stars.forEach((star) => {
    star.y += star.s * dt;
    if (star.y > H) {
      star.y = -4;
      star.x = Math.random() * W;
    }
  });

  game.asteroids = game.asteroids.filter((a) => a.y < H + a.h + 10);
  game.crystals = game.crystals.filter((c) => c.y < H + c.h + 10);
  game.shields = game.shields.filter((s) => s.y < H + s.h + 10);
  game.magnets = game.magnets.filter((m) => m.y < H + m.h + 10);
  game.repairs = game.repairs.filter((r) => r.y < H + r.h + 10);

  for (const asteroid of game.asteroids) {
    asteroid.y += asteroid.vy * dt;
    asteroid.x += asteroid.drift * dt;
    asteroid.rotation += asteroid.spin * dt;
    if (asteroid.x < -20) asteroid.x = W + 20;
    if (asteroid.x > W + 20) asteroid.x = -20;
    if (rectsOverlap(game.player, asteroid)) {
      asteroid.y = H + 200;
      takeHit();
    }
  }

  for (const crystal of game.crystals) {
    crystal.y += crystal.vy * dt;
    crystal.sway += dt * 4;
    crystal.x += Math.sin(crystal.sway) * 24 * dt;
    pullTowardPlayer(crystal, dt, 210, 720);
    if (rectsOverlap(game.player, crystal)) {
      crystal.y = H + 200;
      game.score += 10;
      showFloatingBonus("+10 晶体");
      updateHud();
    }
  }

  for (const shield of game.shields) {
    updateFallingItem(shield, dt, 3, 18);
    if (rectsOverlap(game.player, shield)) {
      shield.y = H + 200;
      game.player.shield = 7;
      game.score += 5;
      showFloatingBonus("+5 护盾");
      updateHud();
    }
  }

  for (const magnet of game.magnets) {
    updateFallingItem(magnet, dt, 3.4, 18);
    if (rectsOverlap(game.player, magnet)) {
      magnet.y = H + 200;
      game.player.magnet = 8;
      game.score += 8;
      showFloatingBonus("+8 磁吸");
      updateHud();
    }
  }

  for (const repair of game.repairs) {
    updateFallingItem(repair, dt, 3.2, 16);
    if (rectsOverlap(game.player, repair)) {
      repair.y = H + 200;
      if (game.lives < game.maxLives) {
        game.lives += 1;
        game.score += 12;
        showFloatingBonus("+1 生命");
      } else {
        game.score += 22;
        showFloatingBonus("+22 满血奖励");
      }
      updateHud();
    }
  }

  updateHud();
}

function drawBackground() {
  if (assets.background.complete) {
    ctx.drawImage(assets.background, 0, 0, W, H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#102a58");
    grad.addColorStop(1, "#050912");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  for (const star of game.stars) {
    ctx.globalAlpha = star.a;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(4, 9, 20, 0.15)";
  ctx.fillRect(0, 0, W, H);
}

function drawHudPanel() {
  ctx.fillStyle = "rgba(9, 18, 35, 0.40)";
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 44, W, 1);
}

function drawPlayerShield() {
  if (!game.player || game.player.shield <= 0) return;

  const cx = game.player.x + game.player.w / 2;
  const cy = game.player.y + game.player.h / 2;
  const radius = 48 + Math.sin(game.time * 8) * 3;
  const alpha = Math.min(0.72, 0.32 + game.player.shield * 0.06);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#67e1ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.28;
  ctx.fillStyle = "#5ce5ff";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerMagnet() {
  if (!game.player || game.player.magnet <= 0) return;

  const cx = game.player.x + game.player.w / 2;
  const cy = game.player.y + game.player.h / 2;
  const radius = 74 + Math.sin(game.time * 6) * 6;

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = "#ffc93b";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#67e1ff";
  ctx.lineWidth = 8;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  drawPlayerMagnet();
  drawPlayerShield();
  if (game.player.invincible > 0 && Math.floor(game.player.invincible * 10) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }
  ctx.drawImage(assets.player, game.player.x, game.player.y, game.player.w, game.player.h);
  ctx.globalAlpha = 1;
}

function drawAsteroids() {
  for (const asteroid of game.asteroids) {
    ctx.save();
    ctx.translate(asteroid.x + asteroid.w / 2, asteroid.y + asteroid.h / 2);
    ctx.rotate(asteroid.rotation);
    ctx.drawImage(assets.asteroid, -asteroid.w / 2, -asteroid.h / 2, asteroid.w, asteroid.h);
    ctx.restore();
  }
}

function drawCrystals() {
  for (const crystal of game.crystals) {
    ctx.save();
    ctx.translate(crystal.x + crystal.w / 2, crystal.y + crystal.h / 2);
    ctx.rotate(Math.sin(crystal.sway) * 0.18);
    ctx.drawImage(assets.crystal, -crystal.w / 2, -crystal.h / 2, crystal.w, crystal.h);
    ctx.restore();
  }
}

function drawPowerUps() {
  const drawItem = (item, image) => {
    const scale = 1 + Math.sin(item.pulse) * 0.06;
    ctx.save();
    ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
    ctx.rotate(Math.sin(item.sway) * 0.16);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -item.w / 2, -item.h / 2, item.w, item.h);
    ctx.restore();
  };

  for (const shield of game.shields) drawItem(shield, assets.shield);
  for (const magnet of game.magnets) drawItem(magnet, assets.magnet);
  for (const repair of game.repairs) drawItem(repair, assets.repair);
}

function drawBonusText() {
  if (!game.player || game.bonusTimer <= 0 || !game.bonusText) return;

  const alpha = Math.min(1, game.bonusTimer);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "bold 22px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(5, 14, 32, 0.8)";
  ctx.lineWidth = 5;
  const x = game.player.x + game.player.w / 2;
  const y = game.player.y - 18 - (1.2 - game.bonusTimer) * 18;
  ctx.strokeText(game.bonusText, x, y);
  ctx.fillText(game.bonusText, x, y);
  ctx.restore();
}

function drawEffects() {
  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 100, 100, ${game.flashTimer * 0.18})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawBonusText();

  if (game.paused) {
    ctx.fillStyle = "rgba(2, 6, 14, 0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("已暂停", W / 2, H / 2 - 8);
    ctx.font = "20px Segoe UI";
    ctx.fillText("点击“暂停 / 继续”或按 P 键恢复", W / 2, H / 2 + 30);
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawHudPanel();
  drawCrystals();
  drawPowerUps();
  drawAsteroids();
  if (game.player) drawPlayer();
  drawEffects();
}

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function keyToInput(code, value) {
  if (code === "ArrowLeft" || code === "KeyA") input.left = value;
  if (code === "ArrowRight" || code === "KeyD") input.right = value;
  if (code === "ArrowUp" || code === "KeyW") input.up = value;
  if (code === "ArrowDown" || code === "KeyS") input.down = value;
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === "KeyP") togglePause();
  keyToInput(e.code, true);
});
window.addEventListener("keyup", (e) => keyToInput(e.code, false));

function bindTouchButton(btn, dir) {
  const activate = (ev) => {
    ev.preventDefault();
    input[dir] = true;
  };
  const deactivate = (ev) => {
    ev.preventDefault();
    input[dir] = false;
  };
  btn.addEventListener("pointerdown", activate);
  btn.addEventListener("pointerup", deactivate);
  btn.addEventListener("pointerleave", deactivate);
  btn.addEventListener("pointercancel", deactivate);
}

for (const btn of document.querySelectorAll(".ctrl")) {
  bindTouchButton(btn, btn.dataset.dir);
}

function selectDifficulty(mode) {
  if (game.running) return;
  if (!DIFFICULTIES[mode]) return;

  selectedDifficulty = mode;
  difficultyButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  updateHud();
}

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => selectDifficulty(button.dataset.mode));
});

function togglePause() {
  if (!game.started || game.over) return;
  game.paused = !game.paused;
}

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);
pauseButton.addEventListener("click", togglePause);

updateHud();
showStartOverlay();
requestAnimationFrame(loop);
