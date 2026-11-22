import WebSocket from 'ws';
import axios from 'axios';
import { db, commit } from './db.js';
import { processChatMessage, processCheeseDonation, processSubscriptionEvent } from './botEngine.js';

let wsClient = null;
let officialSessionWs = null;
let officialPingInterval = null;
let pingInterval = null;
let simulatorInterval = null;
let livePollingInterval = null;
let isConnected = false;
let isConnecting = false;
let activeChatChannelId = '';
let ioInstance = null;

// 비공식 WS + 공식 Open API 세션 이중 수신 시 동일 후원 중복 처리 방지 (10초 윈도우)
const recentDonationKeys = new Map();
function isDuplicateDonation(nickname, payAmount, message) {
  const now = Date.now();
  for (const [k, ts] of recentDonationKeys.entries()) {
    if (now - ts > 10000) recentDonationKeys.delete(k);
  }
  const key = `${String(nickname || '').trim()}|${Number(payAmount) || 0}|${String(message || '').trim()}`;
  const prev = recentDonationKeys.get(key);
  if (prev && now - prev < 10000) return true;
  recentDonationKeys.set(key, now);
  return false;
}

function parseJsonSafe(val, fallback = {}) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

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
  'ㅋㅋㅋㅋㅋㅋ 재밌네요',
  '오늘도 파이팅입니다!',
  '!명령어'
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
export async function syncChzzkChannelStatus(rawChannelId, options = {}) {
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

    // 방송 시작 등으로 chatChannelId가 새로 발급되었거나 소켓이 끊어져 있으면 즉시 재연결
    const latestChatChannelId = liveData?.chatChannelId || '';
    if (!options.skipReconnect && !isConnecting && latestChatChannelId && (latestChatChannelId !== activeChatChannelId || !isConnected)) {
      console.log(`[Chzzk Sync] chatChannelId 변경/미연결 감지 (${activeChatChannelId || '없음'} -> ${latestChatChannelId}) -> 웹소켓 재연결`);
      connectChzzk(channelId);
    }

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

  isConnecting = true;
  stopSimulator();

  await syncChzzkChannelStatus(channelId, { skipReconnect: true });
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
    activeChatChannelId = chatChannelId || '';

    if (!chatChannelId) {
      console.log('[Chzzk] 현재 오프라인 또는 chatChannelId 없음. 15초 후 재확인합니다.');
      isConnecting = false;
      setTimeout(() => {
        if (db.settings.chzzkChannelId === channelId && !isConnected && !isConnecting) {
          connectChzzk(channelId).catch((err) => console.warn('[Chzzk Reconnect Error]:', err.message));
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
    if (wsClient) {
      try { wsClient.close(); } catch {}
    }
    const socket = new WebSocket(wsUrl);
    wsClient = socket;

    socket.on('open', () => {
      if (socket !== wsClient || socket.readyState !== WebSocket.OPEN) {
        try { socket.close(); } catch {}
        return;
      }
      console.log('[Chzzk] 실시간 채팅 및 치즈 후원 웹소켓 연결 완료!');
      isConnected = true;
      isConnecting = false;

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

      socket.send(JSON.stringify(handshakePayload));

      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (socket === wsClient && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ ver: '2', cmd: 10000 }));
        }
      }, 20000);
    });

    socket.on('message', (data) => {
      if (socket !== wsClient) return;
      try {
        const parsed = JSON.parse(data.toString());

        if (parsed.cmd === 10000) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ ver: '2', cmd: 10001 }));
          }
          return;
        }

        if (parsed.cmd === 93101 || parsed.cmd === 93102 || parsed.cmd === 93006 || parsed.cmd === 15101) {
          const rawBdy = parsed.bdy;
          const chats = Array.isArray(rawBdy)
            ? rawBdy
            : (Array.isArray(rawBdy?.messageList) ? rawBdy.messageList : (rawBdy && typeof rawBdy === 'object' ? [rawBdy] : []));

          for (const c of chats) {
            if (!c || typeof c !== 'object') continue;
            const profile = parseJsonSafe(c.profile, {});
            const extras = parseJsonSafe(c.extras, {});

            const isAnonymous = Boolean(extras.isAnonymous) || !profile.nickname;
            const nickname = isAnonymous ? '익명의 후원자' : profile.nickname;
            const userIdHash = profile.userIdHash || c.uid || '';
            const message = c.msg || c.content || '';
            const userRole = profile.userRoleCode === 'streamer' ? 'streamer' :
                             profile.userRoleCode === 'streaming_chat_manager' ? 'manager' :
                             profile.badge ? 'sub' : 'viewer';

            const msgTypeCode = Number(c.msgTypeCode ?? c.messageTypeCode ?? 0);
            const payAmount = Number(
              extras.payAmount ??
              extras.amount ??
              extras.cheese ??
              extras.payMoney ??
              0
            );
            const donationType = String(
              extras.donationType ||
              (msgTypeCode === 10 ? 'CHAT' : '')
            ).toUpperCase();

            const isCheeseDonation =
              payAmount > 0 &&
              (
                parsed.cmd === 93102 ||
                msgTypeCode === 10 ||
                msgTypeCode === 30 ||
                Boolean(extras.donationType) ||
                Boolean(extras.payAmount)
              );

            const isSubscription =
              !isCheeseDonation &&
              (msgTypeCode === 11 || Boolean(extras.month || extras.tierNo || extras.giftTierNo || extras.subscriptionType));

            if (isCheeseDonation) {
              if (!isDuplicateDonation(nickname, payAmount, message)) {
                console.log(`🧀 [치지직 치즈 후원 감지(WS)] ${nickname} (${donationType || 'CHAT'}): ${payAmount}치즈 | "${message}"`);
                processCheeseDonation({
                  user: nickname,
                  isAnonymous,
                  userIdHash,
                  cheeseAmount: payAmount,
                  donationType: donationType || 'CHAT',
                  message,
                  role: userRole,
                  source: 'chzzk'
                });
              }
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
            } else if (message) {
              console.log(`💬 [치지직 수신] ${nickname}: ${message}`);
              Promise.resolve(processChatMessage({
                user: profile.nickname || '익명 시청자',
                userIdHash,
                message,
                role: userRole,
                source: 'chzzk'
              })).catch((err) => console.warn('[Chzzk Chat Process Error]:', err.message));
            }
          }
        }
      } catch (err) {
        console.error('[Chzzk] Error parsing chat frame:', err);
      }
    });

    socket.on('close', () => {
      if (socket !== wsClient) return;
      isConnected = false;
      isConnecting = false;
      clearInterval(pingInterval);
      setTimeout(() => {
        if (db.settings.chzzkChannelId && !isConnected && !isConnecting) {
          connectChzzk(db.settings.chzzkChannelId).catch((err) => console.warn('[Chzzk Reconnect Error]:', err.message));
        }
      }, 3000);
    });

    socket.on('error', (err) => {
      if (socket !== wsClient) return;
      isConnecting = false;
      console.error('[Chzzk] WebSocket error:', err.message);
    });

  } catch (error) {
    isConnecting = false;
    console.error('[Chzzk] Connection failed:', error.message);
  }

  // 공식 Open API 토큰이 연동되어 있으면 공식 Donation Session도 함께 연결 (이중 수신 보장)
  connectOfficialChzzkSession().catch((err) => {
    console.warn('[Chzzk Official Session] 연결 시도 건너뜀:', err.message);
  });
}

