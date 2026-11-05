import { db, commit } from './db.js';
import { sendChzzkChatMessage } from './chzzkClient.js';
import { searchYouTube } from './youtubeSearch.js';

// 쿨타임 메모리 저장소 (commandId_userId -> timestamp)
const cooldowns = new Map();
// 유저당 1회 한정 실행 기록 (commandId_userId)
const usedOncePerUser = new Set();
// 채팅 칩 적립 쿨타임 (userId -> timestamp)
const chatPointCooldowns = new Map();

// 소켓 IO 인스턴스 참조 보관
let ioInstance = null;

export function setSocketIO(io) {
  ioInstance = io;
}

export function getPointUnit() {
  return db.settings.pointName || 'P';
}

export function getChipUnit() {
  return db.settings.chipName || '칩';
}

export function getCurrencyUnit(currency = 'chips') {
  return currency === 'points' ? getPointUnit() : getChipUnit();
}

export function getCurrencyLabel(currency = 'chips') {
  return currency === 'points' ? '유료 포인트' : '보유 칩';
}

export function getUserBalance(user, currency = 'chips') {
  if (!user) return 0;
  return currency === 'points' ? (Number(user.points) || 0) : (Number(user.chips) || 0);
}

export function addUserBalance(user, currency = 'chips', amount = 0) {
  if (!user) return;
  const delta = Number(amount) || 0;
  if (currency === 'points') {
    user.points = Math.max(0, (Number(user.points) || 0) + delta);
  } else {
    user.chips = Math.max(0, (Number(user.chips) || 0) + delta);
  }
}

export function deductUserBalance(user, currency = 'chips', amount = 0) {
  addUserBalance(user, currency, -(Number(amount) || 0));
}

// 사용자 가져오기 또는 기본 생성 (유료 포인트는 0, 신규 가입 축하금 100은 활동 칩으로 지급)
export function getOrCreateUser(nickname, role = 'viewer') {
  if (!db.users[nickname]) {
    db.users[nickname] = {
      nickname,
      points: 0, // 치즈 후원 연동 유료 포인트
      chips: 100, // 신규 가입 축하 활동 칩
      attendStreak: 0,
      totalAttends: 0,
      lastAttend: '',
      totalCheeseDonation: 0,
      totalDonation: 0,
      tickets: [],
      role
    };
    commit();
  } else {
    if (db.users[nickname].points === undefined) db.users[nickname].points = 0;
    if (db.users[nickname].chips === undefined) db.users[nickname].chips = 0;
  }
  return db.users[nickname];
}

// 업타임 문자열 계산
export function getUptimeString() {
  const diffSec = Math.floor((Date.now() - db.status.startTime) / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  return `${hours}시간 ${minutes}분 ${seconds}초`;
}

// 무료 활동 칩/일반 포인트 관련 메시지 판별
export function isPointRelatedMessage(text = '', meta = {}) {
  if (meta.isPoint === true || meta.skipChzzk === true) return true;
  if (meta.isNotice || meta.isSongRequest || meta.isGeneralRequest) return false;

  const pointPatterns = [
    /\[(포인트|칩|잔액)\s*부족\]/,
    /님의\s*지갑/,
    /보유\s*(포인트|칩)/,
    /(포인트가|칩이)\s*부족/,
    /출석\s*완료/,
    /출석체크를\s*완료/,
    /연속\s*출석/,
    /후원하셨습니다/,
    /기부하셨습니다/,
    /배팅/,
    /걸었습니다/,
    /룰렛을\s*돌려/,
    /낚시\s*결과/,
    /가위바위보/,
    /남은\s*(포인트|칩)/,
    /보유:\s*\d+/,
    /사용법:\s*!(도네|모금|투표|가위바위보)/
  ];

  return pointPatterns.some(pattern => pattern.test(text));
}

// 봇 메시지 발송 함수 (유료 포인트 메시지 vs 무료 활동 칩 메시지 치지직 송출 분리 제어)
export function sendBotMessage(text, meta = {}) {
  const botMsg = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    user: db.settings.botName || '샤봇',
    isBot: true,
    message: text,
    time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    timestamp: Date.now(),
    role: 'bot',
    ...meta
  };

  console.log(`🤖 [${db.settings.botName || '샤봇'} 답장] ${text}`);

  if (!db.recentChats) db.recentChats = [];
  db.recentChats.push(botMsg);
  if (db.recentChats.length > 100) db.recentChats.shift();

  if (ioInstance) {
    ioInstance.emit('chat_message', botMsg);
  }

  // 치지직 공식 개발자 센터 API 활성화 시 실제 방송 채팅창으로 답장 전송
  if (db.settings.chzzkClientId && db.settings.chzzkClientSecret && db.settings.chzzkWriteEnabled) {
    if (meta.currencyType === 'points') {
      // 유료 포인트(치즈 적립 안내·유료 룰렛 당첨 등)는 별도 토글(기본 ON) 적용
      const allowPaidInChat = db.settings.sendPaidPointMessagesInChat !== false;
      if (!allowPaidInChat) {
        console.log(`🔇 [치지직 송출 제외 - 유료 포인트 설정 OFF] ${text}`);
      } else {
        sendChzzkChatMessage(text).catch((e) => console.warn('[Chzzk Send Error]', e.message));
      }
    } else {
      // 무료 활동 칩 메시지(출첵·지갑 조회·미니게임·모금 등)는 도배 방지 토글(기본 ON) 적용
      const suppressFreeChip = db.settings.suppressPointMessagesInChat !== false;
      const isPointOrChip = meta.currencyType === 'chips' || isPointRelatedMessage(text, meta);
      if (suppressFreeChip && isPointOrChip) {
        console.log(`🔇 [치지직 송출 제외 - 칩 도배 방지] ${text}`);
      } else {
        sendChzzkChatMessage(text).catch((e) => console.warn('[Chzzk Send Error]', e.message));
      }
    }
  }

  return botMsg;
}

