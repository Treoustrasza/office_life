// ============================================================
//  app.js — 交互逻辑
//  时钟、角色移动、AI行为、弹窗、随机事件等
// ============================================================

// ===== 区域配置 =====
const ZONES = ['office', 'kitchen', 'toilet'];
const ZONE_IDS = { office: 'office-area', kitchen: 'kitchen-area', toilet: 'toilet-area' };

// ===== 可见角色集合（从 characters.js 的 defaultVisible 初始化）=====
const visibleChars = new Set(defaultVisible);

// ===== 游戏状态 =====
let coffeeCount = 0, fishIndex = 0;

// ===== 现实时钟 =====
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('clock').textContent =
   + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}
updateClock();
setInterval(updateClock, 1000);

// ===== 摸鱼指数自增 =====
setInterval(() => {
  fishIndex = Math.min(100, fishIndex + 1);
  document.getElementById('stat-fish').textContent = fishIndex;
  if (fishIndex >= 100) fishIndex = 0;
}, 3000);

// ===== 初始化角色 =====
function initCharacters() {
  characters.forEach(c => {
    const el = document.getElementById('char-' + c.slug);
    if (!el) return;
    el.dataset.zone = c.zone;
    el.style.display = visibleChars.has(c.slug) ? '' : 'none';
    const zoneEl = document.getElementById(ZONE_IDS[c.zone]);
    if (zoneEl && el.parentElement !== zoneEl) zoneEl.appendChild(el);
  });
  updateStatCount();
  buildAvatarPanel();
}

function updateStatCount() {
  document.getElementById('stat-count').textContent = visibleChars.size;
}

// ===== 构建头像面板 =====
function buildAvatarPanel() {
  const panel = document.getElementById('char-panel');
  Array.from(panel.querySelectorAll('.char-avatar')).forEach(a => a.remove());
  characters.forEach(c => {
    const div = document.createElement('div');
    div.className = 'char-avatar' + (visibleChars.has(c.slug) ? ' active' : '');
    div.title = c.name + (visibleChars.has(c.slug) ? ' [显示中]' : ' [已隐藏]');
    const img = document.createElement('img');
    img.src = c.img;
    img.alt = c.name;
    div.appendChild(img);
    div.addEventListener('click', () => toggleChar(c.slug, div));
    panel.appendChild(div);
  });
}

// ===== 切换显示/隐藏 =====
function toggleChar(slug, avatarEl) {
  const el = document.getElementById('char-' + slug);
  if (!el) return;
  const char = characters.find(c => c.slug === slug);
  if (visibleChars.has(slug)) {
    visibleChars.delete(slug);
    el.style.display = 'none';
    avatarEl.classList.remove('active');
    avatarEl.title = char.name + ' [已隐藏]';
  } else {
    visibleChars.add(slug);
    el.style.display = '';
    avatarEl.classList.add('active');
    avatarEl.title = char.name + ' [显示中]';
    setTimeout(() => scheduleAction(slug, el), 300);
  }
  updateStatCount();
}

// ===== 对话气泡 =====
function showPhrase(charEl, phrase) {
  const old = charEl.querySelector('.speech-bubble');
  if (old) old.remove();
  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  bubble.textContent = phrase;
  charEl.appendChild(bubble);
  setTimeout(() => bubble.remove(), 3000);
}

// ===== 角色移动 =====
// 根据角色默认朝向（facingRight）和移动方向，计算正确的 scaleX
function getFacingScale(charEl, movingRight) {
  const slug = charEl.id.replace('char-', '');
  const char = characters.find(c => c.slug === slug);
  const facingRight = char ? char.facingRight : true;
  // 移动方向与默认朝向一致 → 不翻转(scaleX(1))；相反 → 翻转(scaleX(-1))
  const flip = movingRight !== facingRight;
  return flip ? 'scaleX(-1)' : 'scaleX(1)';
}

