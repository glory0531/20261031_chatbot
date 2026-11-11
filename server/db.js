import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DATA_DIR = path.join(__dirname, '../data');
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
export const DB_FILE = path.join(DATA_DIR, 'storage.json');

export const CURRENT_SCHEMA_VERSION = 4;

// 오픈 샤봇 공식 배포판 깨끗한 초기 데이터 스키마 (단일 방송 재화 '칩' 통합)
export const DEFAULT_COMMAND_PRESETS = {
  uptime: { enabled: true, name: '업타임', aliases: ['업타임', 'uptime', '방송시간'], desc: '방송 켠 시간 확인', response: '⏱️ 현재 방송 시작 후 [ {uptime} ] 동안 달리는 중입니다!', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  title: { enabled: true, name: '방제', aliases: ['방제', 'title', '제목'], desc: '방송 제목 변경 (매니저/스트리머)', response: '📢 방송 제목이 "{title}"(으)로 변경되었습니다!', permission: 'manager', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  category: { enabled: true, name: '카테고리', aliases: ['카테고리', 'category'], desc: '카테고리 변경 (매니저/스트리머)', response: '🎮 방송 카테고리가 [ {category} ](으)로 변경되었습니다!', permission: 'manager', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  attend: { enabled: true, name: '출첵', aliases: ['출첵', '출석', 'attend', 'check'], desc: '일일 출석 체크 및 재화 적립', response: '🎉 [{user}]님 출석 완료! (+{earned}{unit} 지급, {streak}일 연속 출석! 보유: {chips}{unit})', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  point: { enabled: true, name: '포인트', aliases: ['포인트', 'point', '칩', 'chip', '지갑'], desc: '보유 방송 재화 잔액 확인', response: '💰 [{user}]님의 지갑 — 보유 {cUnit}: {chips}{cUnit} (총 출석: {totalAttends}회)', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  donate: { enabled: true, name: '도네', aliases: ['도네', 'donate', '후원'], desc: '방송 재화 후원 및 TTS 재생', response: '⚔️ [{user}]님이 {amount}{unit}을(를) 후원하셨습니다! "{message}"', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  fund: { enabled: true, name: '모금', aliases: ['모금', 'fund', '기부'], desc: '방송 재화 모금함 기부', response: '💖 [{user}]님이 모금함에 {amount}{unit}을(를) 기부하셨습니다! (진행률: {percent}%)', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  vote: { enabled: true, name: '투표', aliases: ['투표', 'vote', '배팅'], desc: '방송 재화 승부예측/투표 배팅', response: '🗳️ [{user}]님이 [{option}]에 {amount}{unit}을(를) 걸었습니다!', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  sr: { enabled: true, name: 'sr', aliases: ['sr', '노래', '신청곡', '노래신청', '노래추가', '곡추가', 'song'], desc: '유튜브 노래 신청', response: '🎶 [{user}]님의 신청곡 [{title}]이(가) 등록되었습니다!', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  request: { enabled: true, name: '신청', aliases: ['신청', 'request', '미션'], desc: '시청자 참여/미션 신청', response: '📋 [{user}]님의 신청 [{content}]이(가) 등록되었습니다!', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  dice: { enabled: true, name: '주사위', aliases: ['주사위', 'dice'], desc: '1~100 랜덤 주사위 굴리기', response: '🎲 [{user}]님의 주사위 결과: {dice} (1~100)', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  fishing: { enabled: true, name: '낚시', aliases: ['낚시', 'fish', 'fishing'], desc: '미끼 랜덤 낚시 미니게임', response: '🎣 [{user}]님의 낚시 결과: {result}', permission: 'all', cooldown: 5, cost: 20, currency: 'chips', visibleInViewer: true },
  rps: { enabled: true, name: '가위바위보', aliases: ['가위바위보', 'rps'], desc: '가위바위보 배팅 대결', response: '✌️✊🖐️ [{user}]: {choice} vs {bot}: {botChoice} ➡️ {result}', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  roulette: { enabled: true, name: '룰렛', aliases: ['룰렛', 'roulette'], desc: '행운의 룰렛 돌리기', response: '🎰 [{user}]님이 {cost}{unit}로 룰렛을 돌려 [ {result} ]에 당첨되셨습니다!', permission: 'all', cooldown: 5, cost: 500, currency: 'chips', visibleInViewer: true },
  ticket: { enabled: true, name: '티켓', aliases: ['티켓', 'ticket'], desc: '보유 티켓 확인 및 사용', response: '🎫 [{user}]님의 보유 티켓: {count}장', permission: 'all', cooldown: 5, cost: 0, currency: 'chips', visibleInViewer: true },
  jump: { enabled: true, name: '점프', aliases: ['점프', 'jump'], desc: '채팅 아바타 점프 모션', response: '', permission: 'all', cooldown: 2, cost: 0, currency: 'chips', visibleInViewer: true }
};

export const defaultData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  status: {
    botEnabled: true,
    channelId: '',
    channelName: '스트리머',
    channelImageUrl: '',
    title: '오늘도 즐거운 방송 함께해요!',
    category: 'talk',
    viewers: 0,
    followerCount: 0,
    isLive: false,
    startTime: Date.now(),
    uptimeSeconds: 0,
    openDate: ''
  },
  settings: {
    prefix: '!',
    botName: '샤봇',
    streamerName: '스트리머',
    fandomName: '시청자',
    pointName: 'P',
    chipName: '칩',
    themePreset: 'chzzk-emerald', // 'chzzk-emerald' | 'cookie-amber' | 'midnight-violet' | 'luxury-salon' | 'rose-blossom'
    onboardingCompleted: false,
    autoUpdateOnStart: true,
    autoSimulatorEnabled: false,
    ttsEnabled: true,
    ttsVoice: 'Google 한국의',
    chatPoints: 5,
    chatIntervalSeconds: 60,
    attendPoints: 100,
    attendStreakBonus: 20,
    cheesePointEnabled: true,
    cheesePointRatePercent: 100, // 기본 1치즈 = 1P (100%)
    includeMissionCheese: false, // 미션 치즈 적립 포함 여부 (기본 제외)
    cheeseDonateOverlay: true,
    cheeseChatNotice: true,
    cheeseAutoFund: false, // 모금함은 활동 칩 전용으로 분리 (기본 OFF)
    donateCurrency: 'chips', // !도네 기본 사용 재화 ('chips' | 'points')
    platform: 'chzzk', // 'chzzk' | 'soop' | 'twitch' | 'simulator'
    chzzkChannelId: '',
    chzzkChatChannelId: '',
    chzzkClientId: '',
    chzzkClientSecret: '',
    chzzkAccessToken: '',
    chzzkRefreshToken: '',
    chzzkWriteEnabled: false,
    suppressPointMessagesInChat: true, // 무료 칩 활동 메시지 치지직 채팅 송출 제외 (도배 방지)
    sendPaidPointMessagesInChat: true, // 유료 포인트(치즈 적립·룰렛 당첨) 치지직 채팅 송출 (기본 ON)
    // 세분화된 치지직 채팅 송출 제어 (기본값)
    sendChatCheeseDonation: true, // 치즈 후원 적립 알림 (기본 ON)
    sendChatRoulette: true,       // 룰렛 당첨 결과 알림 (기본 ON)
    sendChatDonation: true,       // !도네 후원 알림 (기본 ON)
    sendChatAttendance: false,    // 출석체크 알림 (기본 OFF - 도배 방지)
    sendChatWallet: false,        // 지갑/잔액 조회 알림 (기본 OFF - 도배 방지)
    sendChatMiniGames: false,     // 미니게임 결과 알림 (기본 OFF - 도배 방지)
    sendChatInsufficient: false,  // 잔액/권한 부족 알림 (기본 OFF - 도배 방지)
    soopId: '',
    twitchChannel: '',
    youtubeChannel: '',
    autoMessageIntervalMin: 10
  },
  commands: [
    {
      id: 'cmd-help',
      name: '명령어',
      response: '💡 챗봇 명령어 목록: !출첵, !포인트, !칩, !모금, !도네, !sr, !신청, !주사위, !낚시, !가위바위보, !룰렛, !디코, !일정',
      permission: 'all',
      cooldown: 5,
      cost: 0,
      currency: 'chips',
      enabled: true,
      count: 0,
      matchType: 'exact',
      visibleInViewer: true
    },
    {
      id: 'cmd-discord',
      name: '디코',
      response: '디스코드에서 같이 소통해요! 초대 링크는 채널 정보 및 공지사항을 확인해주세요 🎮',
      permission: 'all',
      cooldown: 5,
      cost: 0,
      currency: 'chips',
      enabled: true,
      count: 0,
      matchType: 'exact',
      visibleInViewer: true
    },
    {
      id: 'cmd-schedule',
      name: '일정',
      response: '이번 주 방송 일정은 시청자 공개 페이지(/view)의 [주간 방송 일정표]에서 확인하실 수 있어요 📅',
      permission: 'all',
      cooldown: 10,
      cost: 0,
      currency: 'chips',
      enabled: true,
      count: 0,
      matchType: 'exact',
      visibleInViewer: true
    },
    {
      id: 'cmd-youtube',
      name: '유튜브',
      response: '재밌는 하이라이트와 다시보기가 올라오는 유튜브 채널 구독 & 좋아요 부탁드립니다! 📺',
      permission: 'all',
      cooldown: 5,
      cost: 0,
      currency: 'chips',
      enabled: true,
      count: 0,
      matchType: 'exact',
      visibleInViewer: true
    },
    {
      id: 'cmd-praise',
      name: '칭찬',
      response: '{user}님이 {target}님을 따뜻하게 칭찬합니다! 오늘 하루도 정말 고생 많으셨어요 🥰',
      permission: 'all',
      cooldown: 5,
      cost: 10,
      currency: 'chips',
      enabled: true,
      count: 0,
      matchType: 'exact',
      visibleInViewer: true
    }
  ],
  defaultCommands: { ...DEFAULT_COMMAND_PRESETS },
  autoMessages: [
    {
      id: 'auto-1',
      text: '디스코드와 채널 공지에서 방송 일정 및 소식을 확인해보세요! 🎮',
      intervalMin: 15,
      lastSent: Date.now(),
      enabled: true,
      categoryFilter: 'all',
      categoryTarget: ''
    },
    {
      id: 'auto-2',
      text: '팔로우와 알림 설정을 켜두시면 방송 시작 알림을 가장 빠르게 받아보실 수 있습니다 🔔',
      intervalMin: 25,
      lastSent: Date.now(),
      enabled: true,
      categoryFilter: 'all',
      categoryTarget: ''
    },
    {
      id: 'auto-3',
      text: '신청곡은 [!sr 노래제목] 또는 [!sr 유튜브링크]로 신청하실 수 있어요! 🎵',
      intervalMin: 30,
      lastSent: Date.now(),
      enabled: false,
      categoryFilter: 'all',
      categoryTarget: ''
    }
  ],
  users: {},
  recentChats: [],
  songRequests: {
    current: null,
    queue: [],
    isPlaying: true,
    volume: 75,
    isMuted: false,
    settings: {
      enabled: true,
      maxQueueSize: 20,
      maxPerUser: 2,
      minCost: 0,
      currency: 'chips',
      volume: 75
    }
  },
  generalRequests: [],
  fund: {
    title: '시청자와 함께하는 방송 컨텐츠 모금함',
    goalPoints: 50000,
    currentPoints: 0,
    currency: 'chips',
    enabled: true,
    recentDonors: []
  },
  prediction: {
    id: 'pred-ready',
    title: '오늘 방송 미션 성공할까?',
    options: [
      { id: '1', title: '성공한다! 👑', points: 0, votes: 0 },
      { id: '2', title: '실패한다... 💀', points: 0, votes: 0 }
    ],
    status: 'closed',
    winnerOptionId: null,
    createdAt: Date.now()
  },
  roulette: {
    items: [
      { id: 'r-1', name: '치킨 기프티콘', chance: 2, color: '#f59e0b' },
      { id: 'r-2', name: '노래 1곡 신청권', chance: 20, color: '#3b82f6' },
      { id: 'r-3', name: '소원권 (방제/게임 정하기)', chance: 5, color: '#ec4899' },
      { id: 'r-4', name: '칩 500개 반환', chance: 30, color: '#10b981' },
      { id: 'r-5', name: '꽝 (다음 기회에)', chance: 43, color: '#6b7280' }
    ],
    cost: 500,
    currency: 'chips',
    settings: {
      enabled: true,
      commandEnabled: true,
      commandTrigger: '',
      donationEnabled: false,
      donationUnitCheese: 1000,
      donationMaxCheese: 0,
      donationAllowNonMultiple: true,
      donationMessageKeyword: '',
      donationAlsoEarnChips: false,
      subEnabled: false,
      subTier: 'all',
      subGiftEnabled: false,
      subGiftTier: 'all',
      subGiftCountPerSpin: 1,
      pullLimitMode: 'max',
      maxPullCount: 0,
      fixedPullCounts: '1, 5, 10',
      bonusEnabled: true,
      bonusEveryN: 10,
      bonusAddM: 1,
      sendResultToChat: true,
      readResultTts: true
    },
    history: []
  },
  schedules: [
    { day: '월요일', time: '20:00', title: '정기 소통 & 종합게임 방송 🎮', off: false, tag: '정기' },
    { day: '화요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' },
    { day: '수요일', time: '20:00', title: '시청자 참여 컨텐츠 방송', off: false, tag: '시참' },
    { day: '목요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' },
    { day: '금요일', time: '21:00', title: '불금 메인 게임 달리기', off: false, tag: '정기' },
    { day: '토요일', time: '19:00', title: '주말 힐링 소통 & 노래방송', off: false, tag: '소통' },
    { day: '일요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' }
  ],
  weeklySchedules: {},
  activeWeekKey: '',
  avatars: [],
  liveDonations: []
};

// 디렉토리 초기화
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * 구버전 storage.json을 신버전(유료 포인트 + 활동 칩 이원화) 스키마로 무손실 딥 머지합니다.
 * - 구버전 단일 잔액(u.points)은 전량 활동 칩(u.chips)으로 자동 이관하고 유료 포인트(u.points)는 0으로 시작합니다.
 * - 이미 이원화된 데이터(u.chips 존재)는 유료 포인트와 칩 두 재화 모두 100% 보존합니다.
 */
export function migrateAndMergeData(parsed) {
  const base = JSON.parse(JSON.stringify(defaultData));
  if (!parsed || typeof parsed !== 'object') return base;

  // 문방구 뽑기(numpick) 기능 완전 제거
  delete parsed.numpick;
  if (parsed.defaultCommands) {
    delete parsed.defaultCommands.numpick;
  }

  const isLegacySchema = !parsed.schemaVersion || parsed.schemaVersion < 3;

  const hadExistingSetup = Boolean(
    parsed.settings?.chzzkChannelId ||
    (parsed.users && Object.keys(parsed.users).length > 0)
  );

  const mergedSettings = {
    ...base.settings,
    ...(parsed.settings || {})
  };

  // 구버전에서 pointName을 '칩'으로 쓰던 경우 유료 단위(P)와 활동 칩 단위(칩)가 겹치지 않도록 자동 분리
  if (isLegacySchema && parsed.settings?.pointName === '칩' && !parsed.settings?.chipName) {
    mergedSettings.chipName = '칩';
    mergedSettings.pointName = 'P';
  } else {
    mergedSettings.pointName = mergedSettings.pointName || 'P';
    mergedSettings.chipName = mergedSettings.chipName || '칩';
  }

  // 모금함은 활동 칩 전용으로 분리 (구버전 cheeseAutoFund 강제 OFF)
  if (isLegacySchema) {
    mergedSettings.cheeseAutoFund = false;
  }

  if (parsed.settings?.onboardingCompleted === undefined && hadExistingSetup) {
    mergedSettings.onboardingCompleted = true;
  }

  // 기본 명령어 딥 머지 (기본 프리셋 누락 필드 보완 및 단일 재화 일원화)
  const mergedDefaultCommands = { ...base.defaultCommands };
  if (parsed.defaultCommands && typeof parsed.defaultCommands === 'object') {
    for (const [key, val] of Object.entries(parsed.defaultCommands)) {
      const merged = {
        ...(DEFAULT_COMMAND_PRESETS[key] || base.defaultCommands[key] || {}),
        ...val,
        currency: 'chips'
      };
      // 구버전 이원화 응답 문구 자동 업그레이드
      if (key === 'point' && typeof merged.response === 'string' && merged.response.includes('유료 포인트:')) {
        merged.response = DEFAULT_COMMAND_PRESETS.point.response;
      }
      // sr 명령어 별칭에 '노래', '노래추가' 등 주요 한국어 별칭 자동 보완
      if (key === 'sr') {
        const existingAliases = Array.isArray(merged.aliases) ? merged.aliases : ['sr'];
        const essentialAliases = ['sr', '노래', '신청곡', '노래신청', '노래추가', '곡추가', 'song'];
        merged.aliases = Array.from(new Set([...existingAliases, ...essentialAliases]));
      }
      mergedDefaultCommands[key] = merged;
    }
  }

  // 커스텀 명령어 currency 기본값 보정 ('chips')
  const mergedCommands = Array.isArray(parsed.commands)
    ? parsed.commands.map(c => ({ ...c, currency: 'chips' }))
    : base.commands;

  const mergedStatus = {
    ...base.status,
    ...(parsed.status || {})
  };
  if (!mergedStatus.channelName || mergedStatus.channelName === '치지직 스트리머') {
    mergedStatus.channelName = mergedSettings.streamerName || '스트리머';
  }

  const mergedSongRequests = {
    ...base.songRequests,
    ...(parsed.songRequests || {}),
    settings: {
      ...base.songRequests.settings,
      ...(parsed.songRequests?.settings || {}),
      currency: 'chips'
    }
  };

  const mergedFund = {
    ...base.fund,
    ...(parsed.fund || {}),
    currency: 'chips'
  };

  const mergedRoulette = {
    ...base.roulette,
    ...(parsed.roulette || {}),
    currency: 'chips',
    settings: {
      ...base.roulette.settings,
      ...(parsed.roulette?.settings || {})
    }
  };

  // 시청자 지갑 마이그레이션: 기존 points 잔액을 chips로 1:1 자동 합산 (단일 재화 완전 통합)
  const mergedUsers = {};
  if (parsed.users && typeof parsed.users === 'object') {
    for (const [nick, rawUser] of Object.entries(parsed.users)) {
      if (!rawUser || typeof rawUser !== 'object') continue;
      const combinedChips = (Number(rawUser.chips) || 0) + (Number(rawUser.points) || 0);
      mergedUsers[nick] = {
        ...rawUser,
        nickname: rawUser.nickname || nick,
        points: 0,
        chips: combinedChips,
        totalCheeseDonation: Number(rawUser.totalCheeseDonation) || 0,
        totalDonation: Number(rawUser.totalDonation) || 0,
        tickets: Array.isArray(rawUser.tickets) ? rawUser.tickets : []
      };
    }
  }

  return {
    ...base,
    ...parsed,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    status: mergedStatus,
    settings: mergedSettings,
    commands: mergedCommands,
    defaultCommands: mergedDefaultCommands,
    songRequests: mergedSongRequests,
    fund: mergedFund,
    roulette: mergedRoulette,
    users: mergedUsers,
    liveDonations: Array.isArray(parsed?.liveDonations) ? parsed.liveDonations : []
  };
}

export function loadData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.schemaVersion || parsed.schemaVersion < CURRENT_SCHEMA_VERSION) {
        createLocalBackup('pre_schema_v3');
      }
      const migrated = migrateAndMergeData(parsed);
      saveData(migrated);
      return migrated;
    }
  } catch (err) {
    console.error('[DB] Failed to load storage.json, creating emergency backup & using defaults:', err);
    try {
      if (fs.existsSync(DB_FILE)) {
        fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, `corrupted_storage_${Date.now()}.json`));
      }
    } catch {}
  }
  const fresh = JSON.parse(JSON.stringify(defaultData));
  saveData(fresh);
  return fresh;
}

// 원자적(Atomic) 파일 저장으로 강제 종료 시 파일 깨짐 방지
export function saveData(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (fallbackErr) {
      console.error('[DB] Failed to save DB file:', fallbackErr);
    }
  }
}

// 로컬 타임스탬프 백업 파일 생성 (업데이트 직전 자동 호출 및 수동 백업용)
export function createLocalBackup(prefix = 'backup') {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) return null;
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${prefix}_${stamp}.json`;
    const dest = path.join(BACKUP_DIR, filename);
    fs.copyFileSync(DB_FILE, dest);

    // 오래된 자동 백업 정리 (최근 30개 유지)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const old of files.slice(30)) {
      try { fs.unlinkSync(path.join(BACKUP_DIR, old.name)); } catch {}
    }

    return dest;
  } catch (err) {
    console.warn('[DB] Backup warning:', err.message);
    return null;
  }
}

// 싱글톤 DB 인스턴스
export const db = loadData();

export function commit() {
  saveData(db);
}

// 데이터 전체 리셋 함수
export function resetToDefaultData() {
  createLocalBackup('pre_reset');
  Object.keys(db).forEach(key => delete db[key]);
  Object.assign(db, JSON.parse(JSON.stringify(defaultData)));
  commit();
  return db;
}

// 방송 재화(칩) CSV 내보내기
export function exportPointsCSV() {
  const header = '닉네임,보유재화(칩),연속출석일수,총출석수,누적치즈후원적립,누적재화후원,역할\n';
  const rows = Object.values(db.users || {}).map(u => {
    const totalChips = (Number(u.chips) || 0) + (Number(u.points) || 0);
    return `"${(u.nickname || '').replace(/"/g, '""')}",${totalChips},${u.attendStreak || 0},${u.totalAttends || 0},${u.totalCheeseDonation || 0},${u.totalDonation || 0},"${u.role || 'viewer'}"`;
  }).join('\n');
  return header + rows;
}