// 치지직 공식 Open API 실시간 후원(DONATION) 세션 연결 (Engine.IO v3 + Socket.IO v2 over WebSocket)
async function connectOfficialChzzkSession() {
  const { chzzkAccessToken, chzzkRefreshToken, chzzkClientId, chzzkClientSecret } = db.settings;
  if (!chzzkAccessToken) return;

  if (officialSessionWs) {
    try { officialSessionWs.close(); } catch {}
    officialSessionWs = null;
  }
  if (officialPingInterval) {
    clearInterval(officialPingInterval);
    officialPingInterval = null;
  }

  const requestSessionUrl = async (token) => {
    const res = await axios.get('https://openapi.chzzk.naver.com/open/v1/sessions/auth', {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 5000
    });
    return res.data?.content?.url || '';
  };

  let activeToken = chzzkAccessToken;
  let sessionUrl = '';
  try {
    sessionUrl = await requestSessionUrl(activeToken);
  } catch (err) {
    if ((err.response?.status === 401 || err.response?.status === 403) && chzzkRefreshToken && chzzkClientId && chzzkClientSecret) {
      const refreshRes = await axios.post('https://openapi.chzzk.naver.com/auth/v1/token', {
        grantType: 'refresh_token',
        refreshToken: chzzkRefreshToken,
        clientId: chzzkClientId,
        clientSecret: chzzkClientSecret
      });
      const newToken = refreshRes.data?.content?.accessToken;
      if (newToken) {
        activeToken = newToken;
        db.settings.chzzkAccessToken = newToken;
        db.settings.chzzkRefreshToken = refreshRes.data?.content?.refreshToken || chzzkRefreshToken;
        commit();
        sessionUrl = await requestSessionUrl(activeToken);
      }
    } else {
      throw err;
    }
  }

  if (!sessionUrl) return;

  const parsedUrl = new URL(sessionUrl);
  const wsScheme = parsedUrl.protocol === 'http:' ? 'ws:' : 'wss:';
  parsedUrl.searchParams.set('EIO', '3');
  parsedUrl.searchParams.set('transport', 'websocket');
  const wsTarget = `${wsScheme}//${parsedUrl.host}/socket.io/${parsedUrl.search}`;

  officialSessionWs = new WebSocket(wsTarget);

  officialSessionWs.on('open', () => {
    console.log('[Chzzk Official Session] 공식 실시간 후원 세션 소켓 연결 완료!');
  });

  officialSessionWs.on('message', async (raw) => {
    const text = raw.toString();

    // Engine.IO open packet (0{...})
    if (text.startsWith('0')) {
      const handshake = parseJsonSafe(text.slice(1), {});
      const intervalMs = Number(handshake.pingInterval) || 25000;
      if (officialPingInterval) clearInterval(officialPingInterval);
      officialPingInterval = setInterval(() => {
        if (officialSessionWs && officialSessionWs.readyState === WebSocket.OPEN) {
          officialSessionWs.send('2');
        }
      }, intervalMs);
      return;
    }

    // Engine.IO ping from server
    if (text === '2') {
      if (officialSessionWs && officialSessionWs.readyState === WebSocket.OPEN) {
        officialSessionWs.send('3');
      }
      return;
    }

    // Socket.IO EVENT packet (42["EVENT_NAME", payload])
    if (text.startsWith('42')) {
      const tuple = parseJsonSafe(text.slice(2), null);
      if (!Array.isArray(tuple) || tuple.length < 2) return;
      const eventName = tuple[0];
      const payload = parseJsonSafe(tuple[1], {});

      if (eventName === 'SYSTEM' && payload?.type === 'connected' && payload?.data?.sessionKey) {
        const sessionKey = payload.data.sessionKey;
        try {
          await axios.post(
            `https://openapi.chzzk.naver.com/open/v1/sessions/events/subscribe/donation?sessionKey=${encodeURIComponent(sessionKey)}`,
            { sessionKey },
            {
              headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            }
          );
          console.log('[Chzzk Official Session] 🧀 공식 DONATION 이벤트 구독 완료!');
        } catch (subErr) {
          console.warn('[Chzzk Official Session] DONATION 구독 실패:', subErr.response?.data?.message || subErr.message);
        }
        return;
      }

      if (eventName === 'DONATION') {
        const nickname = payload.donatorNickname || payload.nickname || '익명의 후원자';
        const isAnonymous = !payload.donatorNickname || nickname === '익명의 후원자' || Boolean(payload.isAnonymous);
        const payAmount = Number(payload.payAmount || payload.amount || 0);
        const donationType = String(payload.donationType || 'CHAT').toUpperCase();
        const message = payload.donationText || payload.message || '';

        if (payAmount > 0 && !isDuplicateDonation(nickname, payAmount, message)) {
          console.log(`🧀 [치지직 공식 API 후원 감지] ${nickname} (${donationType}): ${payAmount}치즈 | "${message}"`);
          processCheeseDonation({
            user: nickname,
            isAnonymous,
            userIdHash: payload.donatorChannelId || '',
            cheeseAmount: payAmount,
            donationType,
            message,
            role: 'viewer',
            source: 'chzzk-official'
          });
        }
      }
    }
  });

  officialSessionWs.on('close', () => {
    if (officialPingInterval) {
      clearInterval(officialPingInterval);
      officialPingInterval = null;
    }
    officialSessionWs = null;
    setTimeout(() => {
      if (db.settings.chzzkChannelId && db.settings.chzzkAccessToken && !officialSessionWs) {
        connectOfficialChzzkSession().catch((err) => console.warn('[Chzzk Official Reconnect Error]:', err.message));
      }
    }, 5000);
  });

  officialSessionWs.on('error', (err) => {
    console.warn('[Chzzk Official Session] 소켓 오류:', err.message);
  });
}

