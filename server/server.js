import express from 'express';
import http from 'http';
import fs from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  db,
  commit,
  resetToDefaultData,
  exportPointsCSV,
  importPointsCSV,
  createLocalBackup,
  migrateAndMergeData
} from './db.js';
import { setSocketIO, startAutoMessageScheduler, sendBotMessage, processChatMessage } from './botEngine.js';
import {
  connectChzzk,
  startSimulator,
  stopSimulator,
  isSimulatorRunning,
  triggerSimulatedChat,
  triggerSimulatedCheese,
  setChzzkSocketIO,
  syncChzzkChannelStatus,
  fetchChzzkBroadcastHistory,
  lookupChzzkChannel,
  extractChzzkChannelId
} from './chzzkClient.js';
import { searchYouTube } from './youtubeSearch.js';
import { startTunnel, stopTunnel, getTunnelState, setTunnelSocketIO, syncTunnelOnStartup } from './tunnelManager.js';
import {
  getUpdateState,
  checkForUpdate,
  downloadAndStageUpdate,
  spawnLiveUpdateWorkerAndRestart,
  startUpdateChecker,
  dismissJustUpdatedNotice,
  readCurrentVersion
} from './updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = Number(process.env.PORT) || 24700;

function getStreamerDisplayName() {
  return db.status?.channelName || db.settings?.streamerName || '스트리머';
}

export function getSanitizedSettings(settings) {
  if (!settings) return {};
  return {
    ...settings,
    chzzkClientSecret: settings.chzzkClientSecret ? '••••••••' : '',
    chzzkAccessToken: settings.chzzkAccessToken ? '••••••••' : '',
    chzzkRefreshToken: settings.chzzkRefreshToken ? '••••••••' : '',
    chzzkAuthedChannelName: settings.chzzkAuthedChannelName || '',
    hasClientSecret: Boolean(settings.chzzkClientSecret),
    hasAccessToken: Boolean(settings.chzzkAccessToken),
    hasRefreshToken: Boolean(settings.chzzkRefreshToken)
  };
}

export function buildInitialStatePayload() {
  return {
    status: db.status,
    settings: getSanitizedSettings(db.settings),
    commands: db.commands,
    defaultCommands: db.defaultCommands,
    autoMessages: db.autoMessages,
    users: db.users,
    songRequests: db.songRequests,
    generalRequests: db.generalRequests,
    fund: db.fund,
    prediction: db.prediction,
    roulette: db.roulette,
    schedules: db.schedules,
    weeklySchedules: db.weeklySchedules || {},
    activeWeekKey: db.activeWeekKey || '',
    messages: db.recentChats || [],
    tunnel: getTunnelState(),
    update: getUpdateState(),
    simulatorRunning: isSimulatorRunning()
  };
}

export function isExternalRequest(req) {
  if (req.headers['cf-connecting-ip'] || req.headers['cf-ray']) return true;
  const host = (req.headers.host || '').toLowerCase();
  if (host.includes('trycloudflare.com') || host.includes('ngrok') || host.includes('localtunnel.me')) {
    return true;
  }
  return false;
}

export const requireLocalAdmin = (req, res, next) => {
  if (isExternalRequest(req)) {
    return res.status(403).json({
      success: false,
      message: '외부 네트워크에서는 스트리머 관리자 권한이 제한됩니다. 시청자 전용 페이지(/view)를 이용해주세요.'
    });
  }
  next();
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Socket.io 등록
setSocketIO(io);
setChzzkSocketIO(io);
setTunnelSocketIO(io);

io.on('connection', (socket) => {
  socket.emit('initial_state', buildInitialStatePayload());
});

/* ============================
   0. 버전 & 원격 자동 업데이트 API
============================ */
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    version: readCurrentVersion(),
    uptime: process.uptime()
  });
});

app.get('/api/update/status', (req, res) => {
  res.json({ success: true, data: getUpdateState() });
});

