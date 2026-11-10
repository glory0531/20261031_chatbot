import WebSocket from 'ws';
import axios from 'axios';
import { db, commit } from './db.js';
import { processChatMessage, processCheeseDonation, processSubscriptionEvent } from './botEngine.js';

let wsClient = null;
let pingInterval = null;
let simulatorInterval = null;
let livePollingInterval = null;
let isConnected = false;
let ioInstance = null;

// 가상 시뮬레이터용 봇 시청자 및 테스트 채팅 목록
export const SIM_VIEWERS = [
  { name: '테스트시청자1', role: 'viewer' },
  { name: '테스트시청자2', role: 'viewer' },
  { name: '열혈구독자', role: 'sub' },
  { name: '단골팬', role: 'viewer' },
  { name: '방송매니저', role: 'manager' }
];

export const SIM_CHAT_MESSAGES = [
  '안녕하세요! 오늘 방송도 기대되네요 😊',
  '!출첵',
  '!포인트',
  '!주사위',
  'ㅋㅋㅋㅋㅋㅋ 재밌네요',
  '오늘도 파이팅입니다!',
  '!낚시',
  '!가위바위보 가위 50',
  '!명령어',
  '!점프'
];

export function setChzzkSocketIO(io) {
  ioInstance = io;
}

export function extractChzzkChannelId(input = '') {
  const trimmed = String(input || '').trim();
  const match = trimmed.match(/([a-f0-9]{32})/i);
  return match ? match[1].toLowerCase() : trimmed;
}

export async function lookupChzzkChannel(rawInput) {
  const channelId = extractChzzkChannelId(rawInput);
  if (!channelId || channelId.length < 16) {
    throw new Error('유효한 치지직 채널 주소 또는 32자리 UID를 입력해주세요.');
  }
  const chRes = await axios.get(`https://api.chzzk.naver.com/service/v1/channels/${channelId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 4500
  });
  const content = chRes.data?.content;
  if (!content || !content.channelId) {
    throw new Error('해당 UID의 치지직 채널을 찾을 수 없습니다.');
  }
  return {
    channelId: content.channelId,
    channelName: content.channelName || '스트리머',
    channelImageUrl: content.channelImageUrl || '',
    followerCount: content.followerCount ?? 0,
    openLive: Boolean(content.openLive)
  };
}

// 치지직 실제 방송 실황 및 채널 정보 실시간 동기화
export async function syncChzzkChannelStatus(rawChannelId) {
  const channelId = extractChzzkChannelId(rawChannelId);
  if (!channelId) return db.status;

  try {
    let channelData = null;
    try {
      const chRes = await axios.get(`https://api.chzzk.naver.com/service/v1/channels/${channelId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 4000
      });
      channelData = chRes.data?.content;
    } catch {}

    const statusRes = await axios.get(`https://api.chzzk.naver.com/polling/v2/channels/${channelId}/live-status`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 4000
    });
    const liveData = statusRes.data?.content;

    const isLive = liveData?.status === 'OPEN';
    const channelName = channelData?.channelName || db.settings.streamerName || db.status.channelName || '스트리머';
    const channelImageUrl = channelData?.channelImageUrl || db.status.channelImageUrl || '';
    const followerCount = channelData?.followerCount ?? db.status.followerCount ?? 0;
    const title = liveData?.liveTitle || (channelName + '의 방송');
    const category = liveData?.liveCategoryValue || liveData?.liveCategory || 'talk';
    const viewers = isLive ? (liveData?.concurrentUserCount || 0) : 0;

    let startTime = db.status.startTime || Date.now();
    let uptimeSeconds = 0;
    if (isLive && liveData?.openDate) {
      startTime = new Date(liveData.openDate.replace(' ', 'T') + '+09:00').getTime();
      uptimeSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    }

    db.status = {
      ...db.status,
      channelId,
      channelName,
      channelImageUrl,
      followerCount,
      title,
      category,
      viewers,
      isLive,
      openDate: liveData?.openDate || '',
      startTime,
      uptimeSeconds
    };
    commit();

    if (ioInstance) {
      ioInstance.emit('status_update', db.status);
    }

    console.log(`[Chzzk Sync] 실황 반영: [${channelName}] ${isLive ? '🔴 방송 중' : '🌙 방송 준비 중'} | 시청자: ${viewers}명 | 방제: "${title}"`);
    return db.status;
  } catch (err) {
    console.warn('[Chzzk Sync Warning]', err.message);
    return db.status;
  }
}