// 치지직 치즈(유료 후원) 감지 및 유료 포인트 자동 적립
export function processCheeseDonation({
  user: username,
  isAnonymous = false,
  userIdHash = '',
  cheeseAmount = 0,
  donationType = 'CHAT',
  message = '',
  role = 'viewer',
  source = 'chzzk'
}) {
  const cheese = Number(cheeseAmount) || 0;
  if (cheese <= 0) return null;

  const upperType = String(donationType || 'CHAT').toUpperCase();
  const isMission = upperType.includes('MISSION');

  // 미션 치즈 적립 제외 정책 확인
  if (isMission && !db.settings.includeMissionCheese) {
    console.log(`ℹ️ [미션 치즈 적립 제외] ${username}: ${cheese}치즈 (${upperType})`);
    return null;
  }

  const pUnit = getPointUnit();
  const isEnabled = db.settings.cheesePointEnabled !== false;
  const ratePercent = Number(db.settings.cheesePointRatePercent ?? 100);
  const earnedPoints = (!isAnonymous && isEnabled) ? Math.max(0, Math.floor(cheese * (ratePercent / 100))) : 0;

  let currentPoints = 0;
  if (!isAnonymous && username && username !== '익명의 후원자') {
    const user = getOrCreateUser(username, role);
    if (userIdHash && user.userIdHash !== userIdHash) {
      user.userIdHash = userIdHash;
    }
    if (earnedPoints > 0) {
      user.points = (Number(user.points) || 0) + earnedPoints;
      user.totalCheeseDonation = (Number(user.totalCheeseDonation) || 0) + earnedPoints;
    }
    currentPoints = user.points;
    commit();

    if (ioInstance) {
      ioInstance.emit('points_update', db.users);
    }
  }

  // OBS 오버레이 후원 알림 (AlertOverlay)
  const donationData = {
    id: 'cheese-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    user: username,
    amount: earnedPoints > 0 ? earnedPoints : cheese,
    unit: earnedPoints > 0 ? pUnit : '치즈',
    cheeseAmount: cheese,
    donationType: 'cheese',
    message: message || '치즈 후원 감사합니다! 🧀',
    role,
    timestamp: Date.now()
  };

  if (db.settings.cheeseDonateOverlay !== false && ioInstance) {
    ioInstance.emit('donation_alert', donationData);
  }

  if (ioInstance) {
    ioInstance.emit('avatar_chat', {
      user: username,
      message: `🧀 ${cheese.toLocaleString()}치즈 후원!`,
      role
    });
  }

  // 치즈 후원 및 유료 포인트 적립 봇 안내 메시지
  if (db.settings.cheeseChatNotice !== false) {
    if (!isAnonymous && earnedPoints > 0) {
      sendBotMessage(
        `🧀 [${username}]님 ${cheese.toLocaleString()}치즈 후원 감사합니다! (+${earnedPoints.toLocaleString()}${pUnit} 적립 ➡️ 보유: ${currentPoints.toLocaleString()}${pUnit})`,
        { currencyType: 'points' }
      );
    } else {
      sendBotMessage(
        `🧀 [${username}]님이 ${cheese.toLocaleString()}치즈를 후원하셨습니다! "${message || '감사합니다!'}"`,
        { currencyType: 'points' }
      );
    }
  }

  console.log(`🧀 [치즈 후원 처리 완료] [${username}] ${cheese}치즈 ➔ +${earnedPoints}${pUnit} (보유: ${currentPoints}${pUnit})`);
  return donationData;
}

