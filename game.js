const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");

const W = canvas.width;
const H = canvas.height;
const input = { left: false, right: false, up: false, down: false };
const HIGH_SCORE_KEY = "interstellarCourierHighScore";

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
  shield: createImage("assets/shield.svg")
};

const game = {
  started: false,
  running: false,
  paused: false,
  over: false,
  score: 0,
  highScore: readHighScore(),
  lives: 3,
  level: 1,
  time: 0,
  spawnTimer: 0,
  crystalTimer: 0,
  shieldTimer: 0,
  flashTimer: 0,
  player: null,
  asteroids: [],
  crystals: [],
  shields: [],
  stars: []
};

function updateHud() {
  scoreEl.textContent = Math.floor(game.score);
  highScoreEl.textContent = Math.max(game.highScore, Math.floor(game.score));
  livesEl.textContent = game.lives;
  levelEl.textContent = game.level;
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function showStartOverlay() {
  overlay.classList.remove("hidden");
  overlayTitle.textContent = "准备启程";
  overlayText.textContent = "使用方向键 / WASD 或下方按钮移动，躲开陨石，收集蓝色晶体和能量护盾。";
  startButton.classList.remove("hidden");
  restartButton.classList.add("hidden");
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
  overlayText.textContent = `本局 ${Math.floor(game.score)} 分，历史最高 ${game.highScore} 分，最高到达 ${game.level} 级。再来一局吧！`;
  startButton.classList.add("hidden");
  restartButton.classList.remove("hidden");
  updateHud();
}

function resetGame() {
  game.started = true;
  game.running = true;
  game.paused = false;
  game.over = false;
  game.score = 0;
  game.lives = 3;
  game.level = 1;
  game.time = 0;
  game.spawnTimer = 0;
  game.crystalTimer = 0;
  game.shieldTimer = 0;
  game.flashTimer = 0;
  game.asteroids = [];
  game.crystals = [];
  game.shields = [];
  game.stars = Array.from({ length: 26 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 1 + Math.random() * 2,
    a: 0.25 + Math.random() * 0.5,
    s: 8 + Math.random() * 18
  }));
  game.player = {
    x: W * 0.5 - 35,
    y: H - 120,
    w: 70,
    h: 70,
    speed: 360,
    invincible: 0,
    shield: 0
  };
  updateHud();
  hideOverlay();
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnAsteroid() {
  const size = 34 + Math.random() * 40;
  game.asteroids.push({
    x: Math.random() * (W - size),
    y: -size,
    w: size,
    h: size,
    vy: 180 + Math.random() * 140 + game.level * 22,
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

function takeHit() {
  if (game.player.invincible > 0) return;

  if (game.player.shield > 0) {
    game.player.shield = 0;
    game.player.invincible = 0.8;
    game.flashTimer = 0.25;
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

function update(dt) {
  if (!game.running || game.paused) return;

  game.time += dt;
  game.level = 1 + Math.floor(game.time / 15);
  game.score += dt * (5 + game.level * 0.6);
  game.player.invincible = Math.max(0, game.player.invincible - dt);
  game.player.shield = Math.max(0, game.player.shield - dt);
  game.flashTimer = Math.max(0, game.flashTimer - dt);

  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;

  game.player.x += (moveX / len) * game.player.speed * dt;
  game.player.y += (moveY / len) * game.player.speed * dt;
  game.player.x = Math.max(10, Math.min(W - game.player.w - 10, game.player.x));
  game.player.y = Math.max(20, Math.min(H - game.player.h - 10, game.player.y));

  const asteroidInterval = Math.max(0.28, 1.0 - game.level * 0.05);
  game.spawnTimer += dt;
  if (game.spawnTimer >= asteroidInterval) {
    game.spawnTimer = 0;
    spawnAsteroid();
  }

  game.crystalTimer += dt;
  if (game.crystalTimer >= 1.5) {
    game.crystalTimer = 0;
    spawnCrystal();
  }

  const shieldInterval = Math.max(5.5, 9.5 - game.level * 0.2);
  game.shieldTimer += dt;
  if (game.shieldTimer >= shieldInterval) {
    game.shieldTimer = 0;
    spawnShield();
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
    if (rectsOverlap(game.player, crystal)) {
      crystal.y = H + 200;
      game.score += 10;
      updateHud();
    }
  }

  for (const shield of game.shields) {
    shield.y += shield.vy * dt;
    shield.sway += dt * 3;
    shield.pulse += dt * 5;
    shield.x += Math.sin(shield.sway) * 18 * dt;
    if (rectsOverlap(game.player, shield)) {
      shield.y = H + 200;
      game.player.shield = 7;
      game.score += 5;
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

function drawPlayer() {
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

function drawShields() {
  for (const shield of game.shields) {
    const scale = 1 + Math.sin(shield.pulse) * 0.06;
    ctx.save();
    ctx.translate(shield.x + shield.w / 2, shield.y + shield.h / 2);
    ctx.rotate(Math.sin(shield.sway) * 0.16);
    ctx.scale(scale, scale);
    ctx.drawImage(assets.shield, -shield.w / 2, -shield.h / 2, shield.w, shield.h);
    ctx.restore();
  }
}

function drawEffects() {
  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 100, 100, ${game.flashTimer * 0.18})`;
    ctx.fillRect(0, 0, W, H);
  }

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
  drawShields();
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