export function startLiveStatusPolling(channelId) {
  if (livePollingInterval) clearInterval(livePollingInterval);
  livePollingInterval = setInterval(() => {
    syncChzzkChannelStatus(channelId).catch(() => {});
  }, 15000);
}

export async function connectChzzk(rawChannelId) {
  disconnectChzzk();
  const channelId = extractChzzkChannelId(rawChannelId);

  if (!channelId) {
    console.log('[Chzzk] 채널 UID 미설정 상태입니다. (대기 모드)');
    if (db.settings.autoSimulatorEnabled) {
      startSimulator();
    }
    return;
  }

  stopSimulator();

  await syncChzzkChannelStatus(channelId);
  startLiveStatusPolling(channelId);

  try {
    console.log(`[Chzzk] Fetching chat access for channel: ${channelId}`);
    const statusRes = await axios.get(`https://api.chzzk.naver.com/polling/v2/channels/${channelId}/live-status`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    });

    const liveData = statusRes.data?.content;
    const chatChannelId = liveData?.chatChannelId;

    if (!chatChannelId) {
      console.log('[Chzzk] 현재 오프라인 또는 chatChannelId 없음. 15초 후 재확인합니다.');
      setTimeout(() => {
        if (db.settings.chzzkChannelId === channelId) {
          connectChzzk(channelId);
        }
      }, 15000);
      return;
    }

    const tokenRes = await axios.get(`https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId=${chatChannelId}&chatType=STREAMING`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 5000
    });

    const accessToken = tokenRes.data?.content?.accessToken;
    const wsUrl = 'wss://kr-ss1.chat.naver.com/chat';
    wsClient = new WebSocket(wsUrl);

    wsClient.on('open', () => {
      console.log('[Chzzk] 실시간 채팅 및 치즈 후원 웹소켓 연결 완료!');
      isConnected = true;

      const handshakePayload = {
        ver: '2',
        cmd: 100,
        svcid: 'game',
        cid: chatChannelId,
        bdy: {
          accTkn: accessToken,
          auth: 'READ',
          devType: 2001,
          uid: null
        },
        tid: 1
      };

      wsClient.send(JSON.stringify(handshakePayload));

      pingInterval = setInterval(() => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(JSON.stringify({ ver: '2', cmd: 10000 }));
        }
      }, 20000);
    });

    wsClient.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());

        if (parsed.cmd === 10000) {
          wsClient.send(JSON.stringify({ ver: '2', cmd: 10001 }));
          return;
        }

        if (parsed.cmd === 93101 || parsed.cmd === 93102) {
          const chats = parsed.bdy || [];
          for (const c of chats) {
            let profile = {};
            try {
              profile = JSON.parse(c.profile || '{}');
            } catch {}

            let extras = {};
            try {
              extras = JSON.parse(c.extras || '{}');
            } catch {}

            const isAnonymous = Boolean(extras.isAnonymous) || !profile.nickname;
            const nickname = isAnonymous ? '익명의 후원자' : profile.nickname;
            const userIdHash = profile.userIdHash || c.uid || '';
            const message = c.msg || '';
            const userRole = profile.userRoleCode === 'streamer' ? 'streamer' :
                             profile.userRoleCode === 'streaming_chat_manager' ? 'manager' :
                             profile.badge ? 'sub' : 'viewer';

            const payAmount = Number(extras.payAmount || (c.msgTypeCode === 10 ? extras.cheese : 0) || 0);
            const donationType = String(extras.donationType || (c.msgTypeCode === 10 ? 'CHAT' : '')).toUpperCase();
            const isCheeseDonation = (parsed.cmd === 93102 || c.msgTypeCode === 10) && payAmount > 0;
            const isSubscription = c.msgTypeCode === 11 || Boolean(extras.month || extras.tierNo || extras.giftTierNo || extras.subscriptionType);

            if (isCheeseDonation) {
              console.log(`🧀 [치지직 치즈 후원 감지] ${nickname} (${donationType || 'CHAT'}): ${payAmount}치즈 | "${message}"`);
              processCheeseDonation({
                user: nickname,
                isAnonymous,
                userIdHash,
                cheeseAmount: payAmount,
                donationType,
                message,
                role: userRole,
                source: 'chzzk'
              });
            } else if (isSubscription) {
              const isGift = Boolean(extras.giftTierNo || extras.quantity > 1 || extras.giftCount || String(extras.subscriptionType || '').includes('GIFT'));
              const tier = Number(extras.giftTierNo || extras.tierNo || 1);
              const giftCount = Number(extras.quantity || extras.giftCount || 1);
              console.log(`💎 [치지직 구독 감지] ${nickname} (${isGift ? `구독선물 ${giftCount}개` : '일반구독'}, ${tier}티어)`);
              processSubscriptionEvent({
                user: nickname,
                isAnonymous,
                tier,
                isGift,
                giftCount,
                role: 'sub'
              });
            } else {
              console.log(`💬 [치지직 수신] ${nickname}: ${message}`);
              processChatMessage({
                user: profile.nickname || '익명 시청자',
                userIdHash,
                message,
                role: userRole,
                source: 'chzzk'
              });
            }
          }
        }
      } catch (err) {
        console.error('[Chzzk] Error parsing chat frame:', err);
      }
    });

    wsClient.on('close', () => {
      isConnected = false;
      clearInterval(pingInterval);
      setTimeout(() => {
        if (db.settings.chzzkChannelId) {
          connectChzzk(db.settings.chzzkChannelId);
        }
      }, 3000);
    });

    wsClient.on('error', (err) => {
      console.error('[Chzzk] WebSocket error:', err.message);
    });

  } catch (error) {
    console.error('[Chzzk] Connection failed:', error.message);
  }
}