app.post('/api/update/check', requireLocalAdmin, async (req, res) => {
  try {
    const state = await checkForUpdate({ timeoutMs: 8000 });
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/update/apply', requireLocalAdmin, async (req, res) => {
  try {
    const meta = await downloadAndStageUpdate({ backupFn: createLocalBackup });
    res.json({
      success: true,
      message: `v${meta.toVersion} 업데이트 파일을 다운로드했습니다. 잠시 후 서버가 재시작됩니다.`,
      data: meta
    });
    spawnLiveUpdateWorkerAndRestart({ server, meta });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/update/dismiss-notice', requireLocalAdmin, (req, res) => {
  dismissJustUpdatedNotice();
  res.json({ success: true });
});

/* ============================
   1. 상태 및 요약
============================ */
app.get('/api/status', (req, res) => {
  res.json({ success: true, data: db.status });
});

app.post('/api/status/toggle', requireLocalAdmin, (req, res) => {
  db.status.botEnabled = !db.status.botEnabled;
  commit();
  io.emit('status_update', db.status);
  const botName = db.settings.botName || '샤봇';
  sendBotMessage(db.status.botEnabled ? `🟢 [${botName}]이(가) 활성화되었습니다.` : `🔴 [${botName}]이(가) 비활성화되었습니다.`);
  res.json({ success: true, data: db.status });
});

app.post('/api/status/update', requireLocalAdmin, (req, res) => {
  const { title, category, channelName } = req.body;
  if (title !== undefined) db.status.title = title;
  if (category !== undefined) db.status.category = category;
  if (channelName !== undefined) db.status.channelName = channelName;
  commit();
  io.emit('status_update', db.status);
  res.json({ success: true, data: db.status });
});

app.post('/api/status/sync', async (req, res) => {
  const channelId = extractChzzkChannelId(req.body?.channelId || db.settings.chzzkChannelId);
  const status = await syncChzzkChannelStatus(channelId);
  res.json({ success: true, data: status });
});

/* ============================
   2. 설정 & 백업 / 복원 / 초기화
============================ */
app.get('/api/settings', (req, res) => {
  res.json({ success: true, data: getSanitizedSettings(db.settings) });
});

app.get('/api/backup', requireLocalAdmin, (req, res) => {
  createLocalBackup('manual_download');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=shabot_backup_${Date.now()}.json`);
  res.send(JSON.stringify(db, null, 2));
});

app.post('/api/restore', requireLocalAdmin, (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ success: false, message: '올바른 백업 데이터 형식이 아닙니다.' });
    }
    createLocalBackup('pre_restore');
    const migrated = migrateAndMergeData(backupData);
    Object.keys(db).forEach(k => delete db[k]);
    Object.assign(db, migrated);
    commit();
    io.emit('initial_state', buildInitialStatePayload());
    res.json({ success: true, message: '데이터가 성공적으로 복원되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/reset', requireLocalAdmin, (req, res) => {
  resetToDefaultData();
  io.emit('initial_state', buildInitialStatePayload());
  res.json({ success: true, message: '기본 설정으로 초기화되었습니다.' });
});

app.get('/api/export/points', requireLocalAdmin, (req, res) => {
  const csv = exportPointsCSV();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=points_${Date.now()}.csv`);
  res.send('\uFEFF' + csv);
});

app.post('/api/import/points', requireLocalAdmin, (req, res) => {
  const { csvText } = req.body;
  const result = importPointsCSV(csvText);
  if (result.success) {
    io.emit('points_update', db.users);
    res.json({ success: true, count: result.count });
  } else {
    res.status(400).json({ success: false, message: 'CSV 형식이 올바르지 않습니다.' });
  }
});

app.post('/api/settings', requireLocalAdmin, (req, res) => {
  const updates = { ...req.body };
  if (updates.chzzkClientSecret === '••••••••' || updates.chzzkClientSecret === undefined) {
    delete updates.chzzkClientSecret;
  }
  if (updates.chzzkAccessToken === '••••••••' || updates.chzzkAccessToken === undefined) {
    delete updates.chzzkAccessToken;
  }
  if (updates.chzzkRefreshToken === '••••••••' || updates.chzzkRefreshToken === undefined) {
    delete updates.chzzkRefreshToken;
  }
  delete updates.hasClientSecret;
  delete updates.hasAccessToken;
  delete updates.hasRefreshToken;

  if (typeof updates.chzzkChannelId === 'string') {
    updates.chzzkChannelId = extractChzzkChannelId(updates.chzzkChannelId);
  }

  // 치지직 Client ID가 변경되었거나 삭제된 경우, 이전 계정의 발송 토큰을 즉시 초기화
  if (updates.chzzkClientId !== undefined && updates.chzzkClientId !== db.settings.chzzkClientId) {
    db.settings.chzzkAccessToken = '';
    db.settings.chzzkRefreshToken = '';
    db.settings.chzzkAuthedChannelName = '';
    console.log('🔄 [치지직 API] Client ID 변경 감지 -> 기존 발송 토큰 초기화 완료');
  }

  db.settings = { ...db.settings, ...updates };

  // 스트리머명이 변경되고 라이브 채널명이 아직 기본값이면 상태 이름도 동기화
  if (updates.streamerName && (!db.status.channelId || db.status.channelName === '스트리머')) {
    db.status.channelName = updates.streamerName;
    io.emit('status_update', db.status);
  }

  commit();
  io.emit('settings_update', getSanitizedSettings(db.settings));
  res.json({ success: true, data: getSanitizedSettings(db.settings) });
});

// 2-1. Cloudflare 시청자 공개 터널 관리 API
app.get('/api/tunnel/status', (req, res) => {
  res.json({ success: true, data: getTunnelState() });
});

app.post('/api/tunnel/start', requireLocalAdmin, async (req, res) => {
  try {
    const state = await startTunnel(req.body || {});
    res.json({ success: true, data: state });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/tunnel/stop', requireLocalAdmin, (req, res) => {
  const state = stopTunnel();
  res.json({ success: true, data: state });
});

/* ============================
   3. 커스텀 명령어 & 기본 명령어
============================ */
app.get('/api/commands', (req, res) => {
  res.json({ success: true, data: db.commands });
});

app.post('/api/commands', requireLocalAdmin, (req, res) => {
  const { name, response, permission = 'all', cooldown = 5, cost = 0, currency = 'chips', enabled = true, matchType = 'exact', oncePerUser = false, visibleInViewer = true } = req.body;
  if (!name || !response) {
    return res.status(400).json({ success: false, message: '명령어 이름과 응답 문구는 필수입니다.' });
  }

  const newCmd = {
    id: 'cmd-' + Date.now(),
    name: name.replace(/^!/, '').trim(),
    response,
    permission,
    cooldown: Number(cooldown),
    cost: Number(cost),
    currency: currency === 'points' ? 'points' : 'chips',
    enabled: Boolean(enabled),
    matchType,
    oncePerUser: Boolean(oncePerUser),
    visibleInViewer: visibleInViewer !== false,
    count: 0
  };

  db.commands.push(newCmd);
  commit();
  io.emit('commands_update', db.commands);
  res.json({ success: true, data: newCmd });
});

app.put('/api/commands/:id', requireLocalAdmin, (req, res) => {
  const { id } = req.params;
  const idx = db.commands.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: '명령어를 찾을 수 없습니다.' });

  db.commands[idx] = { ...db.commands[idx], ...req.body };
  commit();
  io.emit('commands_update', db.commands);
  res.json({ success: true, data: db.commands[idx] });
});

app.delete('/api/commands/:id', requireLocalAdmin, (req, res) => {
  const { id } = req.params;
  db.commands = db.commands.filter(c => c.id !== id);
  commit();
  io.emit('commands_update', db.commands);
  res.json({ success: true });
});

