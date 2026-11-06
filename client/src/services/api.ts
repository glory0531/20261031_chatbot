const API_BASE = window.location.port === '24701' ? 'http://localhost:24700/api' : '/api';

export const api = {
  // 버전 및 원격 자동 업데이트
  async getVersion() {
    const res = await fetch(`${API_BASE}/version`);
    return res.json();
  },

  async getUpdateStatus() {
    const res = await fetch(`${API_BASE}/update/status`);
    return res.json();
  },

  async checkUpdate() {
    const res = await fetch(`${API_BASE}/update/check`, { method: 'POST' });
    return res.json();
  },

  async applyUpdate() {
    const res = await fetch(`${API_BASE}/update/apply`, { method: 'POST' });
    return res.json();
  },

  async dismissUpdateNotice() {
    const res = await fetch(`${API_BASE}/update/dismiss-notice`, { method: 'POST' });
    return res.json();
  },

  // 치지직 채널 조회 (URL 또는 UID)
  async lookupChzzkChannel(input: string) {
    const res = await fetch(`${API_BASE}/chzzk/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    return res.json();
  },

  // 상태 토글
  async toggleBot() {
    const res = await fetch(`${API_BASE}/status/toggle`, { method: 'POST' });
    return res.json();
  },

  // 상태 업데이트 (방제, 카테고리)
  async updateStatus(data: { title?: string; category?: string; channelName?: string }) {
    const res = await fetch(`${API_BASE}/status/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 치지직 실황 동기화
  async syncStatus() {
    const res = await fetch(`${API_BASE}/status/sync`, { method: 'POST' });
    return res.json();
  },

  // 설정 저장
  async updateSettings(data: any) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 커스텀 명령어 추가
  async createCommand(cmd: any) {
    const res = await fetch(`${API_BASE}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd)
    });
    return res.json();
  },

  // 커스텀 명령어 수정
  async updateCommand(id: string, cmd: any) {
    const res = await fetch(`${API_BASE}/commands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd)
    });
    return res.json();
  },

  // 커스텀 명령어 삭제
  async deleteCommand(id: string) {
    const res = await fetch(`${API_BASE}/commands/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // 기본 명령어 활성화/비활성화 토글
  async toggleDefaultCommand(key: string, enabled: boolean) {
    const res = await fetch(`${API_BASE}/commands/default/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, enabled })
    });
    return res.json();
  },

  // 기본 명령어 시청자 페이지 표시/숨김 토글
  async toggleDefaultCommandViewer(key: string, enabled: boolean, visibleInViewer: boolean) {
    const res = await fetch(`${API_BASE}/commands/default/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, enabled, visibleInViewer })
    });
    return res.json();
  },

  // 자동 메시지 생성
  async createAutoMessage(msg: any) {
    const res = await fetch(`${API_BASE}/automessages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
    return res.json();
  },

  // 자동 메시지 수정
  async updateAutoMessage(id: string, msg: any) {
    const res = await fetch(`${API_BASE}/automessages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
    return res.json();
  },

  // 자동 메시지 삭제
  async deleteAutoMessage(id: string) {
    const res = await fetch(`${API_BASE}/automessages/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // 포인트 & 칩 지급/차감
  async modifyPoints(username: string, amount: number, reason?: string, currency: 'points' | 'chips' = 'chips') {
    const res = await fetch(`${API_BASE}/points/modify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, amount, reason, currency })
    });
    return res.json();
  },

  // 특정 유저 데이터 삭제
  async deleteUser(username: string) {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // 유저 목록 전체 초기화
  async clearDummyUsers() {
    const res = await fetch(`${API_BASE}/users/clear-dummy`, { method: 'POST' });
    return res.json();
  },

  // 노래 신청 추가
  async addSong(song: string, requester?: string) {
    const res = await fetch(`${API_BASE}/sr/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song, requester })
    });
    return res.json();
  },

  // 노래 신청 다음 곡 스킵
  async skipSong(currentId?: string) {
    const res = await fetch(`${API_BASE}/sr/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentId })
    });
    return res.json();
  },

  // 노래 신청 플레이어 제어
  async controlSongPlayer(data: { action: 'play' | 'pause' | 'toggle' | 'volume' | 'mute' | 'unmute'; volume?: number; isMuted?: boolean }) {
    const res = await fetch(`${API_BASE}/sr/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 노래 신청 비용/재화 설정 저장
  async updateSongSettings(data: { enabled?: boolean; maxQueueSize?: number; maxPerUser?: number; minCost?: number; currency?: 'points' | 'chips' }) {
    const res = await fetch(`${API_BASE}/sr/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 노래 신청 큐 삭제
  async deleteSong(id: string) {
    const res = await fetch(`${API_BASE}/sr/queue/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // 시참/미션 신청 상태 변경
  async updateRequestStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/requests/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    return res.json();
  },

  // 시참/미션 신청 삭제
  async deleteRequest(id: string) {
    const res = await fetch(`${API_BASE}/requests/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // 모금 목표 수정
  async updateFund(data: any) {
    const res = await fetch(`${API_BASE}/fund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async resetFund() {
    const res = await fetch(`${API_BASE}/fund/reset`, { method: 'POST' });
    return res.json();
  },

  async toggleFund() {
    const res = await fetch(`${API_BASE}/fund/toggle`, { method: 'POST' });
    return res.json();
  },

  async testFund(points = 5000) {
    const res = await fetch(`${API_BASE}/fund/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points })
    });
    return res.json();
  },

  async createPrediction(data: { title: string; options: string[] }) {
    const res = await fetch(`${API_BASE}/prediction/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async closePrediction() {
    const res = await fetch(`${API_BASE}/prediction/close`, { method: 'POST' });
    return res.json();
  },

  async resolvePrediction(winnerOptionId: string) {
    const res = await fetch(`${API_BASE}/prediction/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerOptionId })
    });
    return res.json();
  },

  async cancelPrediction() {
    const res = await fetch(`${API_BASE}/prediction/cancel`, { method: 'POST' });
    return res.json();
  },

  async resetPrediction() {
    const res = await fetch(`${API_BASE}/prediction/reset`, { method: 'POST' });
    return res.json();
  },

  async togglePrediction() {
    const res = await fetch(`${API_BASE}/prediction/toggle`, { method: 'POST' });
    return res.json();
  },

  async testPredictionBet(optionId: string, points = 1000) {
    const res = await fetch(`${API_BASE}/prediction/test-bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId, points })
    });
    return res.json();
  },

  async sendChat(message: string, role = 'bot', sender?: string) {
    const res = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, role, sender })
    });
    return res.json();
  },

  async getSimulatorStatus() {
    const res = await fetch(`${API_BASE}/simulate/status`);
    return res.json();
  },

  async toggleAutoSimulator() {
    const res = await fetch(`${API_BASE}/simulate/toggle`, { method: 'POST' });
    return res.json();
  },

  async simulateAction(action: string, options: any = {}) {
    const res = await fetch(`${API_BASE}/simulate/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...options })
    });
    return res.json();
  },

  async connectChzzk(channelId: string) {
    const res = await fetch(`${API_BASE}/chzzk/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId })
    });
    return res.json();
  },

  async updateRoulette(data: { items?: any[]; cost?: number; currency?: 'points' | 'chips' }) {
    const res = await fetch(`${API_BASE}/roulette/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async spinRoulette(user?: string) {
    const res = await fetch(`${API_BASE}/roulette/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    return res.json();
  },


  async toggleAttendance() {
    const res = await fetch(`${API_BASE}/attendance/toggle`, { method: 'POST' });
    return res.json();
  },

  async resetTodayAttendance() {
    const res = await fetch(`${API_BASE}/attendance/reset-today`, { method: 'POST' });
    return res.json();
  },

  async manualAttend(nickname: string) {
    const res = await fetch(`${API_BASE}/attendance/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });
    return res.json();
  },

  async removeAttendance(nickname: string) {
    const res = await fetch(`${API_BASE}/attendance/user/${encodeURIComponent(nickname)}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async testAttendance() {
    const res = await fetch(`${API_BASE}/attendance/test`, { method: 'POST' });
    return res.json();
  },

  async getSchedules() {
    const res = await fetch(`${API_BASE}/schedules`);
    return res.json();
  },

  async updateSchedules(schedules: any[], weekKey?: string) {
    const res = await fetch(`${API_BASE}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules, weekKey })
    });
    return res.json();
  },

  async syncChzzkSchedules() {
    const res = await fetch(`${API_BASE}/schedules/sync-chzzk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getTunnelStatus() {
    const res = await fetch(`${API_BASE}/tunnel/status`);
    return res.json();
  },

  async startTunnel(options?: { provider?: string; mode?: string; token?: string; subdomain?: string; customDomain?: string }) {
    const res = await fetch(`${API_BASE}/tunnel/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    return res.json();
  },

  async stopTunnel() {
    const res = await fetch(`${API_BASE}/tunnel/stop`, { method: 'POST' });
    return res.json();
  }
};