// 실시간 채팅 파싱 및 처리
export async function processChatMessage(chat) {
  const { user: username, userIdHash = '', message, role = 'viewer', source = 'chzzk' } = chat;
  if (!message) return null;

  // 봇 자신이 발송한 답장 메시지는 스스로 다시 처리하지 않도록 완벽 차단 (무한 루프 방지)
  const currentBotName = db.settings.botName || '샤봇';
  const botPrefix = `[${currentBotName}]`;
  if (chat.isBot || message.startsWith(botPrefix) || message.startsWith('[샤봇]') || message.startsWith('[모트봇]') || message.startsWith('[잼쿠봇]') || message.startsWith('[쿨타임]')) {
    return null;
  }

  const user = getOrCreateUser(username, role);
  if (userIdHash && user.userIdHash !== userIdHash) {
    user.userIdHash = userIdHash;
  }

  // 채팅 활동 칩 적립 (지정 간격마다 chips 증가!)
  const now = Date.now();
  const lastPointTime = chatPointCooldowns.get(username) || 0;
  if (now - lastPointTime > (db.settings.chatIntervalSeconds || 60) * 1000) {
    user.chips = (Number(user.chips) || 0) + (db.settings.chatPoints ?? 5);
    chatPointCooldowns.set(username, now);
    commit();
    if (ioInstance) ioInstance.emit('points_update', db.users);
  }

  // 수신된 채팅 메시지 객체 생성
  const chatMsg = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    user: username,
    isBot: false,
    message,
    time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    timestamp: Date.now(),
    role
  };

  if (!db.recentChats) db.recentChats = [];
  db.recentChats.push(chatMsg);
  if (db.recentChats.length > 100) db.recentChats.shift();

  if (ioInstance) {
    ioInstance.emit('chat_message', chatMsg);
    ioInstance.emit('avatar_chat', {
      user: username,
      message,
      role
    });
  }

  if (!db.status.botEnabled) return null;

  const trimmed = message.trim();

  // 1. 키워드 감지 커스텀 반응
  const keywordCmd = db.commands.find(c => {
    if (!c.enabled) return false;
    const triggerWord = c.name.toLowerCase();
    const targetMsg = trimmed.toLowerCase();
    if (c.matchType === 'contains') {
      return targetMsg.includes(triggerWord);
    }
    if (c.matchType === 'startsWith') {
      return targetMsg.startsWith(triggerWord);
    }
    return false;
  });

  if (keywordCmd) {
    return handleCustomCommand(keywordCmd, username, user, role);
  }

  const prefix = db.settings.prefix || '!';
  if (!trimmed.startsWith(prefix)) return null;

  const args = trimmed.slice(prefix.length).trim().split(/\s+/);
  const cmdName = args[0];
  const param = args.slice(1).join(' ');
  const target = args[1] ? args[1].replace(/^@/, '') : username;

  // 2. 기본 내장 명령어 검사
  const defaultHandled = await handleDefaultCommand(cmdName, param, target, user, role);
  if (defaultHandled) return defaultHandled;

  // 3. 일반 커스텀 명령어 검사
  const customCmd = db.commands.find(c => {
    if (!c.enabled) return false;
    if (c.matchType && c.matchType !== 'exact') return false;
    return c.name.toLowerCase() === cmdName.toLowerCase();
  });

  if (customCmd) {
    return handleCustomCommand(customCmd, target, user, role);
  }

  return null;
}