app.get('/api/commands/default', (req, res) => {
  res.json({ success: true, data: db.defaultCommands });
});

app.post('/api/commands/default/toggle', requireLocalAdmin, (req, res) => {
  const { key, enabled, visibleInViewer } = req.body;
  if (db.defaultCommands[key]) {
    if (enabled !== undefined) db.defaultCommands[key].enabled = Boolean(enabled);
    if (visibleInViewer !== undefined) db.defaultCommands[key].visibleInViewer = Boolean(visibleInViewer);
    commit();
    io.emit('default_commands_update', db.defaultCommands);
  }
  res.json({ success: true, data: db.defaultCommands });
});

/* ============================
   5. 자동 메시지
============================ */
app.get('/api/automessages', (req, res) => {
  res.json({ success: true, data: db.autoMessages });
});

app.post('/api/automessages', requireLocalAdmin, (req, res) => {
  const { text, intervalMin = 10, categoryFilter = 'all', categoryTarget = '' } = req.body;
  if (!text) return res.status(400).json({ success: false, message: '메시지 내용을 입력하세요.' });

  const newMsg = {
    id: 'auto-' + Date.now(),
    text,
    intervalMin: Number(intervalMin),
    lastSent: 0,
    enabled: true,
    categoryFilter,
    categoryTarget
  };

  db.autoMessages.push(newMsg);
  commit();
  io.emit('automessages_update', db.autoMessages);
  res.json({ success: true, data: newMsg });
});

app.put('/api/automessages/:id', requireLocalAdmin, (req, res) => {
  const { id } = req.params;
  const idx = db.autoMessages.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false });

  db.autoMessages[idx] = { ...db.autoMessages[idx], ...req.body };
  commit();
  io.emit('automessages_update', db.autoMessages);
  res.json({ success: true, data: db.autoMessages[idx] });
});

app.delete('/api/automessages/:id', requireLocalAdmin, (req, res) => {
  const { id } = req.params;
  db.autoMessages = db.autoMessages.filter(m => m.id !== id);
  commit();
  io.emit('automessages_update', db.autoMessages);
  res.json({ success: true });
});

/* ============================
   6. 포인트 & 출석 관리
============================ */
app.get('/api/points', (req, res) => {
  res.json({ success: true, data: db.users });
});

app.post('/api/points/modify', requireLocalAdmin, (req, res) => {
  const { username, amount, currency = 'chips', reason = '' } = req.body;
  if (!username || isNaN(amount)) {
    return res.status(400).json({ success: false, message: '올바른 사용자명과 수량을 입력하세요.' });
  }

  if (!db.users[username]) {
    db.users[username] = {
      nickname: username,
      points: 0,
      chips: 0,
      attendStreak: 0,
      totalAttends: 0,
      lastAttend: '',
      totalCheeseDonation: 0,
      totalDonation: 0,
      tickets: [],
      role: 'viewer'
    };
  }

  const targetCurrency = currency === 'points' ? 'points' : 'chips';
  const delta = Number(amount);
  if (targetCurrency === 'points') {
    db.users[username].points = Math.max(0, (Number(db.users[username].points) || 0) + delta);
  } else {
    db.users[username].chips = Math.max(0, (Number(db.users[username].chips) || 0) + delta);
  }

  commit();
  io.emit('points_update', db.users);
  const unit = targetCurrency === 'points' ? (db.settings.pointName || 'P') : (db.settings.chipName || '칩');
  const label = targetCurrency === 'points' ? '유료 포인트' : '활동 칩';
  const newBal = targetCurrency === 'points' ? db.users[username].points : db.users[username].chips;
  const reasonSuffix = reason ? ` (${reason})` : '';
  sendBotMessage(
    `💰 [관리자 ${label} 조정] [${username}]님에게 ${delta > 0 ? '+' + delta.toLocaleString() : delta.toLocaleString()}${unit} 반영${reasonSuffix} (보유: ${newBal.toLocaleString()}${unit})`,
    { currencyType: targetCurrency }
  );
  res.json({ success: true, user: db.users[username] });
});

app.post('/api/attendance/toggle', requireLocalAdmin, (req, res) => {
  if (!db.defaultCommands.attend) {
    db.defaultCommands.attend = { enabled: true, name: '출첵', desc: '일일 출석 체크 및 포인트 적립' };
  }
  db.defaultCommands.attend.enabled = !db.defaultCommands.attend.enabled;
  commit();
  io.emit('default_commands_update', db.defaultCommands);
  res.json({ success: true, enabled: db.defaultCommands.attend.enabled });
});

app.post('/api/attendance/reset-today', requireLocalAdmin, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let resetCount = 0;
  for (const u of Object.values(db.users)) {
    if (u.lastAttend === today) {
      u.lastAttend = '';
      if (u.attendStreak > 0) u.attendStreak -= 1;
      if (u.totalAttends > 0) u.totalAttends -= 1;
      resetCount++;
    }
  }
  commit();
  io.emit('points_update', db.users);
  res.json({ success: true, resetCount });
});

app.delete('/api/users/:username', requireLocalAdmin, (req, res) => {
  const { username } = req.params;
  if (db.users[username]) {
    delete db.users[username];
    commit();
    io.emit('points_update', db.users);
  }
  res.json({ success: true, users: db.users });
});

app.post('/api/users/clear-dummy', requireLocalAdmin, (req, res) => {
  db.users = {};
  commit();
  io.emit('points_update', db.users);
  res.json({ success: true, users: db.users });
});

app.post('/api/attendance/clear-dummy', requireLocalAdmin, (req, res) => {
  db.users = {};
  commit();
  io.emit('points_update', db.users);
  res.json({ success: true, users: db.users });
});