function moveCharacter(charEl, targetX, onDone) {
  const currentLeft = parseInt(charEl.style.left) || 0;
  const diff = targetX - currentLeft;
  if (Math.abs(diff) < 2) { if (onDone) onDone(); return; }
  const dir = diff > 0 ? 1 : -1;
  const movingRight = dir > 0;
  const targetScale = getFacingScale(charEl, movingRight);

  // 先翻转朝向（CSS transition 0.15s steps(3)），再开始移动
  const alreadyFacing = charEl.style.transform === targetScale;
  charEl.style.transform = targetScale;

  const startMove = () => {
    charEl.classList.add('walking');
    let pos = currentLeft;
    const iv = setInterval(() => {
      pos += dir * 1.5;
      if ((dir > 0 && pos >= targetX) || (dir < 0 && pos <= targetX)) {
        pos = targetX;
        clearInterval(iv);
        charEl.classList.remove('walking');
        // 保留朝向，不强制复位
        if (onDone) onDone();
      }
      charEl.style.left = pos + 'px';
    }, 16);
  };

  if (alreadyFacing) {
    startMove();
  } else {
    // 等翻转动画完成（150ms）再走
    setTimeout(startMove, 150);
  }
}

// ===== 跨区域移动（走出边缘 → 从另一侧进入目标区域）=====
function walkToZone(slug, charEl, newZone, onDone) {
  const zoneEl = document.getElementById(ZONE_IDS[newZone]);
  if (!zoneEl) return;

  // 随机决定从左侧还是右侧离开
  const exitRight = Math.random() < 0.5;
  const exitX = exitRight ? 1300 : -80;
  const enterX = exitRight ? -80 : 1300;
  const destX  = 80 + Math.random() * 900;

  // 1. 走到当前区域边缘（出镜）
  moveCharacter(charEl, exitX, () => {
    // 2. 移入目标区域，放在对侧边缘（此时在 overflow:hidden 外，不可见）
    charEl.dataset.zone = newZone;
    zoneEl.appendChild(charEl);
    charEl.style.left = enterX + 'px';
    charEl.style.bottom = '40px';
    // 入场方向：从左侧进来向右走，从右侧进来向左走
    charEl.style.transform = getFacingScale(charEl, !exitRight);

    // 3. 从边缘走入目标区域
    moveCharacter(charEl, destX, () => {
      if (onDone) onDone();
    });
  });
}

// ===== AI 行为调度 =====
function scheduleAction(slug, charEl) {
  if (!charEl || charEl.style.display === 'none') return;
  const char = characters.find(c => c.slug === slug);
  if (!char) return;
  charEl.classList.remove('working', 'drinking', 'yawning', 'walking');

  // 10% 概率跨区域移动
  if (Math.random() < 0.10) {
    const others = ZONES.filter(z => z !== charEl.dataset.zone);
    const newZone = others[Math.floor(Math.random() * others.length)];
    walkToZone(slug, charEl, newZone, () => {
      setTimeout(() => scheduleAction(slug, charEl), 500 + Math.random() * 1000);
    });
    return;
  }

  const actions = ['idle', 'walk', 'talk', 'drink', 'work'];
  const action = actions[Math.floor(Math.random() * actions.length)];

  if (action === 'walk') {
    moveCharacter(charEl, 60 + Math.random() * 1000, () => {
      setTimeout(() => scheduleAction(slug, charEl), 800 + Math.random() * 2000);
    });
    return;
  } else if (action === 'work') {
    charEl.classList.add('working');
    const icon = charEl.querySelector('.status-icon');
    if (icon) icon.textContent = ['💻', '⌨️', '📊', '📝', '🖱️'][Math.floor(Math.random() * 5)];
  } else if (action === 'drink') {
    // 在茶水间且概率触发 → 走去咖啡机打咖啡
    if (charEl.dataset.zone === 'kitchen' && Math.random() < 0.6) {
      useCoffeeMachine(slug, charEl);
      return;
    }
    // 其他情况：原地喝
    charEl.classList.add('drinking');
    coffeeCount++;
    document.getElementById('stat-coffee').textContent = coffeeCount;
    const icon = charEl.querySelector('.status-icon');
    if (icon) icon.textContent = '☕';
    showPhrase(charEl, char.phrases[Math.floor(Math.random() * char.phrases.length)]);
  } else if (action === 'talk') {
    showPhrase(charEl, char.phrases[Math.floor(Math.random() * char.phrases.length)]);
    const icon = charEl.querySelector('.status-icon');
    if (icon) icon.textContent = '💬';
  } else {
    if (Math.random() < 0.3) {
      charEl.classList.add('yawning');
      const icon = charEl.querySelector('.status-icon');
      if (icon) icon.textContent = '😴';
    }
  }
  setTimeout(() => scheduleAction(slug, charEl), 2000 + Math.random() * 4000);
}

// ===== 启动所有可见角色 AI =====
function startAllAI() {
  characters.forEach(c => {
    if (!visibleChars.has(c.slug)) return;
    const el = document.getElementById('char-' + c.slug);
    if (el) setTimeout(() => scheduleAction(c.slug, el), Math.random() * 3000);
  });
}

