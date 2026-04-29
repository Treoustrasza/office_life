// ============================================================
//  app.js — 交互逻辑
//  时钟、角色移动、AI行为、弹窗、随机事件等
// ============================================================

// ===== 区域配置 =====
const ZONES = ['office', 'kitchen', 'toilet'];
const ZONE_IDS = { office: 'office-area', kitchen: 'kitchen-area', toilet: 'toilet-area' };

// ============================================================
//  localStorage 持久化
//  key: office-life-state
//  结构: { visible: string[], zones: {slug: zone}, customChars: CharData[] }
// ============================================================
const STORAGE_KEY = 'office-life-state';

function saveState() {
  try {
    const zones = {};
    characters.forEach(c => {
      const el = document.getElementById('char-' + c.slug);
      if (el) zones[c.slug] = el.dataset.zone || c.zone;
    });
    const state = {
      visible:     [...visibleChars],
      zones,
      // 自定义角色：保存完整数据（含 dataURL 图片）
      customChars: characters.filter(c => c.isCustom),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage 不可用（隐私模式/容量超限）时静默忽略
    console.warn('[saveState] 无法写入 localStorage:', e);
  }
}

/**
 * 读取存档。返回 { visible, zones, customChars } 或 null（无存档）。
 * 会做基本校验，损坏的存档返回 null。
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!Array.isArray(state.visible) || typeof state.zones !== 'object') return null;
    return state;
  } catch (e) {
    console.warn('[loadState] 存档损坏，已忽略:', e);
    return null;
  }
}

// ===== 可见角色集合（优先从存档恢复，否则用 defaultVisible）=====
const _savedState = loadState();
const visibleChars = new Set(_savedState ? _savedState.visible : defaultVisible);

// ===== 游戏状态 =====
let coffeeCount = 0;

// ===== 现实时钟 =====
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('clock').textContent =
   + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}
updateClock();
setInterval(updateClock, 1000);

// ===== 摸鱼指数：茶水间+洗手间人数 / 总可见人数 =====
function updateFishIndex() {
  const total = visibleChars.size;
  if (total === 0) { document.getElementById('stat-fish').textContent = '0'; return; }
  let slacking = 0;
  visibleChars.forEach(slug => {
    const el = document.getElementById('char-' + slug);
    if (el && (el.dataset.zone === 'kitchen' || el.dataset.zone === 'toilet')) slacking++;
  });
  const pct = Math.round(slacking / total * 100);
  document.getElementById('stat-fish').textContent = pct;
}

// ===== 初始化角色 =====
function initCharacters() {
  // 1. 先恢复自定义角色（需要在遍历 characters 之前注入）
  if (_savedState && Array.isArray(_savedState.customChars)) {
    _savedState.customChars.forEach(c => {
      // 防止重复注入
      if (characters.find(x => x.slug === c.slug)) return;
      characters.push(c);
      // 恢复区域（存档里的 zones 优先）
      if (_savedState.zones && _savedState.zones[c.slug]) {
        c.zone = _savedState.zones[c.slug];
      }
      // 创建 DOM 并插入对应区域
      const charEl = _createCharElement(c);
      const zoneEl = document.getElementById(ZONE_IDS[c.zone]);
      if (zoneEl) zoneEl.appendChild(charEl);
    });
  }

  // 2. 初始化所有角色（含刚恢复的自定义角色）
  characters.forEach(c => {
    const el = document.getElementById('char-' + c.slug);
    if (!el) return;
    // 从存档恢复区域，否则用 characters.js 里的默认值
    const zone = (_savedState?.zones?.[c.slug]) || c.zone;
    el.dataset.zone = zone;
    el.style.display = visibleChars.has(c.slug) ? '' : 'none';
    const zoneEl = document.getElementById(ZONE_IDS[zone]);
    if (zoneEl && el.parentElement !== zoneEl) zoneEl.appendChild(el);
  });

  updateStatCount();
  buildAvatarPanel();
  updateFishIndex();
}

function updateStatCount() {
  document.getElementById('stat-count').textContent = visibleChars.size;
}

// ===== 构建头像面板 =====
function buildAvatarPanel() {
  const panel = document.getElementById('char-panel-inner');
  if (!panel) return;
  panel.innerHTML = '';
  characters.forEach(c => {
    const div = document.createElement('div');
    div.className = 'char-avatar' + (visibleChars.has(c.slug) ? ' active' : '');
    div.title = c.name + (visibleChars.has(c.slug) ? ' [显示中]' : ' [已隐藏]');
    const img = document.createElement('img');
    img.src = c.img;
    img.alt = c.name;
    div.appendChild(img);
    div.addEventListener('click', () => toggleChar(c.slug, div));

    // 自定义角色：叠加删除按钮
    if (c.isCustom) {
      const del = document.createElement('button');
      del.className = 'char-avatar-del';
      del.title = '删除 ' + c.name;
      del.textContent = '✕';
      del.addEventListener('click', e => {
        e.stopPropagation(); // 不触发 toggleChar
        removeCustomChar(c.slug);
      });
      div.appendChild(del);
    }

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
    saveState();
  } else {
    visibleChars.add(slug);
    el.style.display = '';
    avatarEl.classList.add('active');
    saveState();
    avatarEl.title = char.name + ' [显示中]';
    setTimeout(() => scheduleAction(slug, el), 300);
  }
  updateStatCount();
  updateFishIndex();
}

// ===== 对话气泡 =====
// 气泡高度（含间距），用于计算堆叠偏移
const BUBBLE_STEP = 38; // px，约一行气泡高度 + 间距

// participants: 参与本次对话的所有角色元素数组，新气泡出现时一起上推
function showPhrase(charEl, phrase, participants = [charEl]) {
  // 推所有参与者头上的已有气泡
  participants.forEach(el => {
    el.querySelectorAll('.speech-bubble').forEach(b => {
      const next = parseFloat(b.dataset.level || '0') + 1;
      b.dataset.level = next;
      b.style.bottom = `calc(110% + 10px + ${next * BUBBLE_STEP}px)`;
    });
  });

  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  bubble.textContent = phrase;
  bubble.dataset.level = '0';
  charEl.appendChild(bubble);
  setTimeout(() => bubble.remove(), 3000);
}

// ===== 角色拖拽 =====
// 被用户拖拽暂停 AI 的角色集合
const _dragPaused = new Set();

// 拖拽状态
let _drag = null;

const DRAG_THRESHOLD = 5; // px，超过此距离才算拖拽

function _initCharDrag() {
  // pointerdown 委托到 document，捕获所有角色的按下事件
  document.addEventListener('pointerdown', _onPointerDown);

  // pointermove / pointerup / pointercancel 也绑在 document 上。
  // 关键原因：_beginDrag 会把 charEl 从 scene 移到 game-world，
  // 若监听器绑在 charEl 上，DOM 移动后部分浏览器的 pointer capture 会静默失效，
  // 导致 pointermove 卡住、pointerup 收不到，角色永远悬在空中。
  // 绑在 document 上则完全不受 DOM 结构变化影响。
  document.addEventListener('pointermove',   _onPointerMove);
  document.addEventListener('pointerup',     _onPointerUp);
  document.addEventListener('pointercancel', _onPointerUp);

  // 阻止图片/元素的原生拖拽行为（否则 pointermove 会被 dragstart 打断）
  document.addEventListener('dragstart', e => {
    if (e.target.closest('.character')) e.preventDefault();
  });
}

function _onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return; // 只响应左键
  const charEl = e.target.closest('.character');
  if (!charEl || charEl.style.display === 'none') return;

  e.preventDefault(); // 阻止文字选中、滚动等默认行为

  // 如果上次拖拽因鼠标移出窗口等原因没有正常结束，先强制落地清理
  if (_drag) _forceEndDrag(_drag.lastX ?? _drag.startX, _drag.startY);

  const rect = charEl.getBoundingClientRect();
  _drag = {
    slug:       charEl.id.replace('char-', ''),
    charEl,
    pointerId:  e.pointerId,
    startX:     e.clientX,
    startY:     e.clientY,
    offsetX:    e.clientX - rect.left,
    offsetY:    e.clientY - rect.top,
    charW:      rect.width,
    charH:      rect.height,
    moved:      false,
    origZoneEl: charEl.parentElement,
    lastX:      e.clientX,
  };
}

function _onPointerMove(e) {
  if (!_drag || e.pointerId !== _drag.pointerId) return;
  e.preventDefault();

  const dx = e.clientX - _drag.startX;
  const dy = e.clientY - _drag.startY;

  if (!_drag.moved) {
    if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    _drag.moved = true;
    _beginDrag();
  }

  // 跟随指针：坐标相对于 game-world
  const gameWorld = document.getElementById('game-world');
  const gwRect = gameWorld.getBoundingClientRect();
  const x = e.clientX - gwRect.left - _drag.offsetX;
  const y = e.clientY - gwRect.top  - _drag.offsetY;

  const charEl = _drag.charEl;
  charEl.style.left = x + 'px';
  charEl.style.top  = y + 'px';

  // 更新朝向（用帧间差值，避免抖动）
  const frameDx = e.clientX - _drag.lastX;
  if (Math.abs(frameDx) > 1) {
    const imgEl = charEl.querySelector('img');
    if (imgEl) imgEl.style.transform = getFacingScale(charEl, frameDx > 0);
  }
  _drag.lastX = e.clientX;

  _highlightDropZone(e.clientX, e.clientY);
}

function _onPointerUp(e) {
  if (!_drag || e.pointerId !== _drag.pointerId) return;
  _settleDrag(e.clientX, e.clientY);
}

/**
 * 强制结束拖拽（用于异常情况兜底，如鼠标移出窗口后再回来）。
 * 使用上次记录的坐标落地。
 */
function _forceEndDrag(clientX, clientY) {
  if (!_drag) return;
  if (_drag.moved) {
    _settleDrag(clientX, clientY);
  } else {
    // 未开始真正拖拽，直接清理
    _drag = null;
  }
}

/**
 * 落地逻辑：确定目标区域，把角色放入并贴地，恢复 AI。
 * 由 _onPointerUp 和 _forceEndDrag 共同调用。
 */
function _settleDrag(clientX, clientY) {
  const { slug, moved, charEl, charW: savedCharW, origZoneEl } = _drag;
  _drag = null; // 先清空，防止落地过程中的任何回调再次触发

  if (!moved) {
    showInfo(slug);
    return;
  }

  // 确定落点区域
  const targetZoneEl = _findDropZone(clientX, clientY);
  const newZone = Object.keys(ZONE_IDS).find(k => ZONE_IDS[k] === targetZoneEl.id)
    ?? charEl.dataset.zone;

  // X 轴：角色中心对齐指针，夹在 scene 宽度内
  const sceneRect = targetZoneEl.getBoundingClientRect();
  const charW = savedCharW || 60;
  const rawX = clientX - sceneRect.left - charW / 2;
  const finalX = Math.max(0, Math.min(rawX, sceneRect.width - charW));

  // 先 appendChild 再设 style，确保 bottom 在新父元素坐标系下生效
  targetZoneEl.appendChild(charEl);
  charEl.style.cssText = [
    'position:absolute',
    `left:${finalX}px`,
    'bottom:40px',
  ].join(';');
  charEl.classList.remove('dragging');
  charEl.dataset.zone = newZone;

  document.querySelectorAll('.scene').forEach(s => s.classList.remove('drop-target'));
  saveState(); // 落地后保存区域和位置

  // 恢复 AI
  setTimeout(() => {
    _dragPaused.delete(slug);
    updateFishIndex();
    scheduleAction(slug, charEl);
  }, 600);
}

function _beginDrag() {
  const { slug, charEl } = _drag;

  // 暂停 AI，停止所有动画状态（含正在运行的移动 interval）
  _dragPaused.add(slug);
  _stopMove(charEl);
  charEl.classList.remove('working', 'drinking', 'yawning');

  // 脱离 scene，挂到 game-world 顶层自由移动（不受 scene overflow:hidden 裁剪）
  const gameWorld = document.getElementById('game-world');
  const gwRect    = gameWorld.getBoundingClientRect();
  const charRect  = charEl.getBoundingClientRect();

  const x = charRect.left - gwRect.left;
  const y = charRect.top  - gwRect.top;

  gameWorld.appendChild(charEl);
  charEl.style.cssText = [
    'position:absolute',
    `left:${x}px`,
    `top:${y}px`,
    'z-index:999',
  ].join(';');
  charEl.classList.add('dragging');
}

/**
 * 找到鼠标所在的 scene。
 * 策略：先做精确矩形命中；若未命中（如在 floor-label 区域），
 * 则找垂直方向上距离最近的 scene（以 scene 中心 Y 为基准），
 * 保证松手时始终能落到某个区域，不会因遮挡或间隙导致失败。
 */
function _findDropZone(clientX, clientY) {
  let best = null;
  let bestDist = Infinity;

  for (const zoneId of Object.values(ZONE_IDS)) {
    const el = document.getElementById(zoneId);
    if (!el) continue;
    const r = el.getBoundingClientRect();

    // 精确命中：X 在 scene 范围内，Y 在 scene 范围内
    if (clientX >= r.left && clientX <= r.right &&
        clientY >= r.top  && clientY <= r.bottom) {
      return el; // 直接返回，无需继续
    }

    // 未精确命中时，计算到 scene 的最短距离（矩形外距离）
    const dx = Math.max(r.left - clientX, 0, clientX - r.right);
    const dy = Math.max(r.top  - clientY, 0, clientY - r.bottom);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }

  return best;
}

function _highlightDropZone(clientX, clientY) {
  const target = _findDropZone(clientX, clientY);
  document.querySelectorAll('.scene').forEach(s => {
    s.classList.toggle('drop-target', s === target);
  });
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

// 每个角色当前正在运行的移动 interval，key = charEl，value = intervalId
// 用于在新移动开始前取消旧的，防止多个 interval 并发导致漂移
const _moveIntervals = new WeakMap();

function _stopMove(charEl) {
  const iv = _moveIntervals.get(charEl);
  if (iv != null) {
    clearInterval(iv);
    _moveIntervals.delete(charEl);
  }
  charEl.classList.remove('walking');
}

function moveCharacter(charEl, targetX, onDone) {
  // 取消该角色上一次未完成的移动，防止多个 interval 并发漂移
  _stopMove(charEl);

  // 读取当前像素位置：style.left 可能是百分比（初始化时），
  // 用 offsetLeft 获取实际像素值，避免 parseInt('8.3%') = 8 的错误
  const currentLeft = charEl.offsetLeft;
  const diff = targetX - currentLeft;
  if (Math.abs(diff) < 2) { if (onDone) onDone(); return; }
  const dir = diff > 0 ? 1 : -1;
  const movingRight = dir > 0;
  const targetScale = getFacingScale(charEl, movingRight);

  // 先翻转朝向（CSS transition 0.15s steps(3)），再开始移动
  const imgEl = charEl.querySelector('img');
  const alreadyFacing = imgEl && imgEl.style.transform === targetScale;
  if (imgEl) imgEl.style.transform = targetScale;

  const startMove = () => {
    // 再次检查：翻转等待期间可能已被拖拽打断
    if (_dragPaused.has(charEl.id.replace('char-', ''))) return;
    charEl.classList.add('walking');
    let pos = charEl.offsetLeft; // 重新读，避免翻转等待期间位置变化
    const iv = setInterval(() => {
      pos += dir * 1.5;
      if ((dir > 0 && pos >= targetX) || (dir < 0 && pos <= targetX)) {
        pos = targetX;
        _stopMove(charEl);
        if (onDone) onDone();
      } else {
        charEl.style.left = pos + 'px';
      }
    }, 16);
    _moveIntervals.set(charEl, iv);
    charEl.style.left = pos + 'px'; // 立即设一次，避免第一帧延迟
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
  const exitX  = exitRight ? 1300 : -80;
  const enterX = exitRight ? -80  : 1300;
  // 目标 X 限制在 scene 宽度内，避免走出边界被 overflow:hidden 裁掉
  const sceneW = zoneEl.offsetWidth || 900;
  const destX  = 60 + Math.random() * Math.max(sceneW - 120, 200);

  // 1. 走到当前区域边缘（出镜）
  moveCharacter(charEl, exitX, () => {
    // 2. 移入目标区域，放在对侧边缘（此时在 overflow:hidden 外，不可见）
    charEl.dataset.zone = newZone;
    zoneEl.appendChild(charEl);
    // 用 cssText 一次性清除所有定位属性（包括可能残留的 top），确保 bottom 生效
    charEl.style.cssText = [
      'position:absolute',
      `left:${enterX}px`,
      'bottom:40px',
    ].join(';');
    updateFishIndex();
    // 入场方向：从左侧进来向右走，从右侧进来向左走
    const enterImgEl = charEl.querySelector('img');
    if (enterImgEl) enterImgEl.style.transform = getFacingScale(charEl, !exitRight);

    // 3. 从边缘走入目标区域
    moveCharacter(charEl, destX, () => {
      saveState(); // 跨区域完成后保存
      if (onDone) onDone();
    });
  });
}

// ============================================================
//  角色近距离对话系统
// ============================================================

// 触发对话的最大距离（px，基于 offsetLeft 差值）
const CHAT_TRIGGER_DIST = 120;
// 每次 scheduleAction 触发对话的概率
const CHAT_TRIGGER_PROB = 0.12;

// 正在进行对话的角色集合（防止同一角色同时参与多场对话）
const _chatting = new Set();

// 对话冷却中的角色集合（对话结束后 3 秒内不触发新对话/自言自语/移动）
const _chatCooldown = new Set();
const CHAT_COOLDOWN_MS = 3000;

/**
 * 检测当前区域内是否有其他角色在近距离，若有则小概率触发对话。
 * 返回 true 表示已触发对话（scheduleAction 应直接 return）。
 */
function _tryTriggerChat(slug, charEl) {
  if (_chatting.has(slug)) return false;
  if (Math.random() > CHAT_TRIGGER_PROB) return false;

  const zone = charEl.dataset.zone;
  const myX  = charEl.offsetLeft;

  // 找同区域内距离最近且未在对话中的角色
  let bestSlug = null;
  let bestEl   = null;
  let bestDist = Infinity;

  characters.forEach(c => {
    if (c.slug === slug) return;
    if (!visibleChars.has(c.slug)) return;
    if (_chatting.has(c.slug)) return;
    if (_dragPaused.has(c.slug)) return;
    const el = document.getElementById('char-' + c.slug);
    if (!el || el.style.display === 'none') return;
    if (el.dataset.zone !== zone) return;
    const dist = Math.abs(el.offsetLeft - myX);
    if (dist < CHAT_TRIGGER_DIST && dist < bestDist) {
      bestDist = dist;
      bestSlug = c.slug;
      bestEl   = el;
    }
  });

  if (!bestSlug) return false;

  // 锁定双方
  _chatting.add(slug);
  _chatting.add(bestSlug);

  _runChatSequence(slug, charEl, bestSlug, bestEl);
  return true;
}

/**
 * 执行完整对话动画序列：
 *   1. 双方转身面对面
 *   2. 双方各跳两下
 *   3. 甲说一句 -> 乙说一句
 *   4. 解锁双方，继续各自 AI
 */
function _runChatSequence(slugA, elA, slugB, elB) {
  // 停止双方当前移动
  _stopMove(elA);
  _stopMove(elB);
  elA.classList.remove('working', 'drinking', 'yawning', 'walking');
  elB.classList.remove('working', 'drinking', 'yawning', 'walking');

  // 1. 转身面对面
  //    A 在左侧 -> A 朝右，B 朝左；反之亦然
  const aIsLeft = elA.offsetLeft <= elB.offsetLeft;
  const imgA = elA.querySelector('img');
  const imgB = elB.querySelector('img');

  // 面朝对方：A 在左则 A 朝右，B 在右则 B 朝左
  if (imgA) imgA.style.transform = getFacingScale(elA, aIsLeft);
  if (imgB) imgB.style.transform = getFacingScale(elB, !aIsLeft);

  // 2. 跳跃动画（CSS class，持续约 350ms × 2 次）
  const _doJump = (el, onDone) => {
    let count = 0;
    const jump = () => {
      el.classList.add('chatting-jump');
      setTimeout(() => {
        el.classList.remove('chatting-jump');
        count++;
        if (count < 2) setTimeout(jump, 150);
        else onDone();
      }, 350);
    };
    jump();
  };

  // 双方同时跳
  let jumpsDone = 0;
  const onJumpDone = () => {
    jumpsDone++;
    if (jumpsDone < 2) return;

    // 3. 逐条播放台词序列
    const lines = generateDialogueScene(slugA, slugB);
    const iconA = elA.querySelector('.status-icon');
    const iconB = elB.querySelector('.status-icon');

    // 每条台词显示时长（ms）：气泡存在 3s，下一条在 2.2s 后开始（留 0.8s 重叠过渡）
    const LINE_DURATION = 2200;

    const participants = [elA, elB];
    lines.forEach((line, i) => {
      setTimeout(() => {
        const el   = line.speaker === 'A' ? elA : elB;
        const icon = line.speaker === 'A' ? iconA : iconB;
        showPhrase(el, line.text, participants);
        if (icon) icon.textContent = '💬';
      }, i * LINE_DURATION);
    });

    // 4. 最后一条台词显示完毕后解锁，进入冷却期
    const totalDuration = (lines.length - 1) * LINE_DURATION + 3000; // 最后一条气泡留足 3s
    setTimeout(() => {
      _chatting.delete(slugA);
      _chatting.delete(slugB);
      _chatCooldown.add(slugA);
      _chatCooldown.add(slugB);
      setTimeout(() => {
        _chatCooldown.delete(slugA);
        _chatCooldown.delete(slugB);
        scheduleAction(slugA, elA);
        scheduleAction(slugB, elB);
      }, CHAT_COOLDOWN_MS);
    }, totalDuration);
  };

  setTimeout(() => {
    _doJump(elA, onJumpDone);
    _doJump(elB, onJumpDone);
  }, 200); // 转身后稍等再跳
}

// ===== AI 行为调度 =====
function scheduleAction(slug, charEl) {
  if (!charEl || charEl.style.display === 'none') return;
  if (_dragPaused.has(slug)) return; // 正在被用户拖拽，跳过
  if (_chatting.has(slug)) return;   // 正在对话中，禁止任何 AI 行为
  const char = characters.find(c => c.slug === slug);
  if (!char) return;
  charEl.classList.remove('working', 'drinking', 'yawning', 'walking');

  // 小概率触发近距离对话（优先于其他行为；冷却期内跳过）
  if (!_chatCooldown.has(slug) && _tryTriggerChat(slug, charEl)) return;

  // 10% 概率跨区域移动
  if (Math.random() < 0.10) {
    const others = ZONES.filter(z => z !== charEl.dataset.zone);
    const newZone = others[Math.floor(Math.random() * others.length)];
    walkToZone(slug, charEl, newZone, () => {
      setTimeout(() => scheduleAction(slug, charEl), 500 + Math.random() * 1000);
    });
    return;
  }

  // 加权行为表：idle×3 walk×3 work×2 drink×1 talk×1
  // talk/drink 权重低，避免连续触发气泡
  const actions = ['idle', 'idle', 'idle', 'walk', 'walk', 'walk', 'work', 'work', 'drink', 'talk'];
  const action = actions[Math.floor(Math.random() * actions.length)];

  if (action === 'walk') {
    // 目标 X 限制在 scene 宽度内，避免走出边界被 overflow:hidden 裁掉
    const sceneEl = document.getElementById(ZONE_IDS[charEl.dataset.zone]);
    const sceneW  = sceneEl ? sceneEl.offsetWidth : 900;
    const walkTarget = 60 + Math.random() * Math.max(sceneW - 120, 200);
    moveCharacter(charEl, walkTarget, () => {
      setTimeout(() => scheduleAction(slug, charEl), 800 + Math.random() * 2000);
    });
    return;
  } else if (action === 'work') {
    charEl.classList.add('working');
    const icon = charEl.querySelector('.status-icon');
    if (icon) icon.textContent = ['💻', '⌨️', '📊', '📝', '🖱️'][Math.floor(Math.random() * 5)];
    setTimeout(() => scheduleAction(slug, charEl), 3000 + Math.random() * 5000);
    return;
  } else if (action === 'drink') {
    // 在茶水间且概率触发 → 走去咖啡机或贩卖机
    if (charEl.dataset.zone === 'kitchen') {
      const roll = Math.random();
      if (roll < 0.4) {
        useCoffeeMachine(slug, charEl);
        return;
      } else if (roll < 0.7) {
        useVendingMachine(slug, charEl);
        return;
      }
    }
    // 其他情况：原地喝，气泡存在 3s，下次调度至少等 4s
    charEl.classList.add('drinking');
    const icon = charEl.querySelector('.status-icon');
    if (icon) icon.textContent = '☕';
    showPhrase(charEl, char.phrases[Math.floor(Math.random() * char.phrases.length)]);
    setTimeout(() => scheduleAction(slug, charEl), 4000 + Math.random() * 4000);
    return;
  } else if (action === 'talk') {
    // 冷却期内跳过自言自语，改为 idle
    if (_chatCooldown.has(slug)) {
      setTimeout(() => scheduleAction(slug, charEl), 3000 + Math.random() * 4000);
      return;
    }
    showPhrase(charEl, char.phrases[Math.floor(Math.random() * char.phrases.length)]);
    const icon = charEl.querySelector('.status-icon');
    if (icon) icon.textContent = '💬';
    // 气泡存在 3s，下次调度至少等 5s，确保气泡消失后才可能再次说话
    setTimeout(() => scheduleAction(slug, charEl), 5000 + Math.random() * 5000);
    return;
  } else {
    // idle
    if (Math.random() < 0.3) {
      charEl.classList.add('yawning');
      const icon = charEl.querySelector('.status-icon');
      if (icon) icon.textContent = '😴';
    }
  }
  setTimeout(() => scheduleAction(slug, charEl), 3000 + Math.random() * 5000);
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
    msg: '⚖️ 委托人来了，成步堂哥，别再刷厕所了！',
    action: () => {
      const e = document.getElementById('char-naruhodou');
      if (e && e.style.display !== 'none') showPhrase(e, '请看律师徽章！');
    }
  },
  {
    msg: '☕ 咖啡机坏了，可是，已经没有钱换新的了……',
    action: () => {
      const e = document.getElementById('char-yahari');
      if (e && e.style.display !== 'none') showPhrase(e, '还要交房租的啊……');
    }
  },
  {
    msg: '📢 御剑宣布：因为你的缘故，我生出了多余的感情',
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
    msg: '💤 头好晕，是被什么东西砸了吗',
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
    msg: '👻 真宵？不，千寻姐……？',
    action: () => {
      const e = document.getElementById('char-mayoi');
      if (e && e.style.display !== 'none') showPhrase(e, '姐姐……');
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
    msg: '🌸 有可疑人员潜入公司安装窃听器',
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
    msg: '🦜 小百合~小百合~你有忘记什么事吗？',
    action: () => {
      const e = document.getElementById('char-sayuri');
      if (e && e.style.display !== 'none') showPhrase(e, '不可忘记DL-6号事件。');
    }
  },
  {
    msg: '❓ 逮捕君正在随着音乐旋转',
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

// ===== 开罐音效 =====
let canOpenSfx = null;
function initCanOpenSfx() {
  canOpenSfx = new Audio('sfx/can-open.wav');
  canOpenSfx.volume = 0.5;
}
function playCanOpenSfx() {
  if (!canOpenSfx) return;
  canOpenSfx.currentTime = 0;
  canOpenSfx.play().catch(() => {});
}

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
// 动态读取咖啡机在 kitchen-area 内的实际像素 left，角色站在其左侧约 20px 处
function getCoffeeMachineX() {
  const machineEl = document.querySelector('#kitchen-area .coffee-machine');
  if (!machineEl) return 200;
  return machineEl.offsetLeft - 20;
}
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
  moveCharacter(charEl, getCoffeeMachineX(), () => {
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

// ===== 贩卖机交互 =====
// 动态读取贩卖机在 kitchen-area 内的实际像素 left，角色站在其左侧约 20px 处
function getVendingMachineX() {
  const vmEl = document.getElementById('vending-machine');
  if (!vmEl) return 560;
  return vmEl.offsetLeft - 20;
}
let vendingMachineBusy = false;

function useVendingMachine(slug, charEl) {
  if (vendingMachineBusy) {
    setTimeout(() => scheduleAction(slug, charEl), 2000 + Math.random() * 2000);
    return;
  }
  vendingMachineBusy = true;

  const vmEl = document.getElementById('vending-machine');

  // 1. 走到贩卖机旁边
  moveCharacter(charEl, getVendingMachineX(), () => {
    const icon = charEl.querySelector('.status-icon');
    if (icon) icon.textContent = '🥤';

    // 2. 购买动画：按钮闪烁 + 硬币投入
    if (vmEl) {
      vmEl.classList.add('vm-buying');

      // 硬币动画元素（停留更久，让投币感更明显）
      const coin = document.createElement('div');
      coin.className = 'vm-coin';
      coin.textContent = '¥';
      vmEl.appendChild(coin);
      setTimeout(() => coin.remove(), 1200);

      // 罐子掉落动画（2s 后触发，给按钮闪烁留足时间）
      setTimeout(() => {
        const dispensed = document.createElement('div');
        dispensed.className = 'vm-dispensed-can';
        const outlet = vmEl.querySelector('.vm-outlet');
        if (outlet) outlet.appendChild(dispensed);
        setTimeout(() => dispensed.remove(), 1400);
      }, 2000);

      // vm-buying 类在罐子掉落后再移除
      setTimeout(() => vmEl.classList.remove('vm-buying'), 2400);
    }

    // 3. 3s 后：开罐音效 + 喝可乐动画（给罐子掉落留足欣赏时间）
    setTimeout(() => {
      playCanOpenSfx();

      // 举罐动画：在角色上附加一个可乐罐元素
      let canHeld = null;
      canHeld = document.createElement('div');
      canHeld.className = 'drink-can-held';
      charEl.appendChild(canHeld);
      charEl.classList.add('char-drinking');

      // 气泡效果（随机位置冒出 5 个泡泡，间隔拉长）
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const bubble = document.createElement('div');
          bubble.className = 'drink-bubble';
          bubble.style.left = (8 + Math.random() * 16) + 'px';
          bubble.style.top = (4 + Math.random() * 8) + 'px';
          charEl.appendChild(bubble);
          setTimeout(() => bubble.remove(), 1200);
        }, i * 400);
      }

      const char = characters.find(c => c.slug === slug);
      if (char) showPhrase(charEl, ['🥤 好喝！', '可乐！', '嗝～', '爽！'][Math.floor(Math.random() * 4)]);

      vendingMachineBusy = false;

      // 4. 喝完后清理，继续调度（延长到 4s，让喝可乐动画充分展示）
      setTimeout(() => {
        charEl.classList.remove('char-drinking');
        if (canHeld) canHeld.remove();
        scheduleAction(slug, charEl);
      }, 4000);
    }, 3000);
  });
}

// ===== 随机事件触发 =====
function triggerRandomEvent() {
  const ev = events[Math.floor(Math.random() * events.length)];

  // 写入右侧事件日志
  const log = document.getElementById('event-log');
  if (log) {
    const placeholder = log.querySelector('.event-placeholder');
    if (placeholder) placeholder.remove();
    const item = document.createElement('div');
    item.className = 'event-item';
    item.textContent = ev.msg;
    log.insertBefore(item, log.firstChild);
    // 最多保留3条
    while (log.children.length > 3) log.removeChild(log.lastChild);
  }

  ev.action();
  setTimeout(triggerRandomEvent, 8000 + Math.random() * 12000);
}

// ===== 面板折叠 =====
// 左侧：展开时箭头 ◀（提示可向左折叠），折叠后箭头 ▶（提示可向右展开）
// 右侧：展开时箭头 ▶（提示可向右折叠），折叠后箭头 ◀（提示可向左展开）
function togglePanel(id) {
  if (id === 'left-panel') {
    const panel = document.getElementById('left-panel');
    const collapsed = panel.classList.toggle('collapsed');
    const arrow = document.getElementById('left-panel-arrow');
    if (arrow) arrow.textContent = collapsed ? '▶' : '◀';
  } else if (id === 'right-events' || id === 'right-stats') {
    const panel = document.getElementById('right-panel');
    const collapsed = panel.classList.toggle('collapsed');
    ['right-events-arrow', 'right-stats-arrow'].forEach(aid => {
      const arrow = document.getElementById(aid);
      if (arrow) arrow.textContent = collapsed ? '◀' : '◀';
    });
  }
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
  initCanOpenSfx();
  _initCharDrag(); // 启动角色拖拽
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
  if (btn) btn.textContent = isPlaying ? '||' : '▶';

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
  if (bigBtn) bigBtn.classList.toggle('active', isPlaying);

  // 声波动效
  const sw = document.getElementById('player-soundwave');
  if (sw) sw.classList.toggle('playing', isPlaying);

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

// ===== 全局静音 =====
let isMuted = false;
function toggleMute() {
  isMuted = !isMuted;
  // BGM
  if (audio) audio.muted = isMuted;
  // 音效
  if (canOpenSfx) canOpenSfx.muted = isMuted;
  if (coffeeSfx) coffeeSfx.muted = isMuted;
  // 按钮状态
  const btn = document.getElementById('mute-btn');
  if (btn) {
    btn.textContent = isMuted ? '🔇' : '🔊';
    btn.classList.toggle('muted', isMuted);
    btn.title = isMuted ? '取消静音' : '静音';
  }
}

// ============================================================
//  自定义角色功能
// ============================================================

// ----- 状态 -----
let _acmOriginalImage = null;   // 原始 Image 对象
let _acmCropRect = null;        // { x, y, w, h } 相对于 canvas 显示尺寸
let _acmCroppedDataURL = null;  // 裁剪后的 dataURL
let _acmCropMode = 'width';     // 'width' | 'height' | 'free'
let _acmDragging = false;
let _acmDragStart = null;
let _acmCustomCount = 0;        // 自定义角色计数，用于生成唯一 slug

// 参考尺寸：等宽/等高时对齐的目标
const ACM_REF_WIDTH  = 80;   // px（场景中角色图片的典型宽度）
const ACM_REF_HEIGHT = 80;   // px（场景中角色图片的典型高度）

// ----- 打开/关闭弹窗 -----
function openAddCharModal() {
  _resetAcmState();
  document.getElementById('add-char-overlay').style.display = 'block';
  document.getElementById('add-char-modal').style.display = 'block';
  _showAcmStep(1);
}

function closeAddCharModal(e) {
  // 点击遮罩时关闭（排除弹窗本身）
  if (e && e.target !== document.getElementById('add-char-overlay')) return;
  document.getElementById('add-char-overlay').style.display = 'none';
  document.getElementById('add-char-modal').style.display = 'none';
  _resetAcmState();
}

function _resetAcmState() {
  _acmOriginalImage = null;
  _acmCropRect = null;
  _acmCroppedDataURL = null;
  _acmCropMode = 'width';
  _acmDragging = false;
  _acmDragStart = null;
  // 重置文件输入
  const fi = document.getElementById('acm-file-input');
  if (fi) fi.value = '';
  document.getElementById('acm-upload-text').textContent = '📁 点击选择 PNG 文件';
  _hideAcmError('acm-upload-error');
  _hideAcmError('acm-form-error');
  // 清空步骤3表单
  ['acm-name','acm-title','acm-quote','acm-phrases'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const zoneEl = document.getElementById('acm-zone');
  if (zoneEl) zoneEl.value = 'office';
  const facingEl = document.getElementById('acm-facing');
  if (facingEl) facingEl.value = 'right';
  // 重置裁剪模式按钮
  _setActiveModeBtn('acm-mode-width');
}

function _showAcmStep(n) {
  [1, 2, 3].forEach(i => {
    const el = document.getElementById('acm-step' + i);
    if (el) el.style.display = i === n ? '' : 'none';
  });
}

function _showAcmError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}
function _hideAcmError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ----- 步骤1：上传图片 -----
function handleCharImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  _hideAcmError('acm-upload-error');

  // 必须是 PNG
  if (file.type !== 'image/png') {
    _showAcmError('acm-upload-error', '❌ 请上传 PNG 格式的图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // 验证透明底：采样图片边缘像素，检查是否有透明通道
      if (!_checkPngTransparency(img)) {
        _showAcmError('acm-upload-error', '⚠️ 未检测到透明通道，请上传透明底 PNG（建议使用去背景工具处理后再上传）');
        return;
      }
      _acmOriginalImage = img;
      document.getElementById('acm-upload-text').textContent = '✔ ' + file.name;
      // 进入裁剪步骤
      _showAcmStep(2);
      _initCropCanvas();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 透明底检测：在 canvas 上绘制图片，采样若干像素的 alpha 通道
// 只要有任意像素 alpha < 250，即认为有透明通道
function _checkPngTransparency(img) {
  const size = 200;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  // 采样策略：检查四角 + 中心区域的像素
  const samplePositions = [];
  // 四角 5x5 区域
  for (let r = 0; r < 5; r++) {
    for (let cc = 0; cc < 5; cc++) {
      samplePositions.push([r, cc]);
      samplePositions.push([r, size - 1 - cc]);
      samplePositions.push([size - 1 - r, cc]);
      samplePositions.push([size - 1 - r, size - 1 - cc]);
    }
  }
  for (const [row, col] of samplePositions) {
    const idx = (row * size + col) * 4;
    if (data[idx + 3] < 250) return true;
  }
  // 全图随机采样 500 个像素
  for (let i = 0; i < 500; i++) {
    const idx = Math.floor(Math.random() * (size * size)) * 4;
    if (data[idx + 3] < 250) return true;
  }
  return false;
}

// ----- 步骤2：裁剪 -----
function _initCropCanvas() {
  const img = _acmOriginalImage;
  if (!img) return;

  const canvas = document.getElementById('acm-crop-canvas');
  const wrap = document.getElementById('acm-crop-wrap');

  // 限制显示最大宽度
  const maxW = wrap.clientWidth || 600;
  const scale = Math.min(1, maxW / img.naturalWidth);
  const dispW = Math.round(img.naturalWidth * scale);
  const dispH = Math.round(img.naturalHeight * scale);

  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.style.width  = dispW + 'px';
  canvas.style.height = dispH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  // 初始化选区（全图）
  _acmCropRect = { x: 0, y: 0, w: dispW, h: dispH };
  _updateCropSelection();

  // 绑定拖拽事件（先移除旧的）
  const wrap2 = document.getElementById('acm-crop-wrap');
  wrap2.onmousedown  = _onCropMouseDown;
  wrap2.onmousemove  = _onCropMouseMove;
  wrap2.onmouseup    = _onCropMouseUp;
  wrap2.onmouseleave = _onCropMouseUp;
  // 触摸支持
  wrap2.ontouchstart = _onCropTouchStart;
  wrap2.ontouchmove  = _onCropTouchMove;
  wrap2.ontouchend   = _onCropMouseUp;
}

function _getWrapOffset(e) {
  const wrap = document.getElementById('acm-crop-wrap');
  const rect = wrap.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: Math.max(0, Math.min(clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(clientY - rect.top,  rect.height))
  };
}

function _onCropMouseDown(e) {
  e.preventDefault();
  _acmDragging = true;
  _acmDragStart = _getWrapOffset(e);
  _acmCropRect = { x: _acmDragStart.x, y: _acmDragStart.y, w: 0, h: 0 };
  _updateCropSelection();
}
function _onCropTouchStart(e) { e.preventDefault(); _onCropMouseDown(e); }

function _onCropMouseMove(e) {
  if (!_acmDragging) return;
  e.preventDefault();
  const pos = _getWrapOffset(e);
  const canvas = document.getElementById('acm-crop-canvas');
  const dispW = parseInt(canvas.style.width);
  const dispH = parseInt(canvas.style.height);

  let x = Math.min(_acmDragStart.x, pos.x);
  let y = Math.min(_acmDragStart.y, pos.y);
  let w = Math.abs(pos.x - _acmDragStart.x);
  let h = Math.abs(pos.y - _acmDragStart.y);

  // 等宽/等高模式：锁定宽高比
  if (_acmCropMode === 'width') {
    // 等宽：宽度固定为图片宽度，高度自由
    x = 0; w = dispW;
  } else if (_acmCropMode === 'height') {
    // 等高：高度固定为图片高度，宽度自由
    y = 0; h = dispH;
  }

  _acmCropRect = { x, y, w, h };
  _updateCropSelection();
}
function _onCropTouchMove(e) { e.preventDefault(); _onCropMouseMove(e); }

function _onCropMouseUp(e) {
  _acmDragging = false;
}

function _updateCropSelection() {
  const sel = document.getElementById('acm-crop-selection');
  const r = _acmCropRect;
  if (!r || r.w < 2 || r.h < 2) {
    sel.style.display = 'none';
    return;
  }
  sel.style.display = 'block';
  sel.style.left   = r.x + 'px';
  sel.style.top    = r.y + 'px';
  sel.style.width  = r.w + 'px';
  sel.style.height = r.h + 'px';
}

function setCropMode(mode) {
  _acmCropMode = mode;
  _setActiveModeBtn('acm-mode-' + mode);
  // 重置选区为全图
  resetCrop();
}

function _setActiveModeBtn(activeId) {
  ['acm-mode-width', 'acm-mode-height', 'acm-mode-free'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', id === activeId);
  });
}

function resetCrop() {
  const canvas = document.getElementById('acm-crop-canvas');
  if (!canvas) return;
  const dispW = parseInt(canvas.style.width)  || canvas.width;
  const dispH = parseInt(canvas.style.height) || canvas.height;
  _acmCropRect = { x: 0, y: 0, w: dispW, h: dispH };
  _updateCropSelection();
}

function confirmCrop() {
  const r = _acmCropRect;
  const canvas = document.getElementById('acm-crop-canvas');
  if (!r || r.w < 4 || r.h < 4) {
    alert('请先拖拽选择裁剪区域');
    return;
  }

  // 将显示坐标转换为原始图片坐标
  const dispW = parseInt(canvas.style.width);
  const dispH = parseInt(canvas.style.height);
  const scaleX = canvas.width  / dispW;
  const scaleY = canvas.height / dispH;

  const srcX = Math.round(r.x * scaleX);
  const srcY = Math.round(r.y * scaleY);
  const srcW = Math.round(r.w * scaleX);
  const srcH = Math.round(r.h * scaleY);

  // 裁剪到新 canvas
  const out = document.createElement('canvas');
  out.width  = srcW;
  out.height = srcH;
  const ctx = out.getContext('2d');
  ctx.drawImage(_acmOriginalImage, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
  _acmCroppedDataURL = out.toDataURL('image/png');

  // 在步骤3预览
  const preview = document.getElementById('acm-preview-canvas');
  preview.width  = srcW;
  preview.height = srcH;
  preview.style.width  = '90px';
  preview.style.height = '90px';
  const pCtx = preview.getContext('2d');
  pCtx.drawImage(out, 0, 0);

  _showAcmStep(3);
}

function backToCrop() {
  _showAcmStep(2);
}

// ----- 步骤3：确认添加角色 -----
function confirmAddChar() {
  _hideAcmError('acm-form-error');

  const name = document.getElementById('acm-name').value.trim();
  if (!name) {
    _showAcmError('acm-form-error', '❌ 角色名称不能为空');
    return;
  }
  if (!_acmCroppedDataURL) {
    _showAcmError('acm-form-error', '❌ 请先完成图片裁剪');
    return;
  }

  const title   = document.getElementById('acm-title').value.trim()   || '神秘人物';
  const quote   = document.getElementById('acm-quote').value.trim()   || '"……"';
  const rawPhrases = document.getElementById('acm-phrases').value.trim();
  const phrases = rawPhrases
    ? rawPhrases.split('|').map(s => s.trim()).filter(Boolean)
    : ['……', '（沉默）'];
  const zone    = document.getElementById('acm-zone').value;
  const facing  = document.getElementById('acm-facing').value;

  _acmCustomCount++;
  const slug = 'custom_' + _acmCustomCount + '_' + Date.now();

  // 构建角色数据对象
  const charData = {
    slug,
    img: _acmCroppedDataURL,
    facingRight: facing === 'right',
    name,
    title,
    zone,
    quote,
    stats: { '职业': title, '类型': '自定义角色' },
    phrases,
    isCustom: true,
  };

  // 注入 characters 数组
  characters.push(charData);
  // 加入可见集合
  visibleChars.add(slug);

  // 动态创建角色 DOM 并插入对应区域
  const charEl = _createCharElement(charData);
  const zoneEl = document.getElementById(ZONE_IDS[zone]);
  if (zoneEl) {
    zoneEl.appendChild(charEl);
  }

  // 更新头像面板
  buildAvatarPanel();
  updateStatCount();
  updateFishIndex();

  // 启动 AI 行为
  setTimeout(() => scheduleAction(slug, charEl), 500 + Math.random() * 1000);

  saveState(); // 保存新增的自定义角色

  // 关闭弹窗
  document.getElementById('add-char-overlay').style.display = 'none';
  document.getElementById('add-char-modal').style.display = 'none';
  _resetAcmState();
}

// ----- 删除自定义角色 -----
function removeCustomChar(slug) {
  // 从 characters 数组移除
  const idx = characters.findIndex(c => c.slug === slug);
  if (idx === -1) return;
  characters.splice(idx, 1);

  // 从可见集合移除
  visibleChars.delete(slug);

  // 移除场景中的 DOM 元素
  const charEl = document.getElementById('char-' + slug);
  if (charEl) charEl.remove();

  // 刷新面板和统计
  buildAvatarPanel();
  updateStatCount();
  updateFishIndex();
  saveState(); // 保存删除后的状态
}

// 动态创建角色 DOM 元素（与 index.html 中硬编码结构一致）
function _createCharElement(c) {
  const div = document.createElement('div');
  div.className = 'character';
  div.id = 'char-' + c.slug;
  div.style.bottom = '40px';
  div.style.left   = (80 + Math.random() * 800) + 'px';
  div.dataset.zone = c.zone;
  // showInfo 由拖拽系统统一处理（未移动时触发）

  const img = document.createElement('img');
  img.src = c.img;
  img.alt = c.name;
  // 自定义角色图片已经是 dataURL，不需要 pixelated 渲染也可以
  img.style.imageRendering = 'auto';
  div.appendChild(img);

  const nameEl = document.createElement('div');
  nameEl.className = 'char-name';
  nameEl.textContent = c.name + ' · ' + c.title;
  div.appendChild(nameEl);

  const iconEl = document.createElement('div');
  iconEl.className = 'status-icon';
  iconEl.id = 'icon-' + c.slug;
  iconEl.textContent = '✨';
  div.appendChild(iconEl);

  return div;
}
