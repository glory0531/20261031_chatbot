import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DATA_DIR = path.join(__dirname, '../data');
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
export const DB_FILE = path.join(DATA_DIR, 'storage.json');

export const CURRENT_SCHEMA_VERSION = 2;

// 오픈 샤봇 공식 배포판 깨끗한 초기 데이터 스키마 (더미 데이터 없음)
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
    platform: 'chzzk', // 'chzzk' | 'soop' | 'twitch' | 'simulator'
    chzzkChannelId: '',
    chzzkChatChannelId: '',
    chzzkClientId: '',
    chzzkClientSecret: '',
    chzzkAccessToken: '',
    chzzkRefreshToken: '',
    chzzkWriteEnabled: false,
    suppressPointMessagesInChat: true,
    soopId: '',
    twitchChannel: '',
    youtubeChannel: '',
    autoMessageIntervalMin: 10
  },
  commands: [
    {
      id: 'cmd-help',
      name: '명령어',
      response: '💡 챗봇 명령어 목록: !출첵, !포인트, !도네, !sr, !신청, !주사위, !낚시, !가위바위보, !룰렛, !디코, !일정',
      permission: 'all',
      cooldown: 5,
      cost: 0,
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
      enabled: true,
      count: 0,
      matchType: 'exact',
      visibleInViewer: true
    }
  ],
  defaultCommands: {
    uptime: { enabled: true, name: '업타임', desc: '방송 켠 시간 확인', visibleInViewer: true },
    title: { enabled: true, name: '방제', desc: '방송 제목 변경 (매니저/스트리머)', visibleInViewer: true },
    category: { enabled: true, name: '카테고리', desc: '카테고리 변경 (매니저/스트리머)', visibleInViewer: true },
    attend: { enabled: true, name: '출첵', desc: '일일 출석 체크 및 포인트 적립', visibleInViewer: true },
    point: { enabled: true, name: '포인트', desc: '내 보유 포인트 잔액 확인', visibleInViewer: true },
    donate: { enabled: true, name: '도네', desc: '포인트 방송 후원 및 TTS 재생', visibleInViewer: true },
    fund: { enabled: true, name: '모금', desc: '포인트 모금함 기부', visibleInViewer: true },
    vote: { enabled: true, name: '투표', desc: '포인트 예측/투표 배팅', visibleInViewer: true },
    sr: { enabled: true, name: 'sr', desc: '유튜브 노래 신청', visibleInViewer: true },
    request: { enabled: true, name: '신청', desc: '시청자 참여/미션 신청', visibleInViewer: true },
    dice: { enabled: true, name: '주사위', desc: '1~100 랜덤 주사위 굴리기', visibleInViewer: true },
    fishing: { enabled: true, name: '낚시', desc: '랜덤 낚시 미니게임', visibleInViewer: true },
    rps: { enabled: true, name: '가위바위보', desc: '포인트 가위바위보 대결', visibleInViewer: true },
    roulette: { enabled: true, name: '룰렛', desc: '포인트 행운의 룰렛 돌리기', visibleInViewer: true },
    numpick: { enabled: true, name: '뽑기', desc: '1~100 추억의 종이 뽑기', visibleInViewer: true },
    ticket: { enabled: true, name: '티켓', desc: '보유 티켓 확인 및 사용', visibleInViewer: true },
    jump: { enabled: true, name: '점프', desc: '채팅 아바타 점프 모션', visibleInViewer: true }
  },
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
      volume: 75
    }
  },
  generalRequests: [],
  fund: {
    title: '시청자와 함께하는 방송 컨텐츠 모금함',
    goalPoints: 50000,
    currentPoints: 0,
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
      { id: 'r-4', name: '포인트 500P 반환', chance: 30, color: '#10b981' },
      { id: 'r-5', name: '꽝 (다음 기회에)', chance: 43, color: '#6b7280' }
    ],
    cost: 500,
    history: []
  },
  numpick: {
    title: '추억의 문방구 종이 뽑기 (1~100)',
    totalNumbers: 100,
    cost: 300,
    picked: {},
    prizes: [
      { id: 'p-1', rank: '1등', name: '치킨 기프티콘', chance: 2 },
      { id: 'p-2', rank: '2등', name: '햄버거 세트', chance: 6 },
      { id: 'p-3', rank: '3등', name: '아메리카노', chance: 15 },
      { id: 'p-4', rank: '4등', name: '편의점 간식', chance: 25 },
      { id: 'p-5', rank: '5등', name: '사탕 / 젤리', chance: 30 },
      { id: 'p-6', rank: '꽝', name: '꽝 (다음 기회에)', chance: 22 }
    ]
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
  avatars: []
};