// ===== 显示角色信息弹窗 =====
function showInfo(slug) {
  const char = characters.find(c => c.slug === slug);
  if (!char) return;
  document.getElementById('modal-img').src = char.img;
  document.getElementById('modal-name').textContent = char.name;
  document.getElementById('modal-title').textContent = char.title;
  document.getElementById('modal-quote').textContent = char.quote;
  const statusEl = document.getElementById('modal-status');
  statusEl.innerHTML = '';
  Object.entries(char.stats).forEach(([k, v]) => {
    statusEl.innerHTML += '<div>' + k + ': <span style="color:#64ffda">' + v + '</span></div>';
  });
  document.getElementById('modal-stats').innerHTML =
    '<div style="font-size:15px;color:#ffd700;border:1px solid #ffd700;padding:3px 6px;">💬 "' +
    char.phrases[Math.floor(Math.random() * char.phrases.length)] + '"</div>';
  document.getElementById('info-modal').style.display = 'block';
  document.getElementById('modal-overlay').style.display = 'block';
}

// ===== 随机事件 =====
const events = [
  {
    msg: '⚖️ 新案件来了！成步堂紧急出动',
    action: () => {
      const e = document.getElementById('char-naruhodou');
      if (e && e.style.display !== 'none') showPhrase(e, '异议！！！');
    }
  },
  {
    msg: '☕ 咖啡机坏了！全员崩溃',
    action: () => {
      const e = document.getElementById('char-yahari');
      if (e && e.style.display !== 'none') showPhrase(e, '咖啡机坏了！！！');
    }
  },
  {
    msg: '📢 御剑宣布：我是来挑战你的！',
    action: () => {
      const e = document.getElementById('char-mitsurugi');
      if (e && e.style.display !== 'none') showPhrase(e, '区区靠运气赢下三次的新手律师……');
    }
  },
  {
    msg: '🍱 该吃午饭了！',
    action: () => {
      const e = document.getElementById('char-bentou');
      if (e && e.style.display !== 'none') showPhrase(e, '要买盒饭吗？');
    }
  },
  {
    msg: '💤 下午三点，全员犯困',
    action: () => {
      document.querySelectorAll('.character').forEach(el => {
        if (el.style.display !== 'none') el.classList.add('yawning');
      });
      setTimeout(() => {
        document.querySelectorAll('.character').forEach(el => el.classList.remove('yawning'));
      }, 3000);
    }
  },
  {
    msg: '👻 真宵突然发动灵媒术，全员震惊',
    action: () => {
      const e = document.getElementById('char-mayoi');
      if (e && e.style.display !== 'none') showPhrase(e, '姐姐教过我！');
    }
  },
  {
    msg: '🤖 将军超人在洗手间发动必杀技！',
    action: () => {
      const e = document.getElementById('char-shogun');
      if (e && e.style.display !== 'none') showPhrase(e, '必杀技！五月雨突刺！');
    }
  },
  {
    msg: '🌸 粉色小姐路过，全员停止工作',
    action: () => {
      const e = document.getElementById('char-pink_lady');
      if (e && e.style.display !== 'none') showPhrase(e, '嗯哼～');
    }
  },
  {
    msg: '📣 大场香开始滔滔不绝……',
    action: () => {
      const e = document.getElementById('char-ooba');
      if (e && e.style.display !== 'none') showPhrase(e, '大婶我啊年轻时候也是（以下省略500字）');
    }
  },
  {
    msg: '🦜 小百合突然开口说话，全员沉默',
    action: () => {
      const e = document.getElementById('char-sayuri');
      if (e && e.style.display !== 'none') showPhrase(e, '不可忘记DL-6号事件。');
    }
  },
  {
    msg: '❓ 逮捕君开始剧烈摇晃，原因不明',
    action: () => {
      const e = document.getElementById('char-mystery');
      if (e && e.style.display !== 'none') showPhrase(e, '（剧烈摇晃）');
    }
  },
  {
    msg: '🔍 矢张出现在茶水间，行迹可疑',
    action: () => {
      const e = document.getElementById('char-yahari');
      if (e && e.style.display !== 'none') showPhrase(e, '我不是可疑人员啊！');
    }
  },
  {
    msg: '🛡️ 保安弄丢了重要东西……',
    action: () => {
      const e = document.getElementById('char-guard');
      if (e && e.style.display !== 'none') showPhrase(e, '那个，好像被我弄丢了！');
    }
  },
];