export function disconnectChzzk() {
  if (wsClient) {
    try { wsClient.close(); } catch {}
    wsClient = null;
  }
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (livePollingInterval) {
    clearInterval(livePollingInterval);
    livePollingInterval = null;
  }
  isConnected = false;
}

export function isSimulatorRunning() {
  return Boolean(simulatorInterval);
}

export function startSimulator() {
  if (simulatorInterval) return;

  console.log('[Simulator] 가상 시청자 자동 채팅 시뮬레이터 가동 중 (15초 주기)');
  simulatorInterval = setInterval(() => {
    if (!db.status.botEnabled) return;
    const viewer = SIM_VIEWERS[Math.floor(Math.random() * SIM_VIEWERS.length)];
    const message = SIM_CHAT_MESSAGES[Math.floor(Math.random() * SIM_CHAT_MESSAGES.length)];

    processChatMessage({
      user: viewer.name,
      message,
      role: viewer.role,
      source: 'simulator'
    });
  }, 15000);
}

export function stopSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
}

export function triggerSimulatedChat(username, message, role = 'viewer') {
  return processChatMessage({
    user: username || '테스트시청자',
    message: message || '반가워요!',
    role,
    source: 'simulator'
  });
}

export function triggerSimulatedCheese(username, cheeseAmount = 1000, message = '치즈 후원 테스트입니다! 🧀', donationType = 'CHAT') {
  return processCheeseDonation({
    user: username || '테스트시청자',
    isAnonymous: false,
    cheeseAmount: Number(cheeseAmount) || 1000,
    donationType,
    message,
    role: 'viewer',
    source: 'simulator'
  });
}

// 봇이 최근 발송한 메시지 추적 (웹소켓 에코 수신 시 무한 루프 및 중복 적립 방지)
const recentSentBotMessages = new Map();

export function markSentByBot(message) {
  if (!message) return;
  const now = Date.now();
  recentSentBotMessages.set(message, now);
  for (const [msg, time] of recentSentBotMessages.entries()) {
    if (now - time > 30000) recentSentBotMessages.delete(msg);
  }
}

export function isRecentBotMessage(message) {
  if (!message) return false;
  const now = Date.now();
  const time = recentSentBotMessages.get(message);
  if (time && now - time < 30000) return true;
  return false;
}

