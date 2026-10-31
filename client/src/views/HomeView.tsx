import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Clock,
  Send,
  Sparkles,
  Coins,
  CalendarCheck,
  Music,
  HeartHandshake,
  Radio,
  Edit3,
  Check,
  Volume2,
  Wand2,
  Moon,
  Star,
  RefreshCw
} from 'lucide-react';
import { ChannelStatus, Settings, ChatMessage, UserWallet, SongRequestsState, FundState } from '../types';
import { api } from '../services/api';

interface HomeViewProps {
  status: ChannelStatus;
  settings?: Settings;
  messages: ChatMessage[];
  users: Record<string, UserWallet>;
  songRequests: SongRequestsState;
  fund: FundState;
  onNavigateTab: (tab: any) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  status,
  settings,
  messages,
  users,
  songRequests,
  fund,
  onNavigateTab
}) => {
  const streamerName = status.channelName || settings?.streamerName || '스트리머';
  const botName = settings?.botName || '샤봇';
  const fandomName = settings?.fandomName || '시청자';
  const pointName = settings?.pointName || 'P';
  const channelId = status.channelId || settings?.chzzkChannelId || '';

  const [titleInput, setTitleInput] = useState(status.title);
  const [categoryInput, setCategoryInput] = useState(status.category);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'bot' | 'streamer'>('bot');
  const [isSyncing, setIsSyncing] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleInput(status.title);
    setCategoryInput(status.category);
  }, [status.title, status.category]);

  const handleSyncLive = async () => {
    setIsSyncing(true);
    try {
      await api.syncStatus();
    } catch {}
    setTimeout(() => setIsSyncing(false), 800);
  };

  interface StageAvatar {
    id: number | string;
    name: string;
    x: number;
    direction: number;
    isJumping: boolean;
    isDemo?: boolean;
  }

  const [avatars, setAvatars] = useState<StageAvatar[]>([
    { id: 'demo-1', name: `${fandomName}1`, x: 24, direction: 1, isJumping: false, isDemo: true },
    { id: 'demo-2', name: `${fandomName}2`, x: 52, direction: -1, isJumping: false, isDemo: true },
    { id: 'demo-3', name: `${fandomName}3`, x: 78, direction: 1, isJumping: false, isDemo: true }
  ]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const username = (lastMsg.user || '').trim();
      if (!username) return;

      setAvatars(prev => {
        const foundIdx = prev.findIndex(a => a.name === username);
        if (foundIdx !== -1) {
          return prev.map(a => a.name === username ? { ...a, isJumping: true } : a);
        } else {
          const realAvatars = prev.filter(a => !a.isDemo);
          const newAv: StageAvatar = {
            id: Date.now(),
            name: username,
            x: Math.floor(Math.random() * 70) + 15,
            direction: Math.random() > 0.5 ? 1 : -1,
            isJumping: true
          };
          return [...realAvatars.slice(-7), newAv];
        }
      });

      setTimeout(() => {
        setAvatars(prev => prev.map(a => a.name === username ? { ...a, isJumping: false } : a));
      }, 700);
    }
  }, [messages]);

  const handleSaveStatus = async () => {
    await api.updateStatus({ title: titleInput, category: categoryInput });
    setIsEditingTitle(false);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    await api.sendChat(chatInput, selectedRole, selectedRole === 'streamer' ? streamerName : undefined);
    setChatInput('');
  };

  const handleAvatarJump = (idx: number) => {
    setAvatars(prev => {
      const next = [...prev];
      if (next[idx]) next[idx].isJumping = true;
      return next;
    });
    setTimeout(() => {
      setAvatars(prev => {
        const next = [...prev];
        if (next[idx]) next[idx].isJumping = false;
        return next;
      });
    }, 600);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const userList = Object.values(users);
  const todayAttends = userList.filter(u => u.lastAttend === todayStr).length;
  const totalPoints = userList.reduce((acc, u) => acc + (u.points || 0), 0);
  const totalDonations = userList.reduce((acc, u) => acc + (u.totalDonation || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. 방송 헤더 배너 */}
      <div className="rounded-3xl witch-card-gold p-6 sm:p-7 relative overflow-hidden shadow-2xl">
        {status.channelImageUrl && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 md:w-1/2 pointer-events-none opacity-25 overflow-hidden">
            <img
              src={status.channelImageUrl}
              alt={streamerName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              {status.isLive ? (
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-[11px] tracking-wider shadow-md flex items-center gap-1.5 animate-pulse">
                  <Radio className="w-3 h-3" /> LIVE ON AIR
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-800/90 text-amber-300 font-bold text-[11px] tracking-wider border border-amber-400/30 flex items-center gap-1.5">
                  <Moon className="w-3 h-3 text-amber-400" /> 방송 준비 중 (OFFLINE)
                </span>
              )}
              <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {streamerName}님의 방송 대시보드
              </span>
            </div>

            {isEditingTitle ? (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-amber-400/50 text-sm text-white flex-1 focus:outline-none"
                  placeholder="방송 제목을 입력하세요"
                />
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-amber-400/50 text-sm text-white w-40 focus:outline-none"
                  placeholder="카테고리"
                />
                <button
                  onClick={handleSaveStatus}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> 저장
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                  {status.title || `${streamerName}의 방송`}
                </h2>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-400/20 text-amber-400 transition-colors cursor-pointer"
                  title="방제 / 카테고리 수정"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/15 text-slate-100 font-bold border border-amber-400/30 flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-amber-400" />
                카테고리: {status.category || 'talk'}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                {status.isLive ? (
                  <><b className="text-white">{status.viewers.toLocaleString()}</b>명의 {fandomName} 시청 중</>
                ) : (
                  <>치지직 팔로워 <b className="text-white">{(status.followerCount || 0).toLocaleString()}</b>명</>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {status.isLive ? (
                  <><b className="text-white">{Math.floor((status.uptimeSeconds || 0) / 3600)}시간 {Math.floor(((status.uptimeSeconds || 0) % 3600) / 60)}분</b> 진행 중</>
                ) : (
                  <span>방송 시작 시 실시간 집계</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2.5 flex-shrink-0">
            <button
              onClick={handleSyncLive}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-slate-100 border border-amber-400/40 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '실황 동기화 중...' : '치지직 실황 동기화'}</span>
            </button>
            {channelId ? (
              <a
                href={`https://chzzk.naver.com/${channelId}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>내 치지직 방송국 열기</span>
              </a>
            ) : (
              <button
                onClick={() => onNavigateTab('settings')}
                className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>치지직 채널 연결하기</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. 주요 통계 4개 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div
          onClick={() => onNavigateTab('attendance')}
          className="p-4 sm:p-5 rounded-2xl witch-card cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">오늘 {fandomName} 출석</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{todayAttends}<span className="text-xs text-slate-400 font-normal ml-1">명</span></div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">!출첵 실시간 집계</div>
        </div>

        <div
          onClick={() => onNavigateTab('points')}
          className="p-4 sm:p-5 rounded-2xl witch-card cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">보유 포인트 총량</span>
            <div className="p-2 rounded-xl bg-amber-400/15 text-amber-400 group-hover:scale-110 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-100">{totalPoints.toLocaleString()}<span className="text-xs text-slate-400 font-normal ml-1">{pointName}</span></div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">총 {userList.length}명의 {fandomName} 등록</div>
        </div>

        <div
          onClick={() => onNavigateTab('fund-prediction')}
          className="p-4 sm:p-5 rounded-2xl witch-card cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">누적 포인트 후원</span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 group-hover:scale-110 transition-transform">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-300">{totalDonations.toLocaleString()}<span className="text-xs text-slate-400 font-normal ml-1">{pointName}</span></div>
          <div className="text-[11px] text-amber-300 font-semibold mt-1">
            모금 달성률 {fund.goalPoints > 0 ? Math.min(100, Math.floor((fund.currentPoints / fund.goalPoints) * 100)) : 0}%
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('sr')}
          className="p-4 sm:p-5 rounded-2xl witch-card cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold">신청곡 대기열</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-300 group-hover:scale-110 transition-transform">
              <Music className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-200">{songRequests.queue.length}<span className="text-xs text-slate-400 font-normal ml-1">곡 대기</span></div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">재생: {songRequests.current ? songRequests.current.title : '없음'}</div>
        </div>
      </div>

      {/* 3. 메인 그리드: 실시간 채팅 피드 & 도트 아바타 무대 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col h-[520px] rounded-3xl witch-card overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-extrabold text-sm text-white">실시간 방송 채팅 피드</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">총 {messages.length}개의 메시지</span>
          </div>

          <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-950/80">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                실시간 채팅 메시지를 기다리고 있습니다... 💬
              </div>
            ) : (
              messages.map((msg) => {
                const isDonation = msg.message.includes('!도네') || msg.message.includes('후원');
                return (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-2xl text-xs flex items-start gap-3 transition-all ${
                      isDonation
                        ? 'bg-amber-400/15 border border-amber-400/45 text-slate-100'
                        : msg.isBot
                        ? 'bg-slate-900/90 border border-amber-400/30 text-slate-100'
                        : 'bg-slate-900/60 border border-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {msg.isBot ? (
                        <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
                          🤖
                        </div>
                      ) : isDonation ? (
                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                          💖
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-slate-950 text-amber-300 border border-slate-700 flex items-center justify-center font-bold text-[11px]">
                          {msg.user.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-amber-300">{msg.user}</span>
                        {isDonation && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-200 text-[10px] font-black border border-amber-400/40">
                            후원 알림
                          </span>
                        )}
                        {msg.role === 'streamer' && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-200 text-[10px] font-extrabold border border-rose-500/40">
                            스트리머
                          </span>
                        )}
                        {msg.role === 'manager' && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 text-[10px] font-bold border border-emerald-500/40">
                            매니저
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{msg.time}</span>
                      </div>
                      <p className="text-slate-100 font-medium break-words leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendChat} className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2.5">
            <select
              value={selectedRole}
              onChange={(e: any) => setSelectedRole(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 font-bold focus:outline-none"
            >
              <option value="bot">🤖 {botName}</option>
              <option value="streamer">🎙️ 스트리머</option>
            </select>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="명령어 (!출첵, !포인트, !도네 1000 등) 또는 채팅 직접 발송..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> 전송
            </button>
          </form>
        </div>

        {/* 우측: 도트 아바타 무대 & 노래 위젯 */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-3xl witch-card relative overflow-hidden flex flex-col h-[290px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-sm text-white">실시간 {fandomName} 아바타 무대</span>
              </div>
              <button
                onClick={() => api.simulateAction('jump')}
                className="px-2.5 py-1 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-slate-100 text-[11px] font-black border border-amber-400/35 transition-all cursor-pointer"
              >
                모두 점프! 🐾
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              채팅을 치면 {fandomName}들의 귀여운 도트 아바타가 무대 위에서 점프하며 반응합니다.
            </p>

            <div className="flex-1 relative mt-2 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
              <div className="absolute bottom-4 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

              {avatars.map((av, idx) => {
                const avatarIcon = idx % 3 === 0
                  ? '/assets/cookie_avatar.svg'
                  : idx % 3 === 1
                  ? '/assets/strawberry_cookie.svg'
                  : '/assets/butter_cookie.svg';

                return (
                  <div
                    key={av.id}
                    onClick={() => handleAvatarJump(idx)}
                    style={{ left: `${av.x}%`, bottom: av.isJumping ? '48px' : '12px' }}
                    className="absolute -translate-x-1/2 flex flex-col items-center cursor-pointer transition-all duration-300 group select-none"
                  >
                    <img
                      src={avatarIcon}
                      alt="아바타"
                      style={{ transform: av.direction < 0 ? 'scaleX(-1)' : 'scaleX(1)' }}
                      className="w-12 h-12 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
                    />
                    <span className="text-[10px] text-slate-100 font-bold mt-0.5 max-w-[72px] truncate bg-black/60 px-1.5 py-0.2 rounded-full border border-white/10">
                      {av.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl witch-card space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Music className="w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-amber-400 font-extrabold flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> 신청곡 플레이어
                </div>
                <div className="font-extrabold text-white text-sm truncate">
                  {songRequests.current ? songRequests.current.title : '현재 재생 중인 곡이 없습니다.'}
                </div>
                <div className="text-xs text-slate-400">
                  신청자: {songRequests.current ? songRequests.current.requester : '-'} · 대기 {songRequests.queue.length}곡
                </div>
              </div>
              <button
                onClick={() => api.skipSong()}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                다음 곡 ✦
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-white flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {fund.title}
                </span>
                <span className="text-amber-300 font-black text-sm">
                  {fund.goalPoints > 0 ? Math.min(100, Math.floor((fund.currentPoints / fund.goalPoints) * 100)) : 0}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
                <div
                  style={{ width: `${fund.goalPoints > 0 ? Math.min(100, Math.floor((fund.currentPoints / fund.goalPoints) * 100)) : 0}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200 transition-all duration-500"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{fund.currentPoints.toLocaleString()}{pointName} 모금</span>
                <span>목표 {fund.goalPoints.toLocaleString()}{pointName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