// ===== 咖啡机音效 =====
let coffeeSfx = null;
function initCoffeeSfx() {
  coffeeSfx = new Audio('sfx/coffee-machine.wav');
  coffeeSfx.volume = 0.3;
}

function playCoffeeSfx() {
  if (!coffeeSfx) return;
  coffeeSfx.currentTime = 0;
  coffeeSfx.volume = 0.3;
  coffeeSfx.play().catch(() => {});
}

function fadeCoffeeSfx(duration) {
  if (!coffeeSfx || coffeeSfx.paused) return;
  const step = 50;
  const delta = coffeeSfx.volume / (duration / step);
  const iv = setInterval(() => {
    const next = coffeeSfx.volume - delta;
    if (next <= 0) {
      coffeeSfx.volume = 0;
      coffeeSfx.pause();
      clearInterval(iv);
    } else {
      coffeeSfx.volume = next;
    }
  }, step);
}

// ===== 咖啡机交互 =====
// 咖啡机在 kitchen-area，left:220px，角色站在旁边约 left:200px
const COFFEE_MACHINE_X = 200;
let coffeeMachineBusy = false; // 同一时间只允许一个角色使用

function useCoffeeMachine(slug, charEl) {
  if (coffeeMachineBusy) {
    // 咖啡机被占用，等一会儿再调度
    setTimeout(() => scheduleAction(slug, charEl), 2000 + Math.random() * 2000);
    return;
  }
  coffeeMachineBusy = true;

  const machineEl = document.querySelector('#kitchen-area .coffee-machine');

  // 1. 走到咖啡机旁边
  moveCharacter(charEl, COFFEE_MACHINE_X, () => {
    const icon = charEl.querySelector('.status-icon');
    if (icon) icon.textContent = '☕';

    // 2. 咖啡机开始运转
    if (machineEl) machineEl.classList.add('brewing');
    playCoffeeSfx();

    // 3. 等待"出咖啡"（4秒），结束时淡出音效
    setTimeout(() => {
      // 音效淡出（0.8秒内降到0）
      fadeCoffeeSfx(800);
      // 咖啡机停止运转
      if (machineEl) machineEl.classList.remove('brewing');

      // 4. 角色喝咖啡动画 + 计数
      charEl.classList.add('drinking');
      coffeeCount++;
      document.getElementById('stat-coffee').textContent = coffeeCount;

      const char = characters.find(c => c.slug === slug);
      if (char) showPhrase(charEl, '☕ 续命！');

      coffeeMachineBusy = false;

      // 5. 喝完后继续调度
      setTimeout(() => {
        charEl.classList.remove('drinking');
        scheduleAction(slug, charEl);
      }, 2000);
    }, 4000);
  });
}

// ===== 随机事件触发 =====
function triggerRandomEvent() {
  const ev = events[Math.floor(Math.random() * events.length)];
  const notif = document.createElement('div');
  notif.style.cssText = 'position:fixed;top:100px;right:15px;background:#0f3460;border:2px solid #e94560;color:#fff;font-family:"ZCOOL KuaiLe",monospace;font-size:14px;padding:10px 14px;z-index:500;max-width:320px;line-height:1.8';
  notif.textContent = ev.msg;
  document.body.appendChild(notif);
  ev.action();
  setTimeout(() => notif.remove(), 4000);
  setTimeout(triggerRandomEvent, 8000 + Math.random() * 12000);
}
setTimeout(triggerRandomEvent, 5000);

// ===== 键盘快捷键 =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('info-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
    const mp = document.getElementById('music-panel');
    if (mp && mp.style.display !== 'none') toggleMusicPanel();
  }
});

// ===== 启动 =====
window.addEventListener('DOMContentLoaded', () => {
  initCharacters();
  setTimeout(startAllAI, 500);
  initMusicPlayer();
  initCoffeeSfx();
});

// ============================================================
//  BGM 播放器
// ============================================================

