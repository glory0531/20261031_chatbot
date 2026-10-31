import { db, commit } from './db.js';
import { sendChzzkChatMessage } from './chzzkClient.js';
import { searchYouTube } from './youtubeSearch.js';

// 쿨타임 메모리 저장소 (commandId_userId -> timestamp)
const cooldowns = new Map();
// 유저당 1회 한정 실행 기록 (commandId_userId)
const usedOncePerUser = new Set();
// 채팅 포인트 적립 쿨타임 (userId -> timestamp)
const chatPointCooldowns = new Map();

// 소켓 IO 인스턴스 참조 보관
let ioInstance = null;

export function setSocketIO(io) {
  ioInstance = io;
}

// 사용자 가져오기 또는 기본 생성
export function getOrCreateUser(nickname, role = 'viewer') {
  if (!db.users[nickname]) {
    db.users[nickname] = {
      nickname,
      points: 100, // 신규 가입 축하 포인트
      attendStreak: 0,
      totalAttends: 0,
      lastAttend: '',
      totalDonation: 0,
      tickets: [],
      role
    };
    commit();
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

// 포인트 관련 메시지 판별 (출석, 포인트 조회/후원/차감/부족/베팅/모금 등)
export function isPointRelatedMessage(text = '', meta = {}) {
  // 메타 태그가 명시적으로 지정된 경우
  if (meta.isPoint === true || meta.skipChzzk === true) return true;
  if (meta.isNotice || meta.isSongRequest || meta.isGeneralRequest) return false;

  const pointPatterns = [
    /\[포인트\s*부족\]/,
    /보유\s*포인트/,
    /포인트가\s*부족/,
    /출석\s*완료/,
    /출석체크를\s*완료/,
    /연속\s*출석/,
    /후원하셨습니다/,
    /기부하셨습니다/,
    /배팅/,
    /걸었습니다/,
    /룰렛을\s*돌려/,
    /뽑기\s*결과/,
    /낚시\s*결과/,
    /가위바위보/,
    /남은\s*포인트/,
    /보유:\s*\d+/,
    /사용법:\s*!(도네|모금|투표|가위바위보|뽑기)/
  ];

  return pointPatterns.some(pattern => pattern.test(text));
}

// 봇 메시지 발송 함수
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
  // (스트리머 설정에 따라 포인트 관련 메시지는 치지직 송출에서 완전 제외)
  const suppressPoint = db.settings.suppressPointMessagesInChat !== false;
  const isPoint = isPointRelatedMessage(text, meta);

  if (db.settings.chzzkClientId && db.settings.chzzkClientSecret && db.settings.chzzkWriteEnabled) {
    if (suppressPoint && isPoint) {
      console.log(`🔇 [치지직 송출 제외] 포인트 관련 메시지는 치지직 채팅창에 전송하지 않습니다: ${text}`);
    } else {
      sendChzzkChatMessage(text).catch((e) => console.warn('[Chzzk Send Error]', e.message));
    }
  }

  return botMsg;
}


// 실시간 채팅 파싱 및 처리
export async function processChatMessage(chat) {
  const { user: username, message, role = 'viewer', source = 'chzzk' } = chat;
  if (!message) return null;

  // 봇 자신이 발송한 답장 메시지는 스스로 다시 처리하지 않도록 완벽 차단 (무한 루프 방지)
  const currentBotName = db.settings.botName || '샤봇';
  const botPrefix = `[${currentBotName}]`;
  if (chat.isBot || message.startsWith(botPrefix) || message.startsWith('[샤봇]') || message.startsWith('[잼쿠봇]') || message.startsWith('[쿨타임]')) {
    return null;
  }

  const user = getOrCreateUser(username, role);

  // 채팅 일반 포인트 적립 (지정 간격마다)
  const now = Date.now();
  const lastPointTime = chatPointCooldowns.get(username) || 0;
  if (now - lastPointTime > (db.settings.chatIntervalSeconds || 60) * 1000) {
    user.points += (db.settings.chatPoints || 5);
    chatPointCooldowns.set(username, now);
    commit();
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

  // 최근 채팅 피드 버퍼에 보관
  if (!db.recentChats) db.recentChats = [];
  db.recentChats.push(chatMsg);
  if (db.recentChats.length > 100) db.recentChats.shift();

  // 대시보드 실시간 채팅창 및 아바타에 브로드캐스트!
  if (ioInstance) {
    ioInstance.emit('chat_message', chatMsg);
    ioInstance.emit('avatar_chat', {
      user: username,
      message,
      role
    });
  }

  // 봇 비활성화 상태면 명령어 처리 생략
  if (!db.status.botEnabled) return null;

  const trimmed = message.trim();

  // 1. 키워드 감지 커스텀 반응 (문장 속에 단어가 포함되거나 단어로 시작 시 - '!' 접두사 없이도 반응)
  // 예: "서하, 오랜만이에요" -> '서하' 포함 시 즉시 감지
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

  // 접두사('!')로 시작하지 않으면 이후 일반 명령어 검사 생략
  const prefix = db.settings.prefix || '!';
  if (!trimmed.startsWith(prefix)) return null;

  // 명령어 및 파라미터 분리
  const args = trimmed.slice(prefix.length).trim().split(/\s+/);
  const cmdName = args[0];
  const param = args.slice(1).join(' ');
  const target = args[1] ? args[1].replace(/^@/, '') : username;

  // 2. 기본 내장 명령어 검사
  const defaultHandled = await handleDefaultCommand(cmdName, param, target, user, role);
  if (defaultHandled) return defaultHandled;

  // 3. 일반 커스텀 명령어 검사 (exact 접두사 매칭)
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
  // 1. 유저당 1회 한정 실행 체크 (oncePerUser 설정 명령어)
  const onceKey = `${cmd.id}_${user.nickname.toLowerCase()}`;
  const isOnce = Boolean(cmd.oncePerUser);
  if (isOnce && usedOncePerUser.has(onceKey)) {
    // 이미 방송 중 1회 인사/실행 완료된 유저 -> 조용히 무시 (도배 방지)
    return null;
  }

  // 2. 권한 체크
  const roleHierarchy = { viewer: 1, follower: 2, sub: 3, manager: 4, streamer: 5 };
  const requiredLevel = roleHierarchy[cmd.permission] || 1;
  const userLevel = roleHierarchy[role] || 1;

  if (userLevel < requiredLevel) {
    // 권한이 없으면 조용히 무시 (채팅창 오염 방지)
    return null;
  }

  // 3. 쿨타임 체크 (쿨타임 중에는 채팅창 도배 방지를 위해 조용히 무시!)
  const cdKey = `${cmd.id}_${user.nickname}`;
  const now = Date.now();
  const lastUsed = cooldowns.get(cdKey) || 0;
  const cdMs = (cmd.cooldown || 0) * 1000;

  if (now - lastUsed < cdMs) {
    // 쿨타임 중에는 안내 메시지를 띄우지 않고 완전히 무시
    return null;
  }

  // 4. 포인트 소모 체크
  if (cmd.cost > 0) {
    if (user.points < cmd.cost) {
      return sendBotMessage(`[포인트 부족] ${cmd.name} 명령어를 쓰려면 ${cmd.cost}P가 필요해요 (보유: ${user.points}P).`);
    }
    user.points -= cmd.cost;
  }

  // 쿨타임, 1회 기록, 카운트 갱신
  cooldowns.set(cdKey, now);
  if (isOnce) {
    usedOncePerUser.add(onceKey);
  }
  cmd.count = (cmd.count || 0) + 1;
  commit();

  // 변수 치환
  let responseText = cmd.response;
  responseText = responseText.replace(/{user}/g, user.nickname);
  responseText = responseText.replace(/{target}/g, target);
  responseText = responseText.replace(/{bot}/g, db.settings.botName || '샤봇');
  responseText = responseText.replace(/{streamer}/g, db.settings.streamerName || db.status.channelName || '스트리머');
  responseText = responseText.replace(/{fandom}/g, db.settings.fandomName || '시청자');
  responseText = responseText.replace(/{points}/g, user.points);
  responseText = responseText.replace(/{uptime}/g, getUptimeString());
  responseText = responseText.replace(/{title}/g, db.status.title);
  responseText = responseText.replace(/{category}/g, db.status.category);
  responseText = responseText.replace(/{count}/g, cmd.count);
  responseText = responseText.replace(/{time}/g, new Date().toLocaleTimeString('ko-KR'));

  // {random:min-max} 난수 치환
  responseText = responseText.replace(/{random:(\d+)-(\d+)}/g, (match, min, max) => {
    const minN = parseInt(min);
    const maxN = parseInt(max);
    return Math.floor(Math.random() * (maxN - minN + 1)) + minN;
  });

  return sendBotMessage(responseText);
}

// 기본 명령어 처리
async function handleDefaultCommand(cmdName, param, target, user, role) {
  const dCmd = db.defaultCommands;

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

  // 4. !출첵 / !출석
  if (dCmd.attend?.enabled && (cmdName === '출첵' || cmdName === '출석' || cmdName === 'check')) {
    const today = new Date().toISOString().split('T')[0];
    if (user.lastAttend === today) {
      return sendBotMessage(`이미 오늘 출석체크를 완료하셨어요! (현재 ${user.attendStreak}일 연속 출석 중)`);
    }

    // 연속 출석 검사
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (user.lastAttend === yesterday) {
      user.attendStreak += 1;
    } else {
      user.attendStreak = 1;
    }
    user.totalAttends += 1;
    user.lastAttend = today;
    const basePoints = db.settings.attendPoints ?? 100;
    const bonusPoints = (user.attendStreak - 1) * (db.settings.attendStreakBonus ?? 20);
    const earned = basePoints + bonusPoints;
    user.points += earned;
    commit();
    if (ioInstance) ioInstance.emit('points_update', db.users);

    return sendBotMessage(`🎉 [${user.nickname}]님 출석 완료! (+${earned}P 지급, ${user.attendStreak}일 연속 출석! 보유: ${user.points}P)`);
  }

  // 5. !포인트
  if (dCmd.point?.enabled && (cmdName === '포인트' || cmdName === 'point')) {
    return sendBotMessage(`💰 [${user.nickname}]님의 보유 포인트: ${user.points.toLocaleString()}${db.settings.pointName || 'P'} (총 출석: ${user.totalAttends}회)`);
  }

  // 6. !도네 [포인트] [메시지]
  if (dCmd.donate?.enabled && (cmdName === '도네' || cmdName === 'donate')) {
    const parts = param.split(/\s+/);
    const amount = parseInt(parts[0]);
    const message = parts.slice(1).join(' ') || '항상 응원합니다!';

    if (isNaN(amount) || amount <= 0) {
      return sendBotMessage(`사용법: !도네 [포인트] [메시지] (예: !도네 1000 스머님 파이팅!)`);
    }

    if (user.points < amount) {
      return sendBotMessage(`[포인트 부족] 보유 포인트가 부족해요! (보유: ${user.points}P / 요청: ${amount}P)`);
    }

    user.points -= amount;
    user.totalDonation = (user.totalDonation || 0) + amount;
    commit();

    // OBS 오버레이용 도네이션 이벤트 발생
    const donationData = {
      id: 'd-' + Date.now(),
      user: user.nickname,
      amount,
      message,
      role: user.role,
      timestamp: Date.now()
    };

    if (ioInstance) {
      ioInstance.emit('donation_alert', donationData);
    }

    return sendBotMessage(`⚔️ [${user.nickname}]님이 ${amount.toLocaleString()}P를 후원하셨습니다! "${message}"`);
  }

  // 7. !모금 [포인트]
  if (dCmd.fund?.enabled && (cmdName === '모금' || cmdName === 'fund')) {
    const amount = parseInt(param);
    if (isNaN(amount) || amount <= 0) {
      const fund = db.fund;
      const percent = Math.min(100, Math.floor((fund.currentPoints / fund.goalPoints) * 100));
      return sendBotMessage(`📊 현재 모금 목표: [${fund.title}] - ${percent}% 달성 (${fund.currentPoints.toLocaleString()} / ${fund.goalPoints.toLocaleString()}P)`);
    }

    if (user.points < amount) {
      return sendBotMessage(`[포인트 부족] 모금할 포인트가 부족해요. (보유: ${user.points}P)`);
    }

    user.points -= amount;
    db.fund.currentPoints += amount;
    db.fund.recentDonors.unshift({ user: user.nickname, points: amount, time: Date.now() });
    if (db.fund.recentDonors.length > 5) db.fund.recentDonors.pop();
    commit();

    if (ioInstance) ioInstance.emit('fund_update', db.fund);

    const percent = Math.min(100, Math.floor((db.fund.currentPoints / db.fund.goalPoints) * 100));
    return sendBotMessage(`💖 [${user.nickname}]님이 모금함에 ${amount.toLocaleString()}P를 기부하셨습니다! (진행률: ${percent}%)`);
  }

  // 8. !투표 [선택지번호 1 or 2] [포인트]
  if (dCmd.vote?.enabled && (cmdName === '투표' || cmdName === 'vote')) {
    const parts = param.split(/\s+/);
    const optionIdx = parseInt(parts[0]) - 1;
    const amount = parseInt(parts[1]);

    if (!db.prediction || db.prediction.status !== 'active') {
      return sendBotMessage(`현재 진행 중인 포인트 투표/예측이 없습니다.`);
    }

    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= db.prediction.options.length || isNaN(amount) || amount <= 0) {
      const optList = db.prediction.options.map((o, i) => `${i + 1}번: ${o.title}`).join(' | ');
      return sendBotMessage(`사용법: !투표 [번호] [포인트] (주제: ${db.prediction.title} / 선택지: ${optList})`);
    }

    if (user.points < amount) {
      return sendBotMessage(`[포인트 부족] 투표에 배팅할 포인트가 부족합니다. (보유: ${user.points}P)`);
    }

    user.points -= amount;
    const opt = db.prediction.options[optionIdx];
    opt.points += amount;
    opt.votes += 1;
    commit();

    if (ioInstance) ioInstance.emit('prediction_update', db.prediction);
    return sendBotMessage(`🗳️ [${user.nickname}]님이 [${opt.title}]에 ${amount.toLocaleString()}P를 걸었습니다!`);
  }

  // 9. !sr [노래제목 또는 유튜브링크]
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

    // 유튜브 검색을 통해 실제 Video ID 및 곡명 조회
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
      return sendBotMessage(`🎶 [${user.nickname}]님의 신청곡 [${title}] 재생을 시작합니다! 🎵`);
    } else {
      db.songRequests.queue.push(newSong);
      commit();
      if (ioInstance) ioInstance.emit('sr_update', db.songRequests);
      return sendBotMessage(`🎶 [${user.nickname}]님의 신청곡 [${title}]이(가) 대기열 ${db.songRequests.queue.length}번째로 등록되었습니다!`);
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
    return sendBotMessage(`📝 [${user.nickname}]님의 신청이 등록되었습니다: "${param}"`);
  }

  // 11. !주사위
  if (dCmd.dice?.enabled && (cmdName === '주사위' || cmdName === 'dice')) {
    const rolled = Math.floor(Math.random() * 100) + 1;
    return sendBotMessage(`🎲 [${user.nickname}]님이 주사위를 굴려 [ ${rolled} ]이(가) 나왔습니다! (1~100)`);
  }

  // 12. !낚시
  if (dCmd.fishing?.enabled && (cmdName === '낚시' || cmdName === 'fish')) {
    const cost = 20;
    if (user.points < cost) {
      return sendBotMessage(`[포인트 부족] 낚시 미끼를 사려면 ${cost}P가 필요해요 (보유: ${user.points}P).`);
    }
    user.points -= cost;

    const outcomes = [
      { name: '낡은 장화', points: 5, msg: '낡은 장화를 낚았습니다... 냄새가 납니다 👞 (+5P)' },
      { name: '붕어', points: 30, msg: '펄떡이는 토종 붕어를 낚았습니다! 🐟 (+30P)' },
      { name: '월척 참돔', points: 80, msg: '와 대박! 50cm 월척 참돔을 낚았습니다! 🎣 (+80P)' },
      { name: '전설의 황금 잉어', points: 300, msg: '대애애박!! 번쩍이는 [전설의 황금 잉어]를 낚았습니다!! ✨🐟✨ (+300P)' },
      { name: '바다 쓰레기', points: 0, msg: '미끼만 뜯기고 빈 캔만 건졌습니다 🥫 (0P)' }
    ];

    const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
    user.points += pick.points;
    commit();

    return sendBotMessage(`🎣 [${user.nickname}]님의 낚시 결과: ${pick.msg} (현재: ${user.points}P)`);
  }

  // 13. !가위바위보 [가위/바위/보] [포인트]
  if (dCmd.rps?.enabled && (cmdName === '가위바위보' || cmdName === 'rps')) {
    const parts = param.split(/\s+/);
    const choice = parts[0];
    const bet = parseInt(parts[1]) || 50;

    const valid = ['가위', '바위', '보'];
    if (!valid.includes(choice)) {
      return sendBotMessage(`사용법: !가위바위보 [가위/바위/보] [배팅포인트] (예: !가위바위보 바위 100)`);
    }

    if (user.points < bet) {
      return sendBotMessage(`[포인트 부족] 배팅할 포인트가 부족해요. (보유: ${user.points}P)`);
    }

    const botChoice = valid[Math.floor(Math.random() * 3)];
    let result = '';
    if (choice === botChoice) {
      result = '비겼습니다! 배팅 포인트가 반환됩니다.';
    } else if (
      (choice === '가위' && botChoice === '보') ||
      (choice === '바위' && botChoice === '가위') ||
      (choice === '보' && botChoice === '바위')
    ) {
      const winPoints = bet * 2;
      user.points += bet; // 원금 + 1배
      result = `축하합니다, 이겼습니다! 🎉 +${winPoints}P 획득!`;
    } else {
      user.points -= bet;
      result = `아쉽지만 봇에게 졌습니다 😢 (-${bet}P)`;
    }
    commit();

    return sendBotMessage(`✌️✊🖐️ [${user.nickname}]: ${choice} vs [${db.settings.botName || '샤봇'}]: ${botChoice} ➡️ ${result} (현재: ${user.points}P)`);
  }

  // 14. !점프 (시청자가 채팅칠 때마다 자동으로 점프하므로 봇 채팅 답장은 생략하고 모션만 실행)
  if (dCmd.jump?.enabled && (cmdName === '점프' || cmdName === 'jump')) {
    if (ioInstance) {
      ioInstance.emit('avatar_action', { user: user.nickname, action: 'jump' });
    }
    return null;
  }

  // 15. !룰렛 (포인트 룰렛 돌리기)
  if (cmdName === '룰렛' || cmdName === 'roulette') {
    const cost = db.roulette?.cost || 500;
    if (user.points < cost) {
      return sendBotMessage(`[포인트 부족] 룰렛을 돌리려면 ${cost}P가 필요해요 (보유: ${user.points}P).`);
    }
    const items = db.roulette?.items || [];
    if (items.length === 0) {
      return sendBotMessage(`현재 설정된 룰렛 항목이 없습니다.`);
    }

    user.points -= cost;
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

    return sendBotMessage(`🎰 [${user.nickname}]님이 ${cost}P로 룰렛을 돌려 [ ${selected.name} ]에 당첨되셨습니다! (남은 포인트: ${user.points}P)`);
  }

  // 16. !뽑기 [번호] (추억의 문방구 종이 뽑기)
  if (cmdName === '뽑기' || cmdName === '문방구') {
    const cost = db.numpick?.cost || 300;
    const total = db.numpick?.totalNumbers || 100;
    const num = parseInt(param, 10);

    if (!param || isNaN(num) || num < 1 || num > total) {
      return sendBotMessage(`사용법: !뽑기 [1~${total} 번호] (1회 ${cost}P)`);
    }

    if (user.points < cost) {
      return sendBotMessage(`[포인트 부족] 문방구 뽑기를 하려면 ${cost}P가 필요해요 (보유: ${user.points}P).`);
    }

    if (!db.numpick.picked) db.numpick.picked = {};
    if (db.numpick.picked[num]) {
      const prev = db.numpick.picked[num];
      return sendBotMessage(`[이미 뽑힌 번호] #${num}번은 이미 [${prev.user}]님이 뽑으셨어요! (결과: ${prev.prize})`);
    }

    user.points -= cost;

    let prizeList = db.numpick.prizes;
    if (!prizeList || prizeList.length === 0) {
      prizeList = [
        { id: 'p-1', rank: '1등', name: 'BBQ 황금올리브 치킨', chance: 2 },
        { id: 'p-2', rank: '2등', name: '싸이버거 세트', chance: 6 },
        { id: 'p-3', rank: '3등', name: '스타벅스 아메리카노', chance: 15 },
        { id: 'p-4', rank: '4등', name: '바나나우유', chance: 25 },
        { id: 'p-5', rank: '5등', name: '새콤달콤', chance: 30 },
        { id: 'p-6', rank: '꽝', name: '꽝 (다음 기회에)', chance: 22 }
      ];
    }

    const totalPrizeChance = prizeList.reduce((acc, p) => acc + (Number(p.chance) || 10), 0) || 100;
    const rand = Math.random() * totalPrizeChance;
    let acc = 0;
    let selectedPrize = prizeList[prizeList.length - 1];
    for (const p of prizeList) {
      acc += (Number(p.chance) || 10);
      if (rand <= acc) {
        selectedPrize = p;
        break;
      }
    }

    const rankPrefix = selectedPrize.rank && selectedPrize.rank !== '꽝' ? `[${selectedPrize.rank}] ` : '';
    const prizeText = `${rankPrefix}${selectedPrize.name}`;

    db.numpick.picked[num] = {
      user: user.nickname,
      prize: prizeText,
      time: Date.now()
    };
    commit();

    if (ioInstance) {
      ioInstance.emit('numpick_update', db.numpick);
      ioInstance.emit('points_update', db.users);
    }

    return sendBotMessage(`🎟️ [${user.nickname}]님이 #${num}번 뽑기 결과: 🎉 ${prizeText} 당첨! (-${cost}P, 보유: ${user.points}P)`);
  }

  return null;
}

// 자동 메시지 스케줄러 (매 1분마다 주기 체크)
export function startAutoMessageScheduler() {
  setInterval(() => {
    if (!db.status.botEnabled) return;
    const now = Date.now();

    db.autoMessages.forEach(msg => {
      if (!msg.enabled) return;

      const intervalMs = (msg.intervalMin || 10) * 60 * 1000;
      if (now - (msg.lastSent || 0) >= intervalMs) {
        // 카테고리 필터링
        if (msg.categoryFilter === 'include' && msg.categoryTarget) {
          if (!db.status.category.toLowerCase().includes(msg.categoryTarget.toLowerCase())) return;
        } else if (msg.categoryFilter === 'exclude' && msg.categoryTarget) {
          if (db.status.category.toLowerCase().includes(msg.categoryTarget.toLowerCase())) return;
        }

        msg.lastSent = now;
        commit();
        sendBotMessage(`📢 [정기 공지] ${msg.text}`);
      }
    });
  }, 30000); // 30초마다 체크
}