// 커스텀 명령어 처리
function handleCustomCommand(cmd, target, user, role) {
  const onceKey = `${cmd.id}_${user.nickname.toLowerCase()}`;
  const isOnce = Boolean(cmd.oncePerUser);
  if (isOnce && usedOncePerUser.has(onceKey)) {
    return null;
  }

  const roleHierarchy = { viewer: 1, follower: 2, sub: 3, manager: 4, streamer: 5 };
  const requiredLevel = roleHierarchy[cmd.permission] || 1;
  const userLevel = roleHierarchy[role] || 1;

  if (userLevel < requiredLevel) {
    return null;
  }

  const cdKey = `${cmd.id}_${user.nickname}`;
  const now = Date.now();
  const lastUsed = cooldowns.get(cdKey) || 0;
  const cdMs = (cmd.cooldown || 0) * 1000;

  if (now - lastUsed < cdMs) {
    return null;
  }

  // 재화 소모 체크 (기본 'chips', 스트리머가 'points' 선택 가능)
  const currency = cmd.currency || 'chips';
  const unit = getCurrencyUnit(currency);
  const label = getCurrencyLabel(currency);

  if (cmd.cost > 0) {
    const bal = getUserBalance(user, currency);
    if (bal < cmd.cost) {
      return sendBotMessage(
        `[잔액 부족] ${cmd.name} 명령어를 쓰려면 ${cmd.cost.toLocaleString()}${unit}이(가) 필요해요 (${label}: ${bal.toLocaleString()}${unit}).`,
        { currencyType: currency }
      );
    }
    deductUserBalance(user, currency, cmd.cost);
    if (ioInstance) ioInstance.emit('points_update', db.users);
  }

  cooldowns.set(cdKey, now);
  if (isOnce) {
    usedOncePerUser.add(onceKey);
  }
  cmd.count = (cmd.count || 0) + 1;
  commit();

  // 변수 치환 ({points} 유료 포인트, {chips} 활동 칩 모두 지원)
  let responseText = cmd.response;
  responseText = responseText.replace(/{user}/g, user.nickname);
  responseText = responseText.replace(/{target}/g, target);
  responseText = responseText.replace(/{bot}/g, db.settings.botName || '샤봇');
  responseText = responseText.replace(/{streamer}/g, db.settings.streamerName || db.status.channelName || '스트리머');
  responseText = responseText.replace(/{fandom}/g, db.settings.fandomName || '시청자');
  responseText = responseText.replace(/{points}/g, (user.points || 0).toLocaleString());
  responseText = responseText.replace(/{chips}/g, (user.chips || 0).toLocaleString());
  responseText = responseText.replace(/{uptime}/g, getUptimeString());
  responseText = responseText.replace(/{title}/g, db.status.title);
  responseText = responseText.replace(/{category}/g, db.status.category);
  responseText = responseText.replace(/{count}/g, cmd.count);
  responseText = responseText.replace(/{time}/g, new Date().toLocaleTimeString('ko-KR'));

  responseText = responseText.replace(/{random:(\d+)-(\d+)}/g, (match, min, max) => {
    const minN = parseInt(min);
    const maxN = parseInt(max);
    return Math.floor(Math.random() * (maxN - minN + 1)) + minN;
  });

  return sendBotMessage(responseText, { isCustomCommand: true });
}

