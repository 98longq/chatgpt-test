const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");
const dashButton = document.getElementById("dashButton");
const difficultyButtons = document.querySelectorAll(".difficulty-option");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const modeLabelEl = document.getElementById("modeLabel");
const powerStatusEl = document.getElementById("powerStatus");
const missionStatusEl = document.getElementById("missionStatus");
const comboStatusEl = document.getElementById("comboStatus");
const dashStatusEl = document.getElementById("dashStatus");

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
    repairInterval: 12,
    packageInterval: 9,
    stormEvery: 36
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
    repairInterval: 14,
    packageInterval: 10.5,
    stormEvery: 32
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
    repairInterval: 16,
    packageInterval: 12,
    stormEvery: 28
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
  repair: createImage("assets/repair.svg"),
  package: createImage("assets/package.svg"),
  gate: createImage("assets/gate.svg"),
  comet: createImage("assets/comet.svg")
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
  packageTimer: 0,
  cometTimer: 0,
  stormTimer: 0,
  stormWarning: 0,
  stormActive: 0,
  stormCount: 0,
  flashTimer: 0,
  bonusText: "",
  bonusTimer: 0,
  combo: 0,
  comboTimer: 0,
  comboMultiplier: 1,
  deliveryStreak: 0,
  carryingPackage: false,
  player: null,
  asteroids: [],
  comets: [],
  crystals: [],
  shields: [],
  magnets: [],
  repairs: [],
  packages: [],
  gate: null,
  stars: []
};

function formatTimer(value) {
  return `${Math.ceil(value)}秒`;
}