// 디렉토리 초기화
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * 구버전 storage.json을 신버전 스키마로 무손실 딥 머지(Deep Migration)합니다.
 * 새 업데이트에서 추가된 설정 키나 기본 내장 명령어를 자동으로 병합하면서
 * 기존 사용자의 포인트, 명령어, 토큰, 설정은 100% 보존합니다.
 */
export function migrateAndMergeData(parsed) {
  const base = JSON.parse(JSON.stringify(defaultData));
  if (!parsed || typeof parsed !== 'object') return base;

  const hadExistingSetup = Boolean(
    parsed.settings?.chzzkChannelId ||
    (parsed.users && Object.keys(parsed.users).length > 0)
  );

  const mergedSettings = {
    ...base.settings,
    ...(parsed.settings || {})
  };

  // 구버전에서 마이그레이션된 유저는 이미 사용 중이므로 온보딩 완료로 자동 처리
  if (parsed.settings?.onboardingCompleted === undefined && hadExistingSetup) {
    mergedSettings.onboardingCompleted = true;
  }

  // 기본 명령어 딥 머지: 새로 추가된 기본 명령어는 자동 활성화하고, 기존 유저의 ON/OFF 설정은 유지
  const mergedDefaultCommands = { ...base.defaultCommands };
  if (parsed.defaultCommands && typeof parsed.defaultCommands === 'object') {
    for (const [key, val] of Object.entries(parsed.defaultCommands)) {
      mergedDefaultCommands[key] = {
        ...(base.defaultCommands[key] || {}),
        ...val
      };
    }
  }

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
      ...(parsed.songRequests?.settings || {})
    }
  };

  return {
    ...base,
    ...parsed,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    status: mergedStatus,
    settings: mergedSettings,
    defaultCommands: mergedDefaultCommands,
    songRequests: mergedSongRequests
  };
}

export function loadData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
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

// 포인트 CSV 내보내기
export function exportPointsCSV() {
  const header = '닉네임,보유포인트,연속출석일수,총출석수,총후원포인트,역할\n';
  const rows = Object.values(db.users || {}).map(u => {
    return `"${(u.nickname || '').replace(/"/g, '""')}",${u.points || 0},${u.attendStreak || 0},${u.totalAttends || 0},${u.totalDonation || 0},"${u.role || 'viewer'}"`;
  }).join('\n');
  return header + rows;
}

// 포인트 CSV 가져오기
export function importPointsCSV(csvText) {
  if (!csvText) return { success: false, count: 0 };
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return { success: false, count: 0 };

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
    if (!match || match.length < 2) continue;

    const parts = match.map(s => s.replace(/^,/, '').replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"').trim());
    const nickname = parts[0];
    const points = parseInt(parts[1], 10);
    const attendStreak = parseInt(parts[2], 10) || 0;
    const totalAttends = parseInt(parts[3], 10) || 0;
    const totalDonation = parseInt(parts[4], 10) || 0;
    const role = parts[5] || 'viewer';

    if (nickname && !isNaN(points)) {
      if (!db.users[nickname]) {
        db.users[nickname] = {
          nickname,
          points,
          attendStreak,
          totalAttends,
          lastAttend: '',
          totalDonation,
          tickets: [],
          role
        };
      } else {
        db.users[nickname].points = points;
        if (!isNaN(attendStreak)) db.users[nickname].attendStreak = attendStreak;
        if (!isNaN(totalAttends)) db.users[nickname].totalAttends = totalAttends;
        if (!isNaN(totalDonation)) db.users[nickname].totalDonation = totalDonation;
        if (role) db.users[nickname].role = role;
      }
      count++;
    }
  }

  commit();
  return { success: true, count };
}