// 기본 명령어 처리
async function handleDefaultCommand(cmdName, param, target, user, role) {
  const dCmd = db.defaultCommands;
  const pUnit = getPointUnit();
  const cUnit = getChipUnit();

  // 1. !업타임
  if (dCmd.uptime?.enabled && (cmdName === '업타임' || cmdName === 'uptime')) {
    return sendBotMessage(`⏱️ 현재 방송 시작 후 [ ${getUptimeString()} ] 동안 달리는 중입니다!`);
  }

  // 2. !방제
  if (dCmd.title?.enabled && (cmdName === '방제' || cmdName === 'title')) {
    if (role !== 'manager' && role !== 'streamer') {
      return sendBotMessage(`[권한 부족] 방송 제목 변경은 매니저/스트리머만 가능해요.`);
    }
    if (!param) {
      return sendBotMessage(`현재 방제: "${db.status.title}"`);
    }
    db.status.title = param;
    commit();
    if (ioInstance) ioInstance.emit('status_update', db.status);
    return sendBotMessage(`📢 방송 제목이 "${param}"(으)로 변경되었습니다!`);
  }

  // 3. !카테고리
  if (dCmd.category?.enabled && (cmdName === '카테고리' || cmdName === 'category')) {
    if (role !== 'manager' && role !== 'streamer') {
      return sendBotMessage(`[권한 부족] 방송 카테고리 변경은 매니저/스트리머만 가능해요.`);
    }
    if (!param) {
      return sendBotMessage(`현재 카테고리: [ ${db.status.category} ]`);
    }
    db.status.category = param;
    commit();
    if (ioInstance) ioInstance.emit('status_update', db.status);
    return sendBotMessage(`🎮 방송 카테고리가 [ ${param} ](으)로 변경되었습니다!`);
  }

  // 4. !출첵 / !출석 (활동 칩 적립 고정)
  if (dCmd.attend?.enabled && (cmdName === '출첵' || cmdName === '출석' || cmdName === 'check')) {
    const today = new Date().toISOString().split('T')[0];
    if (user.lastAttend === today) {
      return sendBotMessage(
        `이미 오늘 출석체크를 완료하셨어요! (현재 ${user.attendStreak}일 연속 출석 중 · 보유: ${(user.chips || 0).toLocaleString()}${cUnit})`,
        { currencyType: 'chips' }
      );
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (user.lastAttend === yesterday) {
      user.attendStreak += 1;
    } else {
      user.attendStreak = 1;
    }
    user.totalAttends += 1;
    user.lastAttend = today;
    const baseChips = db.settings.attendPoints ?? 100;
    const bonusChips = (user.attendStreak - 1) * (db.settings.attendStreakBonus ?? 20);
    const earned = baseChips + bonusChips;
    user.chips = (Number(user.chips) || 0) + earned;
    commit();
    if (ioInstance) ioInstance.emit('points_update', db.users);

    return sendBotMessage(
      `🎉 [${user.nickname}]님 출석 완료! (+${earned.toLocaleString()}${cUnit} 지급, ${user.attendStreak}일 연속 출석! 보유: ${user.chips.toLocaleString()}${cUnit})`,
      { currencyType: 'chips' }
    );
  }

  // 5. !포인트 / !칩 / !지갑 (두 재화 통합 안내)
  if (dCmd.point?.enabled && (cmdName === '포인트' || cmdName === 'point' || cmdName === '칩' || cmdName === 'chip' || cmdName === '지갑')) {
    return sendBotMessage(
      `💰 [${user.nickname}]님의 지갑 — 유료 포인트: ${(user.points || 0).toLocaleString()}${pUnit} · 보유 칩: ${(user.chips || 0).toLocaleString()}${cUnit} (총 출석: ${user.totalAttends || 0}회)`,
      { currencyType: 'chips' }
    );
  }

  // 6. !도네 [금액] [메시지] (기본: 칩, 스트리머 재화 선택 가능)
  if (dCmd.donate?.enabled && (cmdName === '도네' || cmdName === 'donate')) {
    const currency = db.settings.donateCurrency || 'chips';
    const unit = getCurrencyUnit(currency);
    const label = getCurrencyLabel(currency);
    const parts = param.split(/\s+/);
    const amount = parseInt(parts[0]);
    const message = parts.slice(1).join(' ') || '항상 응원합니다!';

    if (isNaN(amount) || amount <= 0) {
      return sendBotMessage(`사용법: !도네 [${unit}] [메시지] (예: !도네 1000 스머님 파이팅!)`, { currencyType: currency });
    }

    const bal = getUserBalance(user, currency);
    if (bal < amount) {
      return sendBotMessage(`[잔액 부족] ${label} 잔액이 부족해요! (보유: ${bal.toLocaleString()}${unit} / 요청: ${amount.toLocaleString()}${unit})`, { currencyType: currency });
    }

    deductUserBalance(user, currency, amount);
    user.totalDonation = (user.totalDonation || 0) + amount;
    commit();
    if (ioInstance) ioInstance.emit('points_update', db.users);

    const donationData = {
      id: 'd-' + Date.now(),
      user: user.nickname,
      amount,
      unit,
      message,
      role: user.role,
      timestamp: Date.now()
    };

    if (ioInstance) {
      ioInstance.emit('donation_alert', donationData);
    }

    return sendBotMessage(`⚔️ [${user.nickname}]님이 ${amount.toLocaleString()}${unit}을(를) 후원하셨습니다! "${message}"`, { currencyType: currency });
  }

  // 7. !모금 [금액] (기본: 활동 칩, 스트리머 재화 선택 가능)
  if (dCmd.fund?.enabled && (cmdName === '모금' || cmdName === 'fund')) {
    const currency = db.fund?.currency || 'chips';
    const unit = getCurrencyUnit(currency);
    const label = getCurrencyLabel(currency);
    const amount = parseInt(param);

    if (isNaN(amount) || amount <= 0) {
      const fund = db.fund;
      const percent = fund.goalPoints > 0 ? Math.min(100, Math.floor((fund.currentPoints / fund.goalPoints) * 100)) : 0;
      return sendBotMessage(
        `📊 현재 모금 목표: [${fund.title}] - ${percent}% 달성 (${fund.currentPoints.toLocaleString()} / ${fund.goalPoints.toLocaleString()}${unit})`,
        { currencyType: currency }
      );
    }

    const bal = getUserBalance(user, currency);
    if (bal < amount) {
      return sendBotMessage(`[잔액 부족] 모금할 ${label} 잔액이 부족해요. (보유: ${bal.toLocaleString()}${unit})`, { currencyType: currency });
    }

    deductUserBalance(user, currency, amount);
    db.fund.currentPoints += amount;
    db.fund.recentDonors.unshift({ user: user.nickname, points: amount, unit, time: Date.now() });
    if (db.fund.recentDonors.length > 5) db.fund.recentDonors.pop();
    commit();

    if (ioInstance) {
      ioInstance.emit('fund_update', db.fund);
      ioInstance.emit('points_update', db.users);
    }

    const percent = db.fund.goalPoints > 0 ? Math.min(100, Math.floor((db.fund.currentPoints / db.fund.goalPoints) * 100)) : 0;
    return sendBotMessage(
      `💖 [${user.nickname}]님이 모금함에 ${amount.toLocaleString()}${unit}을(를) 기부하셨습니다! (진행률: ${percent}%)`,
      { currencyType: currency }
    );
  }

  // 8. !투표 [선택지번호] [칩] (증식/배팅형: 활동 칩 고정)
  if (dCmd.vote?.enabled && (cmdName === '투표' || cmdName === 'vote')) {
    const parts = param.split(/\s+/);
    const optionIdx = parseInt(parts[0]) - 1;
    const amount = parseInt(parts[1]);

    if (!db.prediction || db.prediction.status !== 'active') {
      return sendBotMessage(`현재 진행 중인 승부예측 투표가 없습니다.`, { currencyType: 'chips' });
    }

    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= db.prediction.options.length || isNaN(amount) || amount <= 0) {
      const optList = db.prediction.options.map((o, i) => `${i + 1}번: ${o.title}`).join(' | ');
      return sendBotMessage(`사용법: !투표 [번호] [${cUnit}] (주제: ${db.prediction.title} / 선택지: ${optList})`, { currencyType: 'chips' });
    }

    if ((user.chips || 0) < amount) {
      return sendBotMessage(`[칩 부족] 투표에 배팅할 ${cUnit}이 부족합니다. (보유: ${(user.chips || 0).toLocaleString()}${cUnit})`, { currencyType: 'chips' });
    }

    user.chips -= amount;
    const opt = db.prediction.options[optionIdx];
    opt.points += amount;
    opt.votes += 1;
    commit();

    if (ioInstance) {
      ioInstance.emit('prediction_update', db.prediction);
      ioInstance.emit('points_update', db.users);
    }
    return sendBotMessage(`🗳️ [${user.nickname}]님이 [${opt.title}]에 ${amount.toLocaleString()}${cUnit}을(를) 걸었습니다!`, { currencyType: 'chips' });
  }

  // 9. !sr [노래제목 또는 유튜브링크] (최소 비용 설정 시 선택된 재화 차감)
  if (dCmd.sr?.enabled && (cmdName === 'sr' || cmdName === '노래' || cmdName === '신청곡')) {
    if (!param) {
      const cur = db.songRequests.current;
      const count = db.songRequests.queue.length;
      return sendBotMessage(`🎵 현재 재생: [${cur ? cur.title : '없음'}] / 대기열: ${count}곡 (신청: !sr 노래제목)`);
    }

    const maxQueue = db.songRequests.settings.maxQueueSize || 20;
    if (db.songRequests.queue.length >= maxQueue) {
      return sendBotMessage(`[대기열 가득 참] 현재 노래 대기열이 꽉 찼습니다.`);
    }

    const minCost = Number(db.songRequests.settings?.minCost) || 0;
    const srCurrency = db.songRequests.settings?.currency || 'chips';
    const srUnit = getCurrencyUnit(srCurrency);
    if (minCost > 0) {
      const bal = getUserBalance(user, srCurrency);
      if (bal < minCost) {
        return sendBotMessage(`[잔액 부족] 노래를 신청하려면 ${minCost.toLocaleString()}${srUnit}이(가) 필요해요 (보유: ${bal.toLocaleString()}${srUnit}).`, { currencyType: srCurrency });
      }
      deductUserBalance(user, srCurrency, minCost);
      if (ioInstance) ioInstance.emit('points_update', db.users);
    }

    const { videoId, title } = await searchYouTube(param);

    const newSong = {
      id: 'sr-' + Date.now(),
      title,
      artist: '신청곡',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      requester: user.nickname,
      duration: '3:30',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      createdAt: Date.now()
    };

    if (!db.songRequests.current) {
      db.songRequests.current = newSong;
      db.songRequests.current.startedAt = Date.now();
      commit();
      if (ioInstance) ioInstance.emit('sr_update', db.songRequests);
      return sendBotMessage(`🎶 [${user.nickname}]님의 신청곡 [${title}] 재생을 시작합니다! 🎵`, { isSongRequest: true });
    } else {
      db.songRequests.queue.push(newSong);
      commit();
      if (ioInstance) ioInstance.emit('sr_update', db.songRequests);
      return sendBotMessage(`🎶 [${user.nickname}]님의 신청곡 [${title}]이(가) 대기열 ${db.songRequests.queue.length}번째로 등록되었습니다!`, { isSongRequest: true });
    }
  }

  // 10. !신청 [시참/미션 내용]
  if (dCmd.request?.enabled && (cmdName === '신청' || cmdName === '시참')) {
    if (!param) {
      return sendBotMessage(`사용법: !신청 [내용] (예: !신청 다음 판 야스오 해주세요)`);
    }

    const newReq = {
      id: 'req-' + Date.now(),
      title: param,
      requester: user.nickname,
      status: 'waiting',
      createdAt: Date.now()
    };

    db.generalRequests.push(newReq);
    commit();

    if (ioInstance) ioInstance.emit('requests_update', db.generalRequests);
    return sendBotMessage(`📝 [${user.nickname}]님의 신청이 등록되었습니다: "${param}"`, { isGeneralRequest: true });
  }

  // 11. !주사위
  if (dCmd.dice?.enabled && (cmdName === '주사위' || cmdName === 'dice')) {
    const rolled = Math.floor(Math.random() * 100) + 1;
    return sendBotMessage(`🎲 [${user.nickname}]님이 주사위를 굴려 [ ${rolled} ]이(가) 나왔습니다! (1~100)`);
  }

  // 12. !낚시 (증식형 미니게임: 활동 칩 고정)
  if (dCmd.fishing?.enabled && (cmdName === '낚시' || cmdName === 'fish')) {
    const cost = 20;
    if ((user.chips || 0) < cost) {
      return sendBotMessage(`[칩 부족] 낚시 미끼를 사려면 ${cost}${cUnit}이 필요해요 (보유: ${(user.chips || 0).toLocaleString()}${cUnit}).`, { currencyType: 'chips' });
    }
    user.chips -= cost;

    const outcomes = [
      { name: '낡은 장화', chips: 5, msg: `낡은 장화를 낚았습니다... 냄새가 납니다 👞 (+5${cUnit})` },
      { name: '붕어', chips: 30, msg: `펄떡이는 토종 붕어를 낚았습니다! 🐟 (+30${cUnit})` },
      { name: '월척 참돔', chips: 80, msg: `와 대박! 50cm 월척 참돔을 낚았습니다! 🎣 (+80${cUnit})` },
      { name: '전설의 황금 잉어', chips: 300, msg: `대애애박!! 번쩍이는 [전설의 황금 잉어]를 낚았습니다!! ✨🐟✨ (+300${cUnit})` },
      { name: '바다 쓰레기', chips: 0, msg: `미끼만 뜯기고 빈 캔만 건졌습니다 🥫 (0${cUnit})` }
    ];

    const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
    user.chips += pick.chips;
    commit();
    if (ioInstance) ioInstance.emit('points_update', db.users);

    return sendBotMessage(`🎣 [${user.nickname}]님의 낚시 결과: ${pick.msg} (현재: ${user.chips.toLocaleString()}${cUnit})`, { currencyType: 'chips' });
  }

  // 13. !가위바위보 [가위/바위/보] [배팅칩] (증식형 미니게임: 활동 칩 고정)
  if (dCmd.rps?.enabled && (cmdName === '가위바위보' || cmdName === 'rps')) {
    const parts = param.split(/\s+/);
    const choice = parts[0];
    const bet = parseInt(parts[1]) || 50;

    const valid = ['가위', '바위', '보'];
    if (!valid.includes(choice)) {
      return sendBotMessage(`사용법: !가위바위보 [가위/바위/보] [배팅${cUnit}] (예: !가위바위보 바위 100)`, { currencyType: 'chips' });
    }

    if ((user.chips || 0) < bet) {
      return sendBotMessage(`[칩 부족] 배팅할 ${cUnit}이 부족해요. (보유: ${(user.chips || 0).toLocaleString()}${cUnit})`, { currencyType: 'chips' });
    }

    const botChoice = valid[Math.floor(Math.random() * 3)];
    let result = '';
    if (choice === botChoice) {
      result = `비겼습니다! 배팅 ${cUnit}이 반환됩니다.`;
    } else if (
      (choice === '가위' && botChoice === '보') ||
      (choice === '바위' && botChoice === '가위') ||
      (choice === '보' && botChoice === '바위')
    ) {
      const winChips = bet * 2;
      user.chips += bet;
      result = `축하합니다, 이겼습니다! 🎉 +${winChips.toLocaleString()}${cUnit} 획득!`;
    } else {
      user.chips -= bet;
      result = `아쉽지만 봇에게 졌습니다 😢 (-${bet.toLocaleString()}${cUnit})`;
    }
    commit();
    if (ioInstance) ioInstance.emit('points_update', db.users);

    return sendBotMessage(
      `✌️✊🖐️ [${user.nickname}]: ${choice} vs [${db.settings.botName || '샤봇'}]: ${botChoice} ➡️ ${result} (현재: ${user.chips.toLocaleString()}${cUnit})`,
      { currencyType: 'chips' }
    );
  }

  // 14. !점프
  if (dCmd.jump?.enabled && (cmdName === '점프' || cmdName === 'jump')) {
    if (ioInstance) {
      ioInstance.emit('avatar_action', { user: user.nickname, action: 'jump' });
    }
    return null;
  }

  // 15. !룰렛 (기본: 유료 포인트 차감, 스트리머 재화 전환 가능)
  if ((dCmd.roulette?.enabled !== false) && (cmdName === '룰렛' || cmdName === 'roulette')) {
    const currency = db.roulette?.currency || 'points';
    const unit = getCurrencyUnit(currency);
    const label = getCurrencyLabel(currency);
    const cost = db.roulette?.cost ?? 500;
    const bal = getUserBalance(user, currency);

    if (bal < cost) {
      return sendBotMessage(
        `[잔액 부족] 룰렛을 돌리려면 ${cost.toLocaleString()}${unit}이(가) 필요해요 (${label}: ${bal.toLocaleString()}${unit}).`,
        { currencyType: currency }
      );
    }

    const items = db.roulette?.items || [];
    if (items.length === 0) {
      return sendBotMessage(`현재 설정된 룰렛 항목이 없습니다.`, { currencyType: currency });
    }

    deductUserBalance(user, currency, cost);

    const totalChance = items.reduce((acc, it) => acc + (Number(it.chance) || 0), 0) || 100;
    const rand = Math.random() * totalChance;
    let accumulated = 0;
    let selected = items[items.length - 1];
    let sliceStartPercent = 0;
    let sliceEndPercent = 100;

    for (const item of items) {
      const start = (accumulated / totalChance) * 100;
      accumulated += Number(item.chance) || 0;
      const end = (accumulated / totalChance) * 100;
      if (rand <= accumulated) {
        selected = item;
        sliceStartPercent = start;
        sliceEndPercent = end;
        break;
      }
    }

    // 항목 이름에 '500P 반환' 또는 '300칩 지급' 등이 있을 경우 자동 페이백 호환 처리
    const pointRefundMatch = selected.name.match(/(\d+)\s*(?:P|포인트)\s*(?:반환|페이백|지급)/i);
    const chipRewardMatch = selected.name.match(/(\d+)\s*(?:칩|쿠키)\s*(?:반환|페이백|지급)/i);
    if (pointRefundMatch) {
      addUserBalance(user, 'points', parseInt(pointRefundMatch[1], 10));
    } else if (chipRewardMatch) {
      addUserBalance(user, 'chips', parseInt(chipRewardMatch[1], 10));
    }

    const sliceMidPercent = (sliceStartPercent + sliceEndPercent) / 2;
    const sliceMidAngle = (sliceMidPercent / 100) * 360;
    const targetAngle = (360 - sliceMidAngle) % 360;

    const spinResult = {
      user: user.nickname,
      winner: selected.name,
      item: selected,
      targetAngle,
      time: Date.now()
    };

    if (!db.roulette.history) db.roulette.history = [];
    db.roulette.history = [spinResult, ...db.roulette.history.slice(0, 19)];
    commit();

    if (ioInstance) {
      ioInstance.emit('spin_roulette', spinResult);
      ioInstance.emit('roulette_update', db.roulette);
      ioInstance.emit('points_update', db.users);
    }

    const remaining = getUserBalance(user, currency);
    return sendBotMessage(
      `🎰 [${user.nickname}]님이 ${cost.toLocaleString()}${unit}로 룰렛을 돌려 [ ${selected.name} ]에 당첨되셨습니다! (남은 잔액: ${remaining.toLocaleString()}${unit})`,
      { currencyType: currency }
    );
  }


  return null;
}

// 자동 메시지 스케줄러
export function startAutoMessageScheduler() {
  setInterval(() => {
    if (!db.status.botEnabled) return;
    const now = Date.now();

    db.autoMessages.forEach(msg => {
      if (!msg.enabled) return;

      const intervalMs = (msg.intervalMin || 10) * 60 * 1000;
      if (now - (msg.lastSent || 0) >= intervalMs) {
        if (msg.categoryFilter === 'include' && msg.categoryTarget) {
          if (!db.status.category.toLowerCase().includes(msg.categoryTarget.toLowerCase())) return;
        } else if (msg.categoryFilter === 'exclude' && msg.categoryTarget) {
          if (db.status.category.toLowerCase().includes(msg.categoryTarget.toLowerCase())) return;
        }

        msg.lastSent = now;
        commit();
        sendBotMessage(`📢 [정기 공지] ${msg.text}`, { isNotice: true });
      }
    });
  }, 30000);
}