// 방송 재화 CSV 가져오기 (단일재화 및 구버전 2재화 CSV 모두 자동 호환하여 chips로 통합)
export function importPointsCSV(csvText) {
  if (!csvText) return { success: false, count: 0 };
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return { success: false, count: 0 };

  const headerLine = lines[0];
  const isLegacyDualCSV = headerLine.includes('보유포인트(유료)');
  const isNewSingleCSV = headerLine.includes('보유재화(칩)');

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
    if (!match || match.length < 2) continue;

    const parts = match.map(s => s.replace(/^,/, '').replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"').trim());
    const nickname = parts[0];
    if (!nickname) continue;

    if (isLegacyDualCSV) {
      const points = parseInt(parts[1], 10) || 0;
      const chips = parseInt(parts[2], 10) || 0;
      const combinedChips = points + chips;
      const attendStreak = parseInt(parts[3], 10) || 0;
      const totalAttends = parseInt(parts[4], 10) || 0;
      const totalCheeseDonation = parseInt(parts[5], 10) || 0;
      const totalDonation = parseInt(parts[6], 10) || 0;
      const role = parts[7] || 'viewer';

      if (!db.users[nickname]) {
        db.users[nickname] = {
          nickname,
          points: 0,
          chips: combinedChips,
          attendStreak,
          totalAttends,
          lastAttend: '',
          totalCheeseDonation,
          totalDonation,
          tickets: [],
          role
        };
      } else {
        db.users[nickname].points = 0;
        db.users[nickname].chips = combinedChips;
        db.users[nickname].attendStreak = attendStreak;
        db.users[nickname].totalAttends = totalAttends;
        db.users[nickname].totalCheeseDonation = totalCheeseDonation;
        db.users[nickname].totalDonation = totalDonation;
        if (role) db.users[nickname].role = role;
      }
      count++;
    } else if (isNewSingleCSV) {
      const chips = parseInt(parts[1], 10) || 0;
      const attendStreak = parseInt(parts[2], 10) || 0;
      const totalAttends = parseInt(parts[3], 10) || 0;
      const totalCheeseDonation = parseInt(parts[4], 10) || 0;
      const totalDonation = parseInt(parts[5], 10) || 0;
      const role = parts[6] || 'viewer';

      if (!db.users[nickname]) {
        db.users[nickname] = {
          nickname,
          points: 0,
          chips,
          attendStreak,
          totalAttends,
          lastAttend: '',
          totalCheeseDonation,
          totalDonation,
          tickets: [],
          role
        };
      } else {
        db.users[nickname].points = 0;
        db.users[nickname].chips = chips;
        db.users[nickname].attendStreak = attendStreak;
        db.users[nickname].totalAttends = totalAttends;
        db.users[nickname].totalCheeseDonation = totalCheeseDonation;
        db.users[nickname].totalDonation = totalDonation;
        if (role) db.users[nickname].role = role;
      }
      count++;
    } else {
      // 구버전 CSV: 단일 보유포인트 -> 보유칩으로 안전 이관
      const legacyVal = parseInt(parts[1], 10);
      if (isNaN(legacyVal)) continue;
      const attendStreak = parseInt(parts[2], 10) || 0;
      const totalAttends = parseInt(parts[3], 10) || 0;
      const totalDonation = parseInt(parts[4], 10) || 0;
      const role = parts[5] || 'viewer';

      if (!db.users[nickname]) {
        db.users[nickname] = {
          nickname,
          points: 0,
          chips: legacyVal,
          attendStreak,
          totalAttends,
          lastAttend: '',
          totalCheeseDonation: 0,
          totalDonation,
          tickets: [],
          role
        };
      } else {
        db.users[nickname].points = 0;
        db.users[nickname].chips = legacyVal;
        db.users[nickname].attendStreak = attendStreak;
        db.users[nickname].totalAttends = totalAttends;
        db.users[nickname].totalDonation = totalDonation;
        if (role) db.users[nickname].role = role;
      }
      count++;
    }
  }

  commit();
  return { success: true, count };
}