export async function sendChzzkChatMessage(message) {
  const { chzzkClientId, chzzkClientSecret, chzzkAccessToken, chzzkRefreshToken, botName } = db.settings;

  if (!chzzkAccessToken && (!chzzkClientId || !chzzkClientSecret)) {
    return { success: false, reason: '치지직 연동 토큰이 필요합니다.' };
  }

  // 봇 이름 송출 시 대괄호 '[]' 제거 및 공백 허용:
  // 봇 이름이 있으면 '봇이름 내용' (예: '| 내용', '샤봇 내용')
  // 봇 이름이 비어있으면(공백) 접두사 없이 '내용' 직접 송출
  const bName = typeof botName === 'string' ? botName.trim() : '';
  const finalMessage = bName ? `${bName} ${message}` : message;

  markSentByBot(finalMessage);
  markSentByBot(message);

  const trySend = async (token) => {
    return axios.post('https://openapi.chzzk.naver.com/open/v1/chats/send', {
      message: finalMessage.slice(0, 100)
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 4000
    });
  };

  try {
    if (chzzkAccessToken) {
      const res = await trySend(chzzkAccessToken);
      return { success: true, data: res.data };
    }
  } catch (err) {
    if ((err.response?.status === 401 || err.response?.status === 403) && chzzkRefreshToken && chzzkClientId && chzzkClientSecret) {
      try {
        const refreshRes = await axios.post('https://openapi.chzzk.naver.com/auth/v1/token', {
          grantType: 'refresh_token',
          refreshToken: chzzkRefreshToken,
          clientId: chzzkClientId,
          clientSecret: chzzkClientSecret
        });
        const newToken = refreshRes.data?.content?.accessToken;
        if (newToken) {
          db.settings.chzzkAccessToken = newToken;
          db.settings.chzzkRefreshToken = refreshRes.data?.content?.refreshToken || chzzkRefreshToken;
          commit();
          const res = await trySend(newToken);
          return { success: true, data: res.data };
        }
      } catch (refreshErr) {
        console.warn('[Chzzk API] 토큰 갱신 실패:', refreshErr.response?.data?.message || refreshErr.message);
      }
    }
    return { success: false, error: err.message };
  }

  return { success: false, reason: '치지직 계정 연동 로그인이 필요합니다.' };
}

export async function fetchChzzkBroadcastHistory(channelId) {
  const broadcasts = [];
  const seenDates = new Set();

  const targetChannelId = extractChzzkChannelId(channelId || db.status?.channelId || db.settings?.chzzkChannelId || '');
  if (!targetChannelId) return broadcasts;

  if (db.status?.openDate && db.status?.title) {
    const dStr = db.status.openDate.split(' ')[0];
    const timeStr = db.status.openDate.split(' ')[1]?.slice(0, 5) || '20:00';
    broadcasts.push({
      dateStr: dStr,
      time: timeStr,
      title: db.status.title.trim(),
      category: db.status.category || 'talk'
    });
    seenDates.add(dStr);
  }

  try {
    const res = await axios.get(`https://api.chzzk.naver.com/service/v1/channels/${targetChannelId}/videos?size=50`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 5000
    });
    const videoList = res.data?.content?.data || [];
    for (const v of videoList) {
      let matchDate = null;
      const titleMatch = v.videoTitle?.match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
      if (titleMatch) {
        matchDate = `${titleMatch[1]}-${String(titleMatch[2]).padStart(2, '0')}-${String(titleMatch[3]).padStart(2, '0')}`;
      } else if (v.publishDate) {
        matchDate = v.publishDate.split(' ')[0];
      }

      if (matchDate && !seenDates.has(matchDate)) {
        seenDates.add(matchDate);
        let cleanTitle = v.videoTitle
          ?.replace(/^\d{4}[.\-]\d{1,2}[.\-]\d{1,2}\.?\s*/, '')
          ?.replace(/\.mp4$/i, '')
          ?.replace(/_\d+부$/i, '')
          ?.trim();
        if (!cleanTitle) cleanTitle = v.videoTitle;

        const timePart = v.publishDate?.split(' ')[1]?.slice(0, 5) || '20:00';

        broadcasts.push({
          dateStr: matchDate,
          time: timePart,
          title: cleanTitle,
          category: v.videoCategoryValue || v.videoCategory || 'talk'
        });
      }
    }
  } catch (err) {
    console.warn('[Chzzk Video History] Failed to fetch videos:', err.message);
  }

  return broadcasts;
}