function getComboMultiplier() {
  if (game.combo <= 1 || game.comboTimer <= 0) return 1;
  return Math.min(5, 1 + Math.floor((game.combo - 1) / 3) * 0.5);
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
  missionStatusEl.textContent = game.carryingPackage ? "投递中" : "待接单";
  comboStatusEl.textContent = game.comboTimer > 0 ? `x${game.comboMultiplier.toFixed(1)}` : "x1";
  dashStatusEl.textContent = game.player && game.player.dashCooldown <= 0 ? "可用" : formatTimer(game.player ? game.player.dashCooldown : 0);
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function showStartOverlay() {
  overlay.classList.remove("hidden");
  overlayTitle.textContent = "准备启程";
  overlayText.textContent = "选择难度后开始任务。接包裹、找传送门投递，利用冲刺穿过流星雨。";
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
  overlayText.textContent = `本局 ${Math.floor(game.score)} 分，历史最高 ${game.highScore} 分，完成 ${game.deliveryStreak} 次投递，${getDifficulty().label}模式下最高到达 ${game.level} 级。`;
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

function addScore(baseScore, label, comboable = true) {
  if (comboable) {
    game.combo = game.comboTimer > 0 ? game.combo + 1 : 1;
    game.comboTimer = 3.2;
    game.comboMultiplier = getComboMultiplier();
  }

  const difficulty = getDifficulty();
  const multiplier = comboable ? game.comboMultiplier : 1;
  const points = Math.round(baseScore * multiplier * difficulty.scoreMultiplier);
  game.score += points;

  const suffix = multiplier > 1 ? ` x${multiplier.toFixed(1)}` : "";
  showFloatingBonus(`+${points} ${label}${suffix}`);
  updateHud();
  return points;
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
  game.packageTimer = 0;
  game.cometTimer = 0;
  game.stormTimer = difficulty.stormEvery - 8;
  game.stormWarning = 0;
  game.stormActive = 0;
  game.stormCount = 0;
  game.flashTimer = 0;
  game.bonusText = "";
  game.bonusTimer = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.comboMultiplier = 1;
  game.deliveryStreak = 0;
  game.carryingPackage = false;
  game.gate = null;
  game.asteroids = [];
  game.comets = [];
  game.crystals = [];
  game.shields = [];
  game.magnets = [];
  game.repairs = [];
  game.packages = [];
  game.stars = Array.from({ length: 34 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 1 + Math.random() * 2,
    a: 0.25 + Math.random() * 0.5,
    s: 8 + Math.random() * 24
  }));
  game.player = {
    x: W * 0.5 - 35,
    y: H - 120,
    w: 70,
    h: 70,
    speed: difficulty.playerSpeed,
    invincible: 0,
    shield: 0,
    magnet: 0,
    dashCooldown: 0,
    dashTimer: 0,
    dashVx: 0,
    dashVy: -1
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

function spawnComet() {
  const fromLeft = Math.random() > 0.5;
  const y = 80 + Math.random() * (H - 180);
  game.comets.push({
    x: fromLeft ? -190 : W + 30,
    y,
    w: 150,
    h: 75,
    vx: (fromLeft ? 1 : -1) * (520 + Math.random() * 220 + game.level * 18),
    rotation: fromLeft ? 0 : Math.PI,
    warningY: y + 38
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

function spawnPackage() {
  if (game.carryingPackage || game.packages.length > 0 || game.gate) return;

  const size = 48 + Math.random() * 10;
  game.packages.push({
    x: Math.random() * (W - size),
    y: -size,
    w: size,
    h: size,
    vy: 118 + Math.random() * 50,
    sway: Math.random() * Math.PI * 2,
    pulse: Math.random() * Math.PI * 2
  });
}

function spawnGate() {
  const size = 86;
  game.gate = {
    x: 80 + Math.random() * (W - 160 - size),
    y: 70 + Math.random() * (H - 210),
    w: size,
    h: size,
    pulse: 0,
    life: 13
  };
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
  game.combo = 0;
  game.comboTimer = 0;
  game.comboMultiplier = 1;
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

function tryDash() {
  if (!game.running || game.paused || !game.player) return;
  if (game.player.dashCooldown > 0 || game.player.dashTimer > 0) return;

  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;

  game.player.dashVx = moveX / len;
  game.player.dashVy = moveY / len || -1;
  game.player.dashTimer = 0.18;
  game.player.dashCooldown = 4.2;
  game.player.invincible = Math.max(game.player.invincible, 0.24);
  showFloatingBonus("冲刺！");
}

function updateStorm(dt) {
  const difficulty = getDifficulty();

  if (game.stormWarning > 0) {
    game.stormWarning = Math.max(0, game.stormWarning - dt);
    if (game.stormWarning <= 0) {
      game.stormActive = 5.4;
      game.cometTimer = 0;
      showFloatingBonus("流星雨来了！");
    }
    return;
  }

  if (game.stormActive > 0) {
    game.stormActive = Math.max(0, game.stormActive - dt);
    game.cometTimer += dt;
    if (game.cometTimer >= 0.55) {
      game.cometTimer = 0;
      spawnComet();
    }
    return;
  }

  game.stormTimer += dt;
  if (game.stormTimer >= Math.max(18, difficulty.stormEvery - game.level * 0.4)) {
    game.stormTimer = 0;
    game.stormWarning = 3;
    game.stormCount += 1;
    showFloatingBonus("流星雨预警！");
  }
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
  game.player.dashCooldown = Math.max(0, game.player.dashCooldown - dt);
  game.player.dashTimer = Math.max(0, game.player.dashTimer - dt);
  game.flashTimer = Math.max(0, game.flashTimer - dt);
  game.bonusTimer = Math.max(0, game.bonusTimer - dt);
  game.comboTimer = Math.max(0, game.comboTimer - dt);
  if (game.comboTimer <= 0) {
    game.combo = 0;
    game.comboMultiplier = 1;
  } else {
    game.comboMultiplier = getComboMultiplier();
  }

  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;

  if (game.player.dashTimer > 0) {
    game.player.x += game.player.dashVx * 1120 * dt;
    game.player.y += game.player.dashVy * 1120 * dt;
  } else {
    game.player.x += (moveX / len) * game.player.speed * dt;
    game.player.y += (moveY / len) * game.player.speed * dt;
  }

  game.player.x = Math.max(10, Math.min(W - game.player.w - 10, game.player.x));
  game.player.y = Math.max(20, Math.min(H - game.player.h - 10, game.player.y));

  updateStorm(dt);

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

  game.packageTimer += dt;
  if (game.packageTimer >= Math.max(7, difficulty.packageInterval - game.level * 0.1)) {
    game.packageTimer = 0;
    spawnPackage();
  }

  game.stars.forEach((star) => {
    star.y += star.s * dt;
    if (game.stormActive > 0) star.y += 45 * dt;
    if (star.y > H) {
      star.y = -4;
      star.x = Math.random() * W;
    }
  });

  game.asteroids = game.asteroids.filter((a) => a.y < H + a.h + 10);
  game.comets = game.comets.filter((c) => c.x > -220 && c.x < W + 220);
  game.crystals = game.crystals.filter((c) => c.y < H + c.h + 10);
  game.shields = game.shields.filter((s) => s.y < H + s.h + 10);
  game.magnets = game.magnets.filter((m) => m.y < H + m.h + 10);
  game.repairs = game.repairs.filter((r) => r.y < H + r.h + 10);
  game.packages = game.packages.filter((p) => p.y < H + p.h + 10);

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

  for (const comet of game.comets) {
    comet.x += comet.vx * dt;
    if (rectsOverlap(game.player, comet)) {
      comet.x = comet.vx > 0 ? W + 260 : -260;
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
      addScore(10, "晶体");
    }
  }

  for (const shield of game.shields) {
    updateFallingItem(shield, dt, 3, 18);
    if (rectsOverlap(game.player, shield)) {
      shield.y = H + 200;
      game.player.shield = 7;
      addScore(5, "护盾");
    }
  }

  for (const magnet of game.magnets) {
    updateFallingItem(magnet, dt, 3.4, 18);
    if (rectsOverlap(game.player, magnet)) {
      magnet.y = H + 200;
      game.player.magnet = 8;
      addScore(8, "磁吸");
    }
  }

  for (const repair of game.repairs) {
    updateFallingItem(repair, dt, 3.2, 16);
    if (rectsOverlap(game.player, repair)) {
      repair.y = H + 200;
      if (game.lives < game.maxLives) {
        game.lives += 1;
        addScore(12, "维修");
      } else {
        addScore(22, "满血奖励");
      }
    }
  }

  for (const pack of game.packages) {
    updateFallingItem(pack, dt, 2.8, 14);
    if (rectsOverlap(game.player, pack)) {
      pack.y = H + 200;
      game.carryingPackage = true;
      spawnGate();
      addScore(12, "接单");
    }
  }

  if (game.gate) {
    game.gate.pulse += dt * 4.5;
    game.gate.life -= dt;
    if (rectsOverlap(game.player, game.gate)) {
      game.deliveryStreak += 1;
      game.carryingPackage = false;
      addScore(46 + game.deliveryStreak * 12 + game.level * 4, `投递${game.deliveryStreak}连`);
      game.gate = null;
      game.packageTimer = Math.max(0, game.packageTimer - 5);
    } else if (game.gate.life <= 0) {
      game.carryingPackage = false;
      game.gate = null;
      game.combo = 0;
      game.comboTimer = 0;
      game.comboMultiplier = 1;
      showFloatingBonus("投递超时");
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
  ctx.fillStyle = game.stormActive > 0 ? "rgba(44, 8, 22, 0.22)" : "rgba(4, 9, 20, 0.15)";
  ctx.fillRect(0, 0, W, H);
}

function drawHudPanel() {
  ctx.fillStyle = "rgba(9, 18, 35, 0.40)";
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 44, W, 1);
}

function drawStormWarning() {
  if (game.stormWarning <= 0) return;

  const alpha = 0.24 + Math.sin(game.time * 12) * 0.12;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffb73a";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(`流星雨 ${Math.ceil(game.stormWarning)} 秒后抵达`, W / 2, 78);
  ctx.restore();
}

function drawGate() {
  if (!game.gate) return;

  const scale = 1 + Math.sin(game.gate.pulse) * 0.08;
  ctx.save();
  ctx.translate(game.gate.x + game.gate.w / 2, game.gate.y + game.gate.h / 2);
  ctx.rotate(Math.sin(game.gate.pulse * 0.5) * 0.08);
  ctx.scale(scale, scale);
  ctx.drawImage(assets.gate, -game.gate.w / 2, -game.gate.h / 2, game.gate.w, game.gate.h);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(`投递 ${Math.ceil(game.gate.life)}秒`, game.gate.x + game.gate.w / 2, game.gate.y - 10);
  ctx.restore();
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

function drawPlayerDashTrail() {
  if (!game.player || game.player.dashTimer <= 0) return;

  ctx.save();
  ctx.globalAlpha = 0.36;
  ctx.fillStyle = "#67e1ff";
  ctx.beginPath();
  ctx.ellipse(
    game.player.x + game.player.w / 2 - game.player.dashVx * 32,
    game.player.y + game.player.h / 2 - game.player.dashVy * 32,
    42,
    16,
    Math.atan2(game.player.dashVy, game.player.dashVx),
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  drawPlayerMagnet();
  drawPlayerShield();
  drawPlayerDashTrail();
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

function drawComets() {
  for (const comet of game.comets) {
    ctx.save();
    ctx.translate(comet.x + comet.w / 2, comet.y + comet.h / 2);
    ctx.rotate(comet.rotation);
    ctx.drawImage(assets.comet, -comet.w / 2, -comet.h / 2, comet.w, comet.h);
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

  for (const pack of game.packages) drawItem(pack, assets.package);
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

function drawComboNotice() {
  if (game.comboTimer <= 0 || game.comboMultiplier <= 1) return;

  ctx.save();
  ctx.globalAlpha = Math.min(0.92, 0.45 + game.comboTimer * 0.15);
  ctx.font = "bold 28px Segoe UI";
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffcc55";
  ctx.strokeStyle = "rgba(5, 14, 32, 0.8)";
  ctx.lineWidth = 5;
  const text = `COMBO x${game.comboMultiplier.toFixed(1)}`;
  ctx.strokeText(text, W - 24, 84);
  ctx.fillText(text, W - 24, 84);
  ctx.restore();
}

function drawEffects() {
  if (game.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 100, 100, ${game.flashTimer * 0.18})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawStormWarning();
  drawComboNotice();
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
  drawGate();
  drawCrystals();
  drawPowerUps();
  drawAsteroids();
  drawComets();
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
  if (e.code === "Space") tryDash();
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
dashButton.addEventListener("click", tryDash);

updateHud();
showStartOverlay();
requestAnimationFrame(loop);