app.post('/api/attendance/manual', requireLocalAdmin, (req, res) => {
  const { nickname } = req.body;
  if (!nickname) return res.status(400).json({ success: false, message: '닉네임을 입력해주세요.' });

  const today = new Date().toISOString().split('T')[0];
  if (!db.users[nickname]) {
    db.users[nickname] = {
      nickname,
      points: 0,
      chips: 100,
      attendStreak: 0,
      totalAttends: 0,
      lastAttend: '',
      totalCheeseDonation: 0,
      totalDonation: 0,
      tickets: [],
      role: 'viewer'
    };
  }

  const user = db.users[nickname];
  if (user.lastAttend === today) {
    return res.status(400).json({ success: false, message: `${nickname}님은 이미 오늘 출석이 완료되었습니다.` });
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  user.attendStreak = user.lastAttend === yesterday ? user.attendStreak + 1 : 1;
  user.totalAttends += 1;
  user.lastAttend = today;

  const baseChips = db.settings.attendPoints ?? 100;
  const bonusChips = (user.attendStreak - 1) * (db.settings.attendStreakBonus ?? 20);
  const earned = baseChips + bonusChips;
  user.chips = (Number(user.chips) || 0) + earned;
  commit();
  io.emit('points_update', db.users);
  res.json({ success: true, user, earned });
});

app.delete('/api/attendance/user/:nickname', requireLocalAdmin, (req, res) => {
  const { nickname } = req.params;
  const user = db.users[nickname];
  if (user) {
    user.lastAttend = '';
    if (user.attendStreak > 0) user.attendStreak -= 1;
    if (user.totalAttends > 0) user.totalAttends -= 1;
    commit();
    io.emit('points_update', db.users);
  }
  res.json({ success: true });
});

app.post('/api/attendance/test', requireLocalAdmin, (req, res) => {
  const streamerName = getStreamerDisplayName();
  processChatMessage({
    user: streamerName,
    message: '!출첵',
    role: 'streamer',
    source: 'web'
  });
  res.json({ success: true });
});

/* ============================
   7. 노래 신청 (SR)
============================ */
app.get('/api/sr', (req, res) => {
  res.json({ success: true, data: db.songRequests });
});

app.post('/api/sr/skip', requireLocalAdmin, (req, res) => {
  const { currentId } = req.body || {};
  if (currentId && db.songRequests.current && db.songRequests.current.id !== currentId) {
    return res.json({ success: true, message: '이미 스킵되었습니다.', data: db.songRequests });
  }

  if (db.songRequests.queue.length > 0) {
    const nextSong = db.songRequests.queue.shift();
    nextSong.startedAt = Date.now();
    db.songRequests.current = nextSong;
    sendBotMessage(`🎶 다음 신청곡 [${nextSong.title}] (신청: ${nextSong.requester}) 재생을 시작합니다! 🎵`);
  } else {
    db.songRequests.current = null;
    sendBotMessage(`🎵 모든 신청곡 재생이 완료되었습니다.`);
  }
  commit();
  io.emit('sr_update', db.songRequests);
  res.json({ success: true, data: db.songRequests });
});

app.delete('/api/sr/queue/:id', requireLocalAdmin, (req, res) => {
  const { id } = req.params;
  db.songRequests.queue = db.songRequests.queue.filter(q => q.id !== id);
  commit();
  io.emit('sr_update', db.songRequests);
  res.json({ success: true, data: db.songRequests });
});

app.post('/api/sr/add', requireLocalAdmin, async (req, res) => {
  const { song, requester = getStreamerDisplayName() } = req.body;
  if (!song) return res.status(400).json({ success: false, message: '노래 제목 또는 링크를 입력하세요.' });

  const { videoId, title } = await searchYouTube(song);

  const newSong = {
    id: 'sr-' + Date.now(),
    title,
    artist: '신청곡',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    requester,
    duration: '3:30',
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    createdAt: Date.now()
  };

  if (!db.songRequests.current) {
    db.songRequests.current = newSong;
    db.songRequests.current.startedAt = Date.now();
  } else {
    db.songRequests.queue.push(newSong);
  }
  commit();
  io.emit('sr_update', db.songRequests);
  res.json({ success: true, data: db.songRequests });
});

app.post('/api/sr/control', requireLocalAdmin, (req, res) => {
  const { action, volume, isMuted } = req.body || {};

  if (!db.songRequests.settings) {
    db.songRequests.settings = { enabled: true, maxQueueSize: 20, maxPerUser: 2, minCost: 0, volume: 80 };
  }

  if (action === 'pause') {
    db.songRequests.isPlaying = false;
  } else if (action === 'play') {
    db.songRequests.isPlaying = true;
  } else if (action === 'toggle') {
    db.songRequests.isPlaying = !db.songRequests.isPlaying;
  }

  if (typeof volume === 'number') {
    db.songRequests.volume = Math.max(0, Math.min(100, volume));
  }

  if (typeof isMuted === 'boolean') {
    db.songRequests.isMuted = isMuted;
  }

  commit();

  io.emit('sr_control', {
    action,
    isPlaying: db.songRequests.isPlaying ?? true,
    volume: db.songRequests.volume ?? 80,
    isMuted: db.songRequests.isMuted ?? false
  });
  io.emit('sr_update', db.songRequests);

  res.json({
    success: true,
    data: {
      isPlaying: db.songRequests.isPlaying ?? true,
      volume: db.songRequests.volume ?? 80,
      isMuted: db.songRequests.isMuted ?? false
    }
  });
});

app.post('/api/sr/settings', requireLocalAdmin, (req, res) => {
  if (!db.songRequests.settings) {
    db.songRequests.settings = { enabled: true, maxQueueSize: 20, maxPerUser: 2, minCost: 0, currency: 'chips', volume: 80 };
  }
  const { enabled, maxQueueSize, maxPerUser, minCost, currency } = req.body || {};
  if (typeof enabled === 'boolean') db.songRequests.settings.enabled = enabled;
  if (maxQueueSize !== undefined) db.songRequests.settings.maxQueueSize = Number(maxQueueSize);
  if (maxPerUser !== undefined) db.songRequests.settings.maxPerUser = Number(maxPerUser);
  if (minCost !== undefined) db.songRequests.settings.minCost = Math.max(0, Number(minCost));
  if (currency === 'points' || currency === 'chips') db.songRequests.settings.currency = currency;
  commit();
  io.emit('sr_update', db.songRequests);
  res.json({ success: true, data: db.songRequests });
});

/* ============================
   8. 신청 리스트 & 방송 일정표
============================ */
app.get('/api/requests', (req, res) => {
  res.json({ success: true, data: db.generalRequests });
});

app.post('/api/requests/status', requireLocalAdmin, (req, res) => {
  const { id, status } = req.body;
  const reqItem = db.generalRequests.find(r => r.id === id);
  if (reqItem) {
    reqItem.status = status;
    commit();
    io.emit('requests_update', db.generalRequests);
  }
  res.json({ success: true, data: db.generalRequests });
});

app.delete('/api/requests/:id', requireLocalAdmin, (req, res) => {
  const { id } = req.params;
  db.generalRequests = db.generalRequests.filter(r => r.id !== id);
  commit();
  io.emit('requests_update', db.generalRequests);
  res.json({ success: true });
});

app.get('/api/schedules', (req, res) => {
  res.json({
    success: true,
    data: db.schedules || [],
    weeklySchedules: db.weeklySchedules || {},
    activeWeekKey: db.activeWeekKey || ''
  });
});

app.post('/api/schedules', requireLocalAdmin, (req, res) => {
  const { schedules, weekKey, weeklySchedules } = req.body;
  if (Array.isArray(schedules)) {
    if (weekKey) {
      db.weeklySchedules = db.weeklySchedules || {};
      db.weeklySchedules[weekKey] = schedules;
      db.activeWeekKey = weekKey;
    }
    db.schedules = schedules;
    commit();
    io.emit('schedules_update', db.schedules);
    if (db.weeklySchedules) {
      io.emit('weekly_schedules_update', db.weeklySchedules);
    }
    if (db.activeWeekKey) {
      io.emit('active_week_update', db.activeWeekKey);
    }
  } else if (weeklySchedules && typeof weeklySchedules === 'object') {
    db.weeklySchedules = { ...(db.weeklySchedules || {}), ...weeklySchedules };
    commit();
    io.emit('weekly_schedules_update', db.weeklySchedules);
  }
  res.json({
    success: true,
    data: db.schedules,
    weeklySchedules: db.weeklySchedules || {},
    activeWeekKey: db.activeWeekKey || ''
  });
});

app.post('/api/schedules/sync-chzzk', requireLocalAdmin, async (req, res) => {
  try {
    const channelId = extractChzzkChannelId(db.status?.channelId || db.settings?.chzzkChannelId);
    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: '환경설정에서 먼저 치지직 채널 UID를 연결해주세요.'
      });
    }

    const broadcasts = await fetchChzzkBroadcastHistory(channelId);
    const streamerName = getStreamerDisplayName();
    const defaultNotice = `이번 주도 ${streamerName}의 방송과 함께 즐거운 시간 보내요! ✨`;

    const broadcastByDate = {};
    for (const b of broadcasts) {
      broadcastByDate[b.dateStr] = b;
    }

    const WEEKDAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

    const weekOffsets = [-3, -2, -1, 0];
    db.weeklySchedules = db.weeklySchedules || {};
    let syncedCount = 0;

    for (const offset of weekOffsets) {
      const mon = new Date(currentMonday);
      mon.setDate(currentMonday.getDate() + offset * 7);
      const startM = mon.getMonth() + 1;
      const startD = mon.getDate();
      const weekKey = `${mon.getFullYear()}-${String(startM).padStart(2, '0')}-${String(startD).padStart(2, '0')}`;

      const weekDaysSchedule = WEEKDAYS.map((dayName, idx) => {
        const cur = new Date(mon);
        cur.setDate(mon.getDate() + idx);
        const y = cur.getFullYear();
        const m = cur.getMonth() + 1;
        const d = cur.getDate();
        const fullDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateDisplay = `${m}.${d}`;

        const match = broadcastByDate[fullDateStr];
        if (match) {
          syncedCount++;
          return {
            day: dayName,
            time: match.time || '20:00',
            title: match.title,
            off: false,
            tag: '정기',
            date: dateDisplay,
            notice: offset === 0 ? defaultNotice : undefined
          };
        }

        return {
          day: dayName,
          time: '',
          title: '쉬어가는 날 🌙',
          off: true,
          tag: '휴방',
          date: dateDisplay,
          notice: offset === 0 ? defaultNotice : undefined
        };
      });

      db.weeklySchedules[weekKey] = weekDaysSchedule;
      if (offset === 0) {
        db.schedules = weekDaysSchedule;
      }
    }

    commit();
    io.emit('schedules_update', db.schedules);
    io.emit('weekly_schedules_update', db.weeklySchedules);

    res.json({
      success: true,
      message: `치지직 실제 방송 기록(${broadcasts.length}건)을 일정표에 동기화했습니다.`,
      broadcastCount: broadcasts.length,
      syncedCount,
      data: db.schedules,
      weeklySchedules: db.weeklySchedules
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================
   9. 모금 & 예측 & 미니게임
============================ */
app.post('/api/fund', requireLocalAdmin, (req, res) => {
  db.fund = { ...db.fund, ...req.body };
  commit();
  io.emit('fund_update', db.fund);
  res.json({ success: true, data: db.fund });
});

app.post('/api/fund/reset', requireLocalAdmin, (req, res) => {
  db.fund.currentPoints = 0;
  db.fund.recentDonors = [];
  commit();
  io.emit('fund_update', db.fund);
  res.json({ success: true, data: db.fund });
});

app.post('/api/fund/toggle', requireLocalAdmin, (req, res) => {
  if (!db.defaultCommands.fund) {
    db.defaultCommands.fund = { enabled: true, name: '모금', desc: '포인트 모금함 기부' };
  }
  db.defaultCommands.fund.enabled = !db.defaultCommands.fund.enabled;
  commit();
  io.emit('default_commands_update', db.defaultCommands);
  res.json({ success: true, enabled: db.defaultCommands.fund.enabled });
});

app.post('/api/fund/test', requireLocalAdmin, (req, res) => {
  const { points = 5000, user = getStreamerDisplayName() } = req.body;
  const numPoints = Number(points);
  const currency = db.fund?.currency || 'chips';
  const unit = currency === 'points' ? (db.settings.pointName || 'P') : (db.settings.chipName || '칩');
  db.fund.currentPoints += numPoints;
  db.fund.recentDonors.unshift({
    user,
    points: numPoints,
    unit,
    time: Date.now()
  });
  if (db.fund.recentDonors.length > 5) db.fund.recentDonors.pop();
  commit();
  io.emit('fund_update', db.fund);
  sendBotMessage(`💖 [${user}]님이 모금함에 ${numPoints.toLocaleString()}${unit}을(를) 기부하셨습니다!`, { currencyType: currency });
  res.json({ success: true, data: db.fund });
});

app.post('/api/prediction/create', requireLocalAdmin, (req, res) => {
  const { title, options } = req.body;
  if (!title || !options || options.length < 2) {
    return res.status(400).json({ success: false, message: '투표 주제와 최소 2개 이상의 선택지를 입력하세요.' });
  }

  db.prediction = {
    id: 'pred-' + Date.now(),
    title,
    options: options.map((opt, i) => ({
      id: String(i + 1),
      title: typeof opt === 'string' ? opt : opt.title,
      points: 0,
      votes: 0
    })),
    status: 'active',
    winnerOptionId: null,
    createdAt: Date.now()
  };

  if (!db.defaultCommands.vote) {
    db.defaultCommands.vote = { enabled: true, name: '투표', desc: '포인트 예측/투표 배팅' };
  }
  db.defaultCommands.vote.enabled = true;
  commit();
  io.emit('prediction_update', db.prediction);
  io.emit('default_commands_update', db.defaultCommands);
  sendBotMessage(`🗳️ 새로운 승부 예측 투표가 시작되었습니다! 주제: [${title}] (참여: !투표 [번호] [포인트])`);
  res.json({ success: true, data: db.prediction });
});

app.post('/api/prediction/close', requireLocalAdmin, (req, res) => {
  if (db.prediction) {
    db.prediction.status = 'closed';
    commit();
    io.emit('prediction_update', db.prediction);
    sendBotMessage(`🔒 포인트 예측 투표의 베팅이 마감되었습니다! 결과를 기다려주세요.`);
  }
  res.json({ success: true, data: db.prediction });
});

app.post('/api/prediction/resolve', requireLocalAdmin, (req, res) => {
  const { winnerOptionId } = req.body;
  if (!db.prediction) return res.status(400).json({ success: false });

  db.prediction.status = 'resolved';
  db.prediction.winnerOptionId = winnerOptionId;
  commit();
  io.emit('prediction_update', db.prediction);

  const winOpt = db.prediction.options.find(o => o.id === winnerOptionId);
  sendBotMessage(`🏆 승부 예측 결과 확정! 정답: [${winOpt ? winOpt.title : winnerOptionId}] - 축하드립니다!`);
  res.json({ success: true, data: db.prediction });
});

app.post('/api/prediction/cancel', requireLocalAdmin, (req, res) => {
  if (!db.prediction) return res.status(400).json({ success: false });

  db.prediction.status = 'cancelled';
  commit();
  io.emit('prediction_update', db.prediction);
  sendBotMessage(`🚫 포인트 투표가 취소(무효) 처리되었습니다.`);
  res.json({ success: true, data: db.prediction });
});

app.post('/api/prediction/reset', requireLocalAdmin, (req, res) => {
  db.prediction = {
    id: 'pred-' + Date.now(),
    title: '새로운 승부 예측을 생성해주세요',
    options: [
      { id: '1', title: '선택지 1', points: 0, votes: 0 },
      { id: '2', title: '선택지 2', points: 0, votes: 0 }
    ],
    status: 'closed',
    winnerOptionId: null,
    createdAt: Date.now()
  };
  commit();
  io.emit('prediction_update', db.prediction);
  res.json({ success: true, data: db.prediction });
});

app.post('/api/prediction/toggle', requireLocalAdmin, (req, res) => {
  if (!db.defaultCommands.vote) {
    db.defaultCommands.vote = { enabled: true, name: '투표', desc: '포인트 예측/투표 배팅' };
  }
  db.defaultCommands.vote.enabled = !db.defaultCommands.vote.enabled;
  commit();
  io.emit('default_commands_update', db.defaultCommands);
  res.json({ success: true, enabled: db.defaultCommands.vote.enabled });
});

app.post('/api/prediction/test-bet', requireLocalAdmin, (req, res) => {
  const { optionId = '1', points = 1000, user = getStreamerDisplayName() } = req.body;
  if (!db.prediction || db.prediction.status !== 'active') {
    return res.status(400).json({ success: false, message: '현재 진행 중인 투표가 없습니다.' });
  }
  const opt = db.prediction.options.find(o => o.id === optionId) || db.prediction.options[0];
  if (opt) {
    opt.points += Number(points);
    opt.votes += 1;
    commit();
    io.emit('prediction_update', db.prediction);
    const cUnit = db.settings.chipName || '칩';
    sendBotMessage(`🗳️ [${user}]님이 [${opt.title}]에 ${Number(points).toLocaleString()}${cUnit}을(를) 걸었습니다!`, { currencyType: 'chips' });
  }
  res.json({ success: true, data: db.prediction });
});

app.post('/api/roulette/update', requireLocalAdmin, (req, res) => {
  const { items, cost, currency } = req.body;
  if (!db.roulette) db.roulette = { items: [], cost: 500, currency: 'points', history: [] };
  if (items && Array.isArray(items)) db.roulette.items = items;
  if (cost !== undefined) db.roulette.cost = Number(cost);
  if (currency === 'points' || currency === 'chips') db.roulette.currency = currency;
  commit();
  io.emit('roulette_update', db.roulette);
  res.json({ success: true, data: db.roulette });
});

app.post('/api/roulette/spin', requireLocalAdmin, (req, res) => {
  const { user = getStreamerDisplayName() } = req.body;
  const items = db.roulette?.items || [];
  if (items.length === 0) return res.status(400).json({ success: false, message: '룰렛 항목이 없습니다.' });

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
    user,
    winner: selected.name,
    item: selected,
    targetAngle,
    time: Date.now()
  };

  if (!db.roulette.history) db.roulette.history = [];
  db.roulette.history = [spinResult, ...db.roulette.history.slice(0, 19)];
  commit();

  io.emit('spin_roulette', spinResult);
  io.emit('roulette_update', db.roulette);
  sendBotMessage(`🎰 [${user}]님의 룰렛 결과: 🎉 '${selected.name}' 당첨!`);

  res.json({ success: true, data: spinResult });
});


/* ============================
   10. 채팅 & 시뮬레이터
============================ */
app.get('/api/chat/messages', (req, res) => {
  res.json({ success: true, data: db.recentChats || [] });
});

app.post('/api/chat/send', requireLocalAdmin, (req, res) => {
  const { message, sender = db.settings.botName, role = 'bot' } = req.body;
  if (!message) return res.status(400).json({ success: false });

  if (role === 'bot') {
    sendBotMessage(message);
  } else {
    processChatMessage({
      user: sender,
      message,
      role,
      source: 'dashboard'
    });
  }

  res.json({ success: true });
});

app.get('/api/simulate/status', (req, res) => {
  res.json({ success: true, running: isSimulatorRunning() });
});

app.post('/api/simulate/toggle', requireLocalAdmin, (req, res) => {
  const next = !isSimulatorRunning();
  db.settings.autoSimulatorEnabled = next;
  commit();
  if (next) {
    startSimulator();
  } else {
    stopSimulator();
  }
  io.emit('simulator_status', next);
  res.json({ success: true, running: next });
});

app.post('/api/simulate/action', requireLocalAdmin, (req, res) => {
  const { action, username, message, amount } = req.body;
  const user = username || '테스트시청자';

  if (action === 'chat') {
    triggerSimulatedChat(user, message || '테스트 채팅입니다! 😊');
  } else if (action === 'attend') {
    triggerSimulatedChat(user, '!출첵');
  } else if (action === 'cheese') {
    triggerSimulatedCheese(user, amount || 1000, message || '유료 룰렛 대박나세요! 🧀');
  } else if (action === 'roulette') {
    triggerSimulatedChat(user, '!룰렛');
  } else if (action === 'donate') {
    const pts = amount || 1000;
    triggerSimulatedChat(user, `!도네 ${pts} ${message || '항상 즐거운 방송 응원합니다!'}`);
  } else if (action === 'sr') {
    triggerSimulatedChat(user, `!sr ${message || 'Hype Boy - NewJeans'}`);
  } else if (action === 'dice') {
    triggerSimulatedChat(user, '!주사위');
  } else if (action === 'jump') {
    triggerSimulatedChat(user, '!점프');
  }

  res.json({ success: true });
});

/* ============================
   12. 치지직 채널 조회 & OAuth 연동
============================ */
app.post('/api/chzzk/lookup', requireLocalAdmin, async (req, res) => {
  try {
    const info = await lookupChzzkChannel(req.body?.channelId || req.body?.input || '');
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/chzzk/connect', requireLocalAdmin, async (req, res) => {
  const channelId = extractChzzkChannelId(req.body?.channelId || '');
  db.settings.chzzkChannelId = channelId;
  commit();
  io.emit('settings_update', getSanitizedSettings(db.settings));
  await connectChzzk(channelId);
  res.json({ success: true, channelId, status: db.status });
});

app.post('/api/chzzk/disconnect', requireLocalAdmin, (req, res) => {
  db.settings.chzzkAccessToken = '';
  db.settings.chzzkRefreshToken = '';
  db.settings.chzzkAuthedChannelName = '';
  db.settings.chzzkWriteEnabled = false;
  commit();
  io.emit('settings_update', getSanitizedSettings(db.settings));
  console.log('🔓 [치지직 API] 계정 연동 해제 및 발송 토큰 초기화 완료');
  res.json({ success: true, message: '치지직 계정 연동 및 토큰이 초기화되었습니다.' });
});

app.get('/api/chzzk/login', requireLocalAdmin, (req, res) => {
  const { chzzkClientId } = db.settings;
  if (!chzzkClientId) {
    return res.status(400).send('Client ID가 먼저 설정되어야 합니다.');
  }
  const redirectUri = req.query.redirectUri || `http://localhost:${PORT}`;
  const url = `https://chzzk.naver.com/account-interlock?clientId=${encodeURIComponent(chzzkClientId)}&redirectUri=${encodeURIComponent(redirectUri)}&state=shabot`;
  res.redirect(url);
});

app.get('/api/chzzk/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  if (error || !code) {
    return res.redirect(`/?chzzk_error=${encodeURIComponent(error_description || error || '인증 취소')}`);
  }

  try {
    const tokenRes = await axios.post('https://openapi.chzzk.naver.com/auth/v1/token', {
      grantType: 'authorization_code',
      clientId: db.settings.chzzkClientId,
      clientSecret: db.settings.chzzkClientSecret,
      code,
      state: state || 'shabot'
    });

    const tokenData = tokenRes.data?.content;
    if (tokenData?.accessToken) {
      db.settings.chzzkAccessToken = tokenData.accessToken;
      db.settings.chzzkRefreshToken = tokenData.refreshToken || '';
      db.settings.chzzkWriteEnabled = true;

      // 연동된 계정의 채널명(닉네임) 확인 및 저장
      try {
        const meRes = await axios.get('https://openapi.chzzk.naver.com/open/v1/users/me', {
          headers: { 'Authorization': `Bearer ${tokenData.accessToken}` },
          timeout: 4000
        });
        db.settings.chzzkAuthedChannelName = meRes.data?.content?.channelName || meRes.data?.content?.nickname || '';
        console.log(`✅ [치지직 API] 연동 계정 확인: ${db.settings.chzzkAuthedChannelName}`);
      } catch {}

      commit();
      io.emit('settings_update', getSanitizedSettings(db.settings));
      return res.redirect('/?chzzk_auth=success');
    }

    res.redirect('/?chzzk_error=토큰_발급_실패');
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    res.redirect(`/?chzzk_error=${encodeURIComponent(msg)}`);
  }
});

app.get('/', async (req, res, next) => {
  const { code, state } = req.query;
  if (code) {
    try {
      const tokenRes = await axios.post('https://openapi.chzzk.naver.com/auth/v1/token', {
        grantType: 'authorization_code',
        clientId: db.settings.chzzkClientId,
        clientSecret: db.settings.chzzkClientSecret,
        code,
        state: state || 'shabot'
      });

      const tokenData = tokenRes.data?.content;
      if (tokenData?.accessToken) {
        db.settings.chzzkAccessToken = tokenData.accessToken;
        db.settings.chzzkRefreshToken = tokenData.refreshToken || '';
        db.settings.chzzkWriteEnabled = true;

        // 연동된 계정의 채널명(닉네임) 확인 및 저장
        try {
          const meRes = await axios.get('https://openapi.chzzk.naver.com/open/v1/users/me', {
            headers: { 'Authorization': `Bearer ${tokenData.accessToken}` },
            timeout: 4000
          });
          db.settings.chzzkAuthedChannelName = meRes.data?.content?.channelName || meRes.data?.content?.nickname || '';
          console.log(`✅ [치지직 API] 연동 계정 확인: ${db.settings.chzzkAuthedChannelName}`);
        } catch {}

        commit();
        io.emit('settings_update', getSanitizedSettings(db.settings));
        return res.redirect('/?chzzk_auth=success');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      return res.redirect(`/?chzzk_error=${encodeURIComponent(msg)}`);
    }
  }
  next();
});

// OBS 오버레이 및 HTML 캐시 무효화 헤더
app.use((req, res, next) => {
  if (req.path.startsWith('/overlay') || req.path === '/' || req.path.endsWith('.html') || req.path.startsWith('/view')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(indexPath);
  }
  res.send(`오픈 샤봇(ShaBot) 백엔드 서버가 정상 실행 중입니다. (포트 ${PORT})`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n==============================================================`);
    console.log(`ℹ️  [안내] ${PORT}번 포트에서 이미 샤봇 서버가 실행 중입니다.`);
    console.log(`🌐 대시보드 바로가기: http://localhost:${PORT}`);
    console.log(`==============================================================\n`);
  } else {
    console.error('[Server Error]', err);
  }
});

server.listen(PORT, () => {
  const ver = readCurrentVersion();
  console.log(`\n==============================================================`);
  console.log(`     🍪 [ShaBot v${ver}] 오픈 샤봇 - 방송용 챗봇 & 통합 대시보드`);
  console.log(`==============================================================`);
  console.log(` 🚀 샤봇 서버가 성공적으로 시작되었습니다! (포트 ${PORT})`);
  console.log(` 🌐 관리자 대시보드:     http://localhost:${PORT}`);
  console.log(` 📱 시청자 공개 페이지:   http://localhost:${PORT}/view`);
  console.log(``);
  console.log(` 🎨 OBS 브라우저 소스 URL (배경 투명):`);
  console.log(`   - 채팅 아바타:   http://localhost:${PORT}/overlay/avatar (1920x1080)`);
  console.log(`   - 후원 알림:     http://localhost:${PORT}/overlay/alert (1920x1080)`);
  console.log(`   - 노래 플레이어: http://localhost:${PORT}/overlay/song (460x180)`);
  console.log(`   - 후원 목표바:   http://localhost:${PORT}/overlay/goal (400x120)`);
  console.log(`   - 룰렛 위젯:     http://localhost:${PORT}/overlay/roulette (600x600)`);
  console.log(``);
  console.log(` 💡 방송을 마치실 때 이 창을 닫거나 [2_샤봇_종료.bat]을 실행하세요.`);
  console.log(`==============================================================\n`);

  syncTunnelOnStartup();
  startAutoMessageScheduler();
  startUpdateChecker(io);

  // 치지직 계정 연동 닉네임 자동 확인
  if (db.settings.chzzkAccessToken && !db.settings.chzzkAuthedChannelName) {
    axios.get('https://openapi.chzzk.naver.com/open/v1/users/me', {
      headers: { 'Authorization': `Bearer ${db.settings.chzzkAccessToken}` },
      timeout: 4000
    }).then(r => {
      const name = r.data?.content?.channelName || r.data?.content?.nickname;
      if (name) {
        db.settings.chzzkAuthedChannelName = name;
        commit();
        console.log(`✅ [치지직 API] 현재 발송 연동 계정: ${name}`);
      }
    }).catch(() => {});
  }

  if (db.settings.chzzkChannelId) {
    connectChzzk(db.settings.chzzkChannelId);
  } else if (db.settings.autoSimulatorEnabled) {
    startSimulator();
  }
});