export function disconnectChzzk() {
  if (wsClient) {
    try { wsClient.close(); } catch {}
    wsClient = null;
  }
  if (officialSessionWs) {
    try { officialSessionWs.close(); } catch {}
    officialSessionWs = null;
  }
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (officialPingInterval) {
    clearInterval(officialPingInterval);
    officialPingInterval = null;
  }
  if (livePollingInterval) {
    clearInterval(livePollingInterval);
    livePollingInterval = null;
  }
  isConnected = false;
  isConnecting = false;
  activeChatChannelId = '';
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

    Promise.resolve(processChatMessage({
      user: viewer.name,
      message,
      role: viewer.role,
      source: 'simulator'
    })).catch((err) => console.warn('[Simulator Chat Error]:', err.message));
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
  markSentByBot(finalMessage.slice(0, 100));
  markSentByBot(message);
  markSentByBot(message.slice(0, 100));

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

function parseKstDateTimeMs(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return null;
  const normalized = dateTimeStr.trim().replace(' ', 'T');
  const ms = Date.parse(`${normalized}+09:00`);
  return Number.isFinite(ms) ? ms : null;
}

function formatKstParts(ms) {
  const kst = new Date(ms + 9 * 3600 * 1000);
  const iso = kst.toISOString();
  return {
    dateStr: iso.slice(0, 10),
    hhmm: iso.slice(11, 16)
  };
}

export async function fetchChzzkBroadcastHistory(channelId) {
  const broadcasts = [];
  const seenKeys = new Set();

  const targetChannelId = extractChzzkChannelId(channelId || db.status?.channelId || db.settings?.chzzkChannelId || '');
  if (!targetChannelId) return broadcasts;

  if (db.status?.isLive && db.status?.openDate && db.status?.title) {
    const startMs = parseKstDateTimeMs(db.status.openDate);
    const dStr = startMs ? formatKstParts(startMs).dateStr : db.status.openDate.split(' ')[0];
    const timeStr = startMs ? formatKstParts(startMs).hhmm : (db.status.openDate.split(' ')[1]?.slice(0, 5) || '20:00');
    broadcasts.push({
      dateStr: dStr,
      startTimeMs: startMs || Date.now(),
      time: `${timeStr} ~ 진행 중`,
      title: db.status.title.trim(),
      category: db.status.category || 'talk'
    });
    seenKeys.add(`${dStr}|${timeStr}`);
  }

  try {
    const res = await axios.get(`https://api.chzzk.naver.com/service/v1/channels/${targetChannelId}/videos?size=50`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 5000
    });
    const videoList = res.data?.content?.data || [];
    for (const v of videoList) {
      const endMs = parseKstDateTimeMs(v.publishDate);
      const durationSec = Math.max(0, Number(v.duration) || 0);
      const explicitOpenMs = parseKstDateTimeMs(v.liveOpenDate);
      const startMs = explicitOpenMs || (endMs && durationSec > 0 ? endMs - durationSec * 1000 : endMs);

      if (!startMs) continue;

      const startParts = formatKstParts(startMs);
      const endParts = endMs ? formatKstParts(endMs) : null;
      const matchDate = startParts.dateStr;
      const timeRange = endParts && durationSec > 0
        ? `${startParts.hhmm} - ${endParts.hhmm}`
        : startParts.hhmm;

      const dedupeKey = `${matchDate}|${startParts.hhmm}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      let cleanTitle = v.videoTitle
        ?.replace(/^\d{4}[.\-]\d{1,2}[.\-]\d{1,2}\.?\s*/, '')
        ?.replace(/\.mp4$/i, '')
        ?.replace(/_\d+부$/i, '')
        ?.trim();
      if (!cleanTitle) cleanTitle = v.videoTitle || '방송 기록';

      broadcasts.push({
        dateStr: matchDate,
        startTimeMs: startMs,
        time: timeRange,
        title: cleanTitle,
        category: v.videoCategoryValue || v.videoCategory || 'talk'
      });
    }
  } catch (err) {
    console.warn('[Chzzk Video History] Failed to fetch videos:', err.message);
  }

  broadcasts.sort((a, b) => (a.startTimeMs || 0) - (b.startTimeMs || 0));
  return broadcasts;
}