const BGM_BASE = 'bgm/8bit/《逆转裁判123：成步堂精选集》原声音乐带-p';
const BGM_EXT  = '-16.ogg';
const TRACK_NAMES = [
  'Phoenix Wright - Objection! 2001',
  'Maya Fey - Turnabout Sisters 2001',
  "Dick Gumshoe - That's Detective Gumshoe, Pal!",
  'Ema Skye - Turnabout Sisters 2005',
  'Pursuit - Corner the Culprit',
  'The Blue Badger - I Want to Protect You',
  'Victory! - Our First Win',
  'Pearl Fey - With Pearly',
  'Triumphant Return - Miles Edgeworth',
  'Victory! - Another Win',
  "Larry Butz - When Something Smells, It's Usually Me",
  'Pursuit - Catch the Culprit',
  'Victory! - An Eternal Win',
  'Trials and Tribulations - Ending',
  'The Steel Samurai (Orchestral)',
  'Those of Fey Blood (Orchestral)',
  'Courtroom Suite (Orchestral)',
  'Berry Big Circus (Piano)',
  'Turnabout Sisters 2001 (Piano)',
  'Court Begins on a Blue Note Scale (Jazz)',
  'Godot - The Fragrance of Darkness (Jazz)',
  'Rise from the Ashes - Ending (Jazz)',
  'Turnabout Sisters - Seaside Swing (Vocal)',
  'Eternal Victory - Endings and Beginnings (Vocal)',
];
const TRACKS = TRACK_NAMES.map((title, i) => ({
  title,
  file: BGM_BASE + String(i + 1).padStart(2, '0') + BGM_EXT,
}));

let currentTrack = 0;
let isPlaying = false;
let audio = null;

function initMusicPlayer() {
  audio = new Audio();
  audio.volume = 0.3;
  audio.addEventListener('ended', () => nextTrack());
  audio.addEventListener('error', () => {
    setTimeout(() => nextTrack(), 500);
  });
  buildTrackList();
}

// ===== 开始引导：点击蒙层后触发 =====
function startGame() {
  const overlay = document.getElementById('start-overlay');
  if (!overlay) return;
  overlay.classList.add('fade-out');
  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  // 用户交互后播放，绕过浏览器自动播放限制
  playTrack(0);
}

function buildTrackList() {
  const list = document.getElementById('music-tracklist');
  if (!list) return;
  list.innerHTML = '';
  TRACKS.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = 'track-item' + (i === currentTrack ? ' active' : '');
    item.id = 'track-' + i;
    item.innerHTML = '<span class="track-num">' + String(i + 1).padStart(2, '0') + '</span>' +
                     '<span class="track-name">' + t.title + '</span>';
    item.addEventListener('click', () => playTrack(i));
    list.appendChild(item);
  });
}

function playTrack(index) {
  currentTrack = index;
  const track = TRACKS[currentTrack];
  audio.src = track.file;
  audio.play().then(() => {
    isPlaying = true;
    updatePlayerUI();
  }).catch(() => {
    isPlaying = false;
    updatePlayerUI();
  });
}

function togglePlay() {
  if (!audio) return;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    if (!audio.src || audio.src === window.location.href) {
      playTrack(currentTrack);
      return;
    }
    audio.play().then(() => { isPlaying = true; updatePlayerUI(); }).catch(() => {});
  }
  updatePlayerUI();
}

function nextTrack() {
  currentTrack = (currentTrack + 1) % TRACKS.length;
  playTrack(currentTrack);
}

function prevTrack() {
  currentTrack = (currentTrack - 1 + TRACKS.length) % TRACKS.length;
  playTrack(currentTrack);
}

function setVolume(val) {
  if (audio) audio.volume = val / 100;
  const numEl = document.getElementById('music-vol-num');
  if (numEl) numEl.textContent = val;
}

function updatePlayerUI() {
  const btn = document.getElementById('music-play-btn');
  if (btn) btn.textContent = isPlaying ? '⏸' : '▶';

  const vinyl = document.getElementById('music-vinyl');
  if (vinyl) {
    if (isPlaying) vinyl.classList.add('spinning');
    else vinyl.classList.remove('spinning');
  }

  const titleEl = document.getElementById('music-title');
  if (titleEl) titleEl.textContent = TRACKS[currentTrack].title;

  const screenEl = document.getElementById('player-screen-text');
  if (screenEl) screenEl.textContent = isPlaying ? '♪ ' + TRACKS[currentTrack].title.slice(0, 6) : '♪ BGM';

  const bigBtn = document.getElementById('player-btn-big');
  if (bigBtn) bigBtn.style.background = isPlaying ? '#e94560' : '#64ffda';

  document.querySelectorAll('.track-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentTrack);
  });
}

function toggleMusicPanel() {
  const panel = document.getElementById('music-panel');
  const overlay = document.getElementById('music-overlay');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  overlay.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    buildTrackList();
    updatePlayerUI();
  }
}
