// ============================================================
//  dialogue.js — 角色对话语料库
//
//  结构说明：
//  - DIALOGUE_SCENES : 对话场景列表
//      每个场景是一个 lines 数组，每条台词格式：
//        { speaker: 'A' | 'B', text: '...' }
//      A = 发起方，B = 回应方（运行时由触发顺序决定）
//      占位符：
//        {nameA} → B 对 A 的称呼（B 叫 A 的名字时用）
//        {nameB} → A 对 B 的称呼（A 叫 B 的名字时用）
//      台词条数不限，可以一来一回，也可以一方连说多句。
//
//  - DIALOGUE_NICKNAMES : 称呼表
//      格式：{ 说话者slug: { 对方slug: '称呼' } }
//      未配置的组合自动回退到对方的 name 字段
// ============================================================

// ===== 对话场景库 =====
const DIALOGUE_SCENES = [

  // ── 工作 / 案件 ──────────────────────────────────────────

  {
    lines: [
      { speaker: 'A', text: '{nameB}，昨天那份证据整理好了吗？' },
      { speaker: 'B', text: '放心，{nameA}，已经锁进保险柜了。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '听说检察院那边又提交了新证据……' },
      { speaker: 'B', text: '什么？！现在才说？！' },
      { speaker: 'B', text: '开庭还有两小时！{nameA}，快去复印！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，委托人今天下午要来，你有空吗？' },
      { speaker: 'B', text: '我……我正好有个会议。' },
      { speaker: 'A', text: '……你昨天也是这个理由。' },
      { speaker: 'B', text: '（沉默）' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '这个案子的不在场证明，我怎么看都有漏洞。' },
      { speaker: 'B', text: '你也发现了？我昨晚翻了几小时卷宗，越看越不对劲。' },
      { speaker: 'A', text: '证人的证词和监控时间对不上。' },
      { speaker: 'B', text: '对。而且监控画面……好像被剪辑过。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，打印机又卡纸了！' },
      { speaker: 'B', text: '……又是你用的吧。' },
      { speaker: 'A', text: '开庭前必须把起诉书印出来！' },
      { speaker: 'B', text: '我去看看。上次也是这样，老板总是舍不得钱更新设备。' },
      { speaker: 'A', text: '拜托了！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{name}反馈说，上次那个物证有点问题。' },
      { speaker: 'A', text: '必须仔细核实，否则对方会拿来做文章。' },
      { speaker: 'B', text: '可是马上就要开庭了吧？' },
      { speaker: 'A', text: '我会尽量拖延时间，尽量不提出这种来历不明的证物。' },
      { speaker: 'B', text: '……明白了，我会核实的。{nameA}，你要撑住啊！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '上次庭审的时候证人明明在撒谎，但我找不到突破口。' },
      { speaker: 'B', text: '别急，{nameA}。证词里一定有矛盾，再看一遍。' },
      { speaker: 'A', text: '我已经看了五遍了……' },
      { speaker: 'B', text: '那就看第六遍。（摊手）' },
    ],
  },

  // ── 茶水间 / 日常 ─────────────────────────────────────────

  {
    lines: [
      { speaker: 'A', text: '{nameB}，茶水间的咖啡是你泡的吗？' },
      { speaker: 'B', text: '对，不过已经凉了。' },
      { speaker: 'A', text: '没关系，凉的也行。' },
      { speaker: 'B', text: '……{nameA}，你今天状态不太好吧。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '今天的盒饭……内容物好像有点……。' },
      { speaker: 'B', text: '但卖盒饭的可是那位“呕吐阿响”，要不我们去楼下便利店凑合一下？' },
      { speaker: 'A', text: '便利店的饭团又贵又小。' },
      { speaker: 'B', text: '那就……只能吃了！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，你知道冰箱里那盒布丁是谁的吗？' },
      { speaker: 'B', text: '不……不知道。' },
      { speaker: 'A', text: '……上面写着你的名字。' },
      { speaker: 'B', text: '（眼神飘移）那个……是我的。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '加班到这么晚，{nameB}你也还没走啊。' },
      { speaker: 'B', text: '文书没写完，哪走得了。{nameA}，你呢？' },
      { speaker: 'A', text: '我在等委托人的电话。' },
      { speaker: 'B', text: '……要不要一起叫外卖？' },
      { speaker: 'A', text: '好。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '唉，这个月的差旅报销还没批下来。' },
      { speaker: 'B', text: '财务说要等下个季度。' },
      { speaker: 'A', text: '下个季度？！那都三个月后了！' },
      { speaker: 'B', text: '{nameA}，先垫着吧……我也是。' },
    ],
  },

  // ── 洗手间 / 走廊 ─────────────────────────────────────────

  {
    lines: [
      { speaker: 'A', text: '{nameB}，你在这里干什么？' },
      { speaker: 'B', text: '我……只是路过。' },
      { speaker: 'A', text: '这里是洗手间门口。' },
      { speaker: 'B', text: '真的只是路过。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '（压低声音）{nameB}，刚才那个人是谁？' },
      { speaker: 'B', text: '（同样压低）不知道。但他在门口站了很久了。' },
      { speaker: 'A', text: '要不要去问一下？' },
      { speaker: 'B', text: '……还是算了。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，洗手间的镜子好像裂了一条缝。' },
      { speaker: 'B', text: '……从昨天就这样了。' },
      { speaker: 'A', text: '是你弄的？' },
      { speaker: 'B', text: '我没碰，我发誓。' },
      { speaker: 'A', text: '……那就更奇怪了。' },
    ],
  },

  // ── 法庭前 / 紧张 ─────────────────────────────────────────

  {
    lines: [
      { speaker: 'A', text: '{nameB}，你紧张吗？' },
      { speaker: 'B', text: '紧张？怎么可能！我，没有问题！' },
      { speaker: 'A', text: '你已经在这里站了十分钟了。' },
      { speaker: 'B', text: '……对不起！但是，我，没有问题！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，如果这次输了……' },
      { speaker: 'B', text: '不会输的，{nameA}。' },
      { speaker: 'A', text: '但万一——' },
      { speaker: 'B', text: '不会输的。我们从来没有放弃过。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '对方今天临时换人了，是个我没见过的。' },
      { speaker: 'B', text: '没见过的反而好对付。' },
      { speaker: 'A', text: '……你怎么这么自信？' },
      { speaker: 'B', text: '见过的才麻烦，万一是……（小声）' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '委托人好像赶时间。' },
      { speaker: 'B', text: '怎么看出来的？' },
      { speaker: 'A', text: '他一直在看手机。' },
      { speaker: 'B', text: '……{nameA}，你观察得也太仔细了。' },
      { speaker: 'A', text: '哼哼，基本功罢了。' },
    ],
  },

  // ── 轻松 / 搞笑 ───────────────────────────────────────────

  {
    lines: [
      { speaker: 'A', text: '{nameB}，你有没有觉得，这栋楼有点奇怪？' },
      { speaker: 'B', text: '奇怪？这里每天都有奇怪的事。' },
      { speaker: 'A', text: '我是说……比平时更奇怪，我好像从洗手间那边听到了枪声。' },
      { speaker: 'B', text: '……{nameA}，你最近睡眠够吗？' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '我昨晚梦见委托人在法庭上被判有罪了。' },
      { speaker: 'B', text: '梦都是反的，{nameA}，其实是你被判有罪了。' },
      { speaker: 'A', text: '……谢谢你的安慰。' },
      { speaker: 'B', text: '开玩笑的，好好准备吧。不然的话下个月的绩效评定要糟糕了。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，将军超人的新一集你看了吗？' },
      { speaker: 'B', text: '看了！最后那个反转……太厉害了！' },
      { speaker: 'A', text: '对吧！我就说将军超人不会输的！' },
      { speaker: 'B', text: '你很懂嘛！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '事务所的植物好像快枯了。' },
      { speaker: 'B', text: '上次浇水是谁负责的？' },
      { speaker: 'A', text: '……好像是我。' },
      { speaker: 'B', text: '那就是你的问题了。' },
      { speaker: 'A', text: '我最近太忙了！' },
      { speaker: 'B', text: '这种话和老板说去吧。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，你今天的发型……不一样？' },
      { speaker: 'B', text: '……被你发现了。我换了个发蜡。' },
      { speaker: 'A', text: '挺好看的，很适合你。' },
      { speaker: 'B', text: '诶（沉默片刻）……谢谢。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '我刚才在走廊碰到了逮捕君。' },
      { speaker: 'B', text: '……它又启动了？' },
      { speaker: 'A', text: '对。而且好像在往我这边移动。' },
      { speaker: 'B', text: '别理它。' },
      { speaker: 'A', text: '但它真的在动！' },
      { speaker: 'B', text: '别。理。它。' },
    ],
  },

  // ── 神秘 / 意味深长 ───────────────────────────────────────

  {
    lines: [
      { speaker: 'A', text: '（小声）{nameB}，DL-6号事件……你听说过吗？' },
      { speaker: 'B', text: '（停顿）……听说过。' },
      { speaker: 'A', text: '那件事……到底是怎么回事？' },
      { speaker: 'B', text: '那件事，最好不要深究。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，有些真相，即使找到了，也未必能说出口。' },
      { speaker: 'B', text: '……{nameA}，你今天说话怎么这么深沉。' },
      { speaker: 'A', text: '我只是在想一个案子。' },
      { speaker: 'B', text: '哪个案子？' },
      { speaker: 'A', text: '……别问了。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '我总觉得，这个案子背后还有什么没浮出水面。' },
      { speaker: 'B', text: '直觉？{nameA}，法庭上，证据才是一切。' },
      { speaker: 'A', text: '可是上次差点害委托人被判有罪啊。' },
      { speaker: 'B', text: '但最后没有。这不就够了嘛。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '……你有没有想过，换一份工作？' },
      { speaker: 'B', text: '（沉默）' },
      { speaker: 'A', text: '我只是随便问问。' },
      { speaker: 'B', text: '……想过。但每次走进法庭，就又忘了。' },
    ],
  },

  // ── 含随机词填充的场景 ────────────────────────────────────

  {
    lines: [
      { speaker: 'A', text: '上次和{name}一起{action}，挺愉快的，希望下次还有机会。' },
      { speaker: 'B', text: '哦？{name}也去了？我怎么不知道。' },
      { speaker: 'A', text: '你那天不是有案子吗。' },
      { speaker: 'B', text: '诶……那下次一定要叫上我啊。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，你看到过{name}吗？' },
      { speaker: 'B', text: '没注意……怎么了？' },
      { speaker: 'A', text: '那个人好像把{thing}落在茶水间了。' },
      { speaker: 'B', text: '……你才注意到啊，那东西放在那里都多久了……' },
      { speaker: 'B', text: '之后找保洁清理掉算了。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '昨天{action}的时候，{name}突然出现了。' },
      { speaker: 'B', text: '真的假的，{name}也在？' },
      { speaker: 'A', text: '对，还帮了不少忙。' },
      { speaker: 'B', text: '诶，还挺靠谱的嘛！下次也想和{name}一起{action}！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，{thing}是你的吗？' },
      { speaker: 'B', text: '不是，我还以为是{nameA}你的呢。' },
      { speaker: 'A', text: '那是谁的……' },
      { speaker: 'B', text: '要不在食堂里贴张纸条问问？' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '听说{name}最近在{action}？' },
      { speaker: 'B', text: '嗯，好像是。' },
      { speaker: 'A', text: '……他有这个时间？' },
      { speaker: 'B', text: '人家效率高嘛，{nameA}。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '我把{thing}忘在哪里了，{nameB}你有没有看到？' },
      { speaker: 'B', text: '没有……你上次用是在哪？' },
      { speaker: 'A', text: '好像是{action}的时候。' },
      { speaker: 'B', text: '那去那边找找吧。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{name}说要把{thing}还给我，结果到现在还没动静。' },
      { speaker: 'B', text: '你要不要直接去问？' },
      { speaker: 'A', text: '……开口有点难。' },
      { speaker: 'B', text: '那就继续等吧，{nameA}。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '上次{action}，{name}全程一言不发。' },
      { speaker: 'B', text: '那家伙偶尔就会这样。' },
      { speaker: 'A', text: '但最后结果还不错。' },
      { speaker: 'B', text: '君子敏于行而讷于言，{nameA}。' },
      { speaker: 'A', text: '……好难的话。' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，你会{action}吗？' },
      { speaker: 'B', text: '勉强会一点，怎么了？' },
      { speaker: 'A', text: '{name}在征集人一起哎。' },
      { speaker: 'B', text: '叫我就行，什么时候？' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '有人在茶水间捡到了{thing}，不知道是谁的。' },
      { speaker: 'B', text: '贴公告了吗？' },
      { speaker: 'A', text: '贴了，但没人认领。' },
      { speaker: 'B', text: '……{name}上周好像丢了东西，去问问他？' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '真不想和{name}合作……' },
      { speaker: 'B', text: '又是你们一组？' },
      { speaker: 'A', text: '嗯……不知道为什么，感觉就是合不来！' },
      { speaker: 'B', text: '那不然……我……' },
      { speaker: 'A', text: '可以吗？太好了，谢谢你，{nameB}！' },
      { speaker: 'B', text: '等一下等一下所以具体是要做什么？' },
      { speaker: 'A', text: '{action}。' },
      { speaker: 'B', text: '……对不起我先走了！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，又在加班吗？' },
      { speaker: 'B', text: '是啊，碰到了很麻烦的委托人……' },
      { speaker: 'B', text: '你要出门？' },
      { speaker: 'A', text: '嗯，接下来和{name}约了一起{action}！' },
      { speaker: 'B', text: '哈……（大声叹气）' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '{nameB}，都几点了，你怎么还在这！' },
      { speaker: 'B', text: '？' },
      { speaker: 'A', text: '该开会了，走走走，晚了的话{name}会生气的。' },
      { speaker: 'B', text: '啊，真的哎，我完全忘记了！' },
      { speaker: 'B', text: '等我收个尾……' },
      { speaker: 'A', text: '来不及了！去会议室……不，先上线zoom！' },
    ],
  },

  {
    lines: [
      { speaker: 'A', text: '约到{name}的时间了吗？' },
      { speaker: 'B', text: '没……这人行事历完全是满的啊，下周可以吗？' },
      { speaker: 'A', text: '不行。' },
      { speaker: 'B', text: '那只能牺牲午休时间了……' },
      { speaker: 'B', text: '不过好在，中午的会议室比较空呢。' },
      { speaker: 'A', text: '……这算好消息吗……' },
    ],
  },


];

// ===== 称呼表 =====
// 格式：DIALOGUE_NICKNAMES[说话者slug][对方slug] = '称呼'
// 未配置的组合自动回退到对方的 name 字段
const DIALOGUE_NICKNAMES = {
  naruhodou: {
    mayoi:       '真宵',
    chihiro:     '千寻姐',
    mitsurugi:   '御剑',
    itonokogiri: '糸锯刑警',
    yahari:      '矢张',
    lawyer2:     '大叔',
    pink_lady:   '小姐',
    ooba:        '大场女士',
    bentou:      '阿响女士',
    shogun:      '将军超人',
    houtsuki:    '宝月检察官',
    sayuri:      '小百合',
    cowboy:      '罪门先生',
    mystery:     '逮捕君',
    guard:       '保安',
  },
  mayoi: {
    naruhodou:   '成步堂哥',
    chihiro:     '姐姐',
    mitsurugi:   '御剑检察官',
    itonokogiri: '糸锯刑警',
    yahari:      '天流斎马西斯',
    lawyer2:     '大叔',
    pink_lady:   '粉色小姐',
    ooba:        '大婶',
    bentou:      '阿响',
    shogun:      '将军超人',
    houtsuki:    '宝月检察官',
    sayuri:      '小百合',
    cowboy:      '牛仔先生',
    mystery:     '逮捕君',
    guard:       '保安',
  },
  chihiro: {
    naruhodou:   '成步堂',
    mayoi:       '真宵',
    mitsurugi:   '御剑检察官',
    itonokogiri: '糸锯刑警',
    yahari:      '矢张先生',
    lawyer2:     '大叔',
    pink_lady:   '秘书小姐',
    ooba:        '大场女士',
    bentou:      '你',
    shogun:      '将军超人',
    houtsuki:    '宝月检察官',
    sayuri:      '小百合',
    cowboy:      '罪门先生',
    mystery:     '逮捕君',
    guard:       '保安',
  },
  mitsurugi: {
    naruhodou:   '成步堂',
    mayoi:       '真宵',
    chihiro:     '绫里千寻',
    itonokogiri: '糸锯',
    yahari:      '矢张',
    lawyer2:     '法官',
    pink_lady:   '秘书小姐',
    ooba:        '大场女士',
    bentou:      '市之谷小姐',
    shogun:      '将军超人',
    houtsuki:    '宝月检察官',
    sayuri:      '小百合',
    cowboy:      '醉门先生',
    mystery:     '逮捕君',
    guard:       '原灰',
  },
  itonokogiri: {
    naruhodou:   '成步堂律师',
    mayoi:       '真宵',
    chihiro:     '绫里千寻',
    mitsurugi:   '御剑检察官',
    yahari:      '矢张',
    lawyer2:     '法官',
    pink_lady:   '秘书小姐',
    ooba:        '大场女士',
    bentou:      '市之谷小姐',
    shogun:      '将军超人',
    houtsuki:    '宝月检察官',
    sayuri:      '小百合',
    cowboy:      '醉门先生',
    mystery:     '逮捕君',
    guard:       '原灰',
  },
  yahari: {
    naruhodou:   '成步堂',
    mayoi:       '真宵',
    chihiro:     '绫里律师',
    mitsurugi:   '御剑',
    itonokogiri: '糸锯',
    lawyer2:     '法官',
    pink_lady:   '秘书',
    ooba:        '大婶',
    bentou:      '阿响',
    shogun:      '将军超人',
    houtsuki:    '宝月检察官',
    sayuri:      '小百合',
    cowboy:      '牛仔',
    mystery:     '逮捕君',
    guard:       '保安',
  },

};

// ── 次要角色兜底称呼表（全部使用默认 list，各自跳过自身 slug）──
const _DEFAULT_NICKNAMES = {
  naruhodou:   '成步堂',
  mayoi:       '真宵',
  chihiro:     '绫里律师',
  mitsurugi:   '御剑检察官',
  itonokogiri: '糸锯刑警',
  yahari:      '矢张',
  lawyer2:     '法官',
  pink_lady:   '秘书小姐',
  ooba:        '大场女士',
  bentou:      '阿响小姐',
  shogun:      '将军超人',
  houtsuki:    '宝月检察官',
  sayuri:      '小百合',
  cowboy:      '醉门先生',
  mystery:     '逮捕君',
  guard:       '原灰',
};

const _SECONDARY_SLUGS = [
  'lawyer2', 'pink_lady', 'ooba', 'bentou', 'shogun',
  'houtsuki', 'sayuri', 'cowboy', 'mystery', 'guard',
];

for (const slug of _SECONDARY_SLUGS) {
  DIALOGUE_NICKNAMES[slug] = Object.fromEntries(
    Object.entries(_DEFAULT_NICKNAMES).filter(([k]) => k !== slug)
  );
}

// ===== 随机词库 =====

// 物品 / 事物
const THINGS_LIST = [
  '证据袋', '卷宗', '印章', '便当盒', '钢笔', '咖啡杯',
  '飘飘', '名片', '剪报', '尸检报告', '将军超人钥匙扣', '笔记本',
  '手枪', '文件夹', '眼镜盒','马桶搋子','国际象棋','勾玉','扑克牌','葡萄酒','拉面碗'
];

// 做的事（动词短语）
const ACTIONS_LIST = [
  '整理证据', '开庭前准备', '去旁听庭审', '写文书',
  '参加研讨会', '和委托人谈话', '去档案室查卷宗',
  '在茶水间聊天', '烤地瓜', '去便利店买东西',
  '参加部门周会', '出庭作证', '去拘留所见委托人',
  '一起坐电梯', '在走廊吃铜锣烧','下国际象棋','吃拉面','修电脑','去公园划船','刷厕所'
];

// ===== 工具函数 =====

/**
 * 获取说话者对对方的称呼。
 * 优先级：
 *   1. DIALOGUE_NICKNAMES[speaker][target]  — 精确配置的称呼
 *   2. _DEFAULT_NICKNAMES[target]            — 说话者是自定义角色时，用通用默认称呼
 *   3. target.name                           — 最终兜底（自定义角色互称、或目标也是自定义角色）
 */
function getDialogueNickname(speakerSlug, targetSlug) {
  // 1. 精确配置
  const map = DIALOGUE_NICKNAMES[speakerSlug];
  if (map && map[targetSlug]) return map[targetSlug];

  // 2. 说话者是自定义角色 → 用 _DEFAULT_NICKNAMES 里的通用称呼叫内置角色
  const speaker = characters.find(c => c.slug === speakerSlug);
  if (speaker && speaker.isCustom) {
    if (_DEFAULT_NICKNAMES[targetSlug]) return _DEFAULT_NICKNAMES[targetSlug];
  }

  // 3. 最终兜底：用对方的 name 字段
  const target = characters.find(c => c.slug === targetSlug);
  return target ? target.name : targetSlug;
}

/**
 * 随机从数组中取一个元素。
 */
function _randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 随机选取一个对话场景，返回已替换称呼的台词序列。
 * 占位符：
 *   {nameA}  → B 对 A 的称呼
 *   {nameB}  → A 对 B 的称呼
 *   {name}   → 随机第三方角色，按说话人各自的称呼字典替换
 *   {thing}  → 随机物品
 *   {action} → 随机动作短语
 *
 * @param {string} slugA  发起方 slug
 * @param {string} slugB  回应方 slug
 * @returns {{ speaker: 'A'|'B', text: string }[]}
 */
function generateDialogueScene(slugA, slugB) {
  const scene = _randPick(DIALOGUE_SCENES);

  // A/B 互相的称呼
  const nameB = getDialogueNickname(slugA, slugB); // A 叫 B
  const nameA = getDialogueNickname(slugB, slugA); // B 叫 A

  // {name}：从除 A、B 之外的角色里随机抽一个第三方
  const otherSlugs = characters
    .map(c => c.slug)
    .filter(s => s !== slugA && s !== slugB);
  const thirdSlug = _randPick(otherSlugs);
  // A 和 B 对第三方的称呼可能不同，分别查字典
  const nameFromA = getDialogueNickname(slugA, thirdSlug); // A 叫第三方
  const nameFromB = getDialogueNickname(slugB, thirdSlug); // B 叫第三方

  // {thing} / {action} 场景级抽一次，全程一致
  const thing  = _randPick(THINGS_LIST);
  const action = _randPick(ACTIONS_LIST);

  return scene.lines.map(line => {
    const isA = line.speaker === 'A';
    const nameForThird = isA ? nameFromA : nameFromB;
    return {
      speaker: line.speaker,
      text: line.text
        .replace(/\{nameB\}/g,  nameB)
        .replace(/\{nameA\}/g,  nameA)
        .replace(/\{name\}/g,   nameForThird)
        .replace(/\{thing\}/g,  thing)
        .replace(/\{action\}/g, action),
    };
  });
}
