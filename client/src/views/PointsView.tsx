import React, { useState, useEffect } from 'react';
import {
  Coins,
  Search,
  PlusCircle,
  MinusCircle,
  Settings as SettingsIcon,
  HeartHandshake,
  Trash2,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Video,
  Target,
  Clock
} from 'lucide-react';
import { UserWallet, Settings, LiveDonation, DefaultCommandConfig, getFullCommand } from '../types';
import { api } from '../services/api';

interface PointsViewProps {
  users: Record<string, UserWallet>;
  settings: Settings;
  liveDonations?: LiveDonation[];
  defaultCommands?: Record<string, DefaultCommandConfig>;
}

export const PointsView: React.FC<PointsViewProps> = ({ users, settings, liveDonations = [], defaultCommands }) => {
  const cUnit = settings.chipName || settings.pointName || '칩';
  const prefix = settings.prefix || '!';
  const fullRouletteCmd = getFullCommand('roulette', defaultCommands, prefix, '룰렛');
  const fullFundCmd = getFullCommand('fund', defaultCommands, prefix, '모금');

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [isDeduct, setIsDeduct] = useState(false);
  const [reason, setReason] = useState('');
  const [donationFilter, setDonationFilter] = useState<'ALL' | 'CHAT' | 'VIDEO' | 'MISSION'>('ALL');
  const [isClearing, setIsClearing] = useState(false);

  // 채팅 자동 칩 적립 규칙
  const [chatPoints, setChatPoints] = useState(settings.chatPoints ?? 5);
  const [chatInterval, setChatInterval] = useState(settings.chatIntervalSeconds ?? 60);

  // 치즈 -> 방송 재화(칩) 적립 규칙
  const [cheeseEnabled, setCheeseEnabled] = useState(settings.cheesePointEnabled !== false);
  const [cheeseRate, setCheeseRate] = useState(settings.cheesePointRatePercent ?? 100);
  const [ruleSaved, setRuleSaved] = useState(false);

  useEffect(() => {
    setChatPoints(settings.chatPoints ?? 5);
    setChatInterval(settings.chatIntervalSeconds ?? 60);
    setCheeseEnabled(settings.cheesePointEnabled !== false);
    setCheeseRate(settings.cheesePointRatePercent ?? 100);
  }, [settings.chatPoints, settings.chatIntervalSeconds, settings.cheesePointEnabled, settings.cheesePointRatePercent]);

  const handleSaveRule = async () => {
    await api.updateSettings({
      chatPoints: Number(chatPoints),
      chatIntervalSeconds: Number(chatInterval),
      cheesePointEnabled: Boolean(cheeseEnabled),
      cheesePointRatePercent: Number(cheeseRate)
    });
    setRuleSaved(true);
    setTimeout(() => setRuleSaved(false), 2000);
  };

  const openModifyModal = (username: string, deduct = false) => {
    setSelectedUser(username);
    setIsDeduct(deduct);
    setAmount(deduct ? 100 : 500);
    setReason('');
    setModalOpen(true);
  };

  const handleModifyPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isNaN(amount) || amount <= 0) return;
    const finalAmount = isDeduct ? -amount : amount;
    await api.modifyPoints(selectedUser, finalAmount, reason, 'chips');
    setModalOpen(false);
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`'${username}' 시청자 데이터를 목록에서 삭제하시겠습니까?`)) return;
    await api.deleteUser(username);
  };

  const handleClearDummy = async () => {
    if (!window.confirm('가상 테스트 시청자 계정을 모두 비우고 실제 방송 모드로 정리하시겠습니까?\n(실제 채팅/후원을 하는 시청자들만 실시간 등록됩니다)')) return;
    await api.clearDummyUsers();
  };

  const userList = Object.values(users);
  const filteredUsers = userList.filter(u =>
    u.nickname.toLowerCase().includes(search.toLowerCase())
  );

  // 통합 재화 랭킹 TOP
  const unifiedRanking = [...userList]
    .filter(u => (u.chips || 0) > 0 || (u.totalDonation || 0) > 0 || (u.totalCheeseDonation || 0) > 0)
    .sort((a, b) => ((b.chips || 0) - (a.chips || 0)) || ((b.totalDonation || 0) - (a.totalDonation || 0)))
    .slice(0, 8);

  const previewEarned = Math.floor(1000 * (Number(cheeseRate || 0) / 100));

  // 라이브 후원 내역 초기화
  const handleClearDonations = async () => {
    if (!window.confirm('이번 라이브 방송의 치즈 후원 목록을 모두 비우시겠습니까?')) return;
    setIsClearing(true);
    try {
      await api.clearLiveDonations();
    } catch (err) {
      console.error(err);
      alert('후원 목록 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsClearing(false);
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 60) return '방금 전';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
  };

  const getDonationKindBadge = (type?: string) => {
    const upper = String(type || 'CHAT').toUpperCase();
    if (upper.includes('VIDEO')) {
      return {
        label: '영상 도네',
        icon: <Video className="w-2.5 h-2.5" />,
        style: 'bg-purple-500/10 text-purple-300 border-purple-500/20'
      };
    }
    if (upper.includes('MISSION')) {
      return {
        label: '미션 도네',
        icon: <Target className="w-2.5 h-2.5" />,
        style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
      };
    }
    return {
      label: '채팅 도네',
      icon: <MessageSquare className="w-2.5 h-2.5" />,
      style: 'bg-sky-500/10 text-sky-300 border-sky-500/20'
    };
  };

  const filteredDonations = liveDonations.filter(d => {
    if (donationFilter === 'ALL') return true;
    const upper = String(d.donationType || 'CHAT').toUpperCase();
    if (donationFilter === 'VIDEO') return upper.includes('VIDEO');
    if (donationFilter === 'MISSION') return upper.includes('MISSION');
    return !upper.includes('VIDEO') && !upper.includes('MISSION');
  });

  const chatDonationCount = liveDonations.filter(d => {
    const u = String(d.donationType || 'CHAT').toUpperCase();
    return !u.includes('VIDEO') && !u.includes('MISSION');
  }).length;
  const videoDonationCount = liveDonations.filter(d => String(d.donationType || '').toUpperCase().includes('VIDEO')).length;
  const missionDonationCount = liveDonations.filter(d => String(d.donationType || '').toUpperCase().includes('MISSION')).length;
  const totalCheese = filteredDonations.reduce((acc, d) => acc + (Number(d.cheese) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            시청자 재화 & 지갑 관리
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            치즈 후원·출석·채팅으로 적립되는 <b className="text-amber-300">방송 재화({cUnit})</b> 잔액과 랭킹, 실시간 치즈 후원 내역을 한눈에 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleClearDummy}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-1.5 border border-amber-400/30 transition-all shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> 테스트 계정 정리
          </button>
          <button
            onClick={() => openModifyModal('', false)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" /> {cUnit} 수동 지급/차감
          </button>
        </div>
      </div>

      {/* 적립 규칙 빠른 설정 바 (치즈 적립 + 실시간 채팅 적립) */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
        {/* 좌측: 치즈 -> 방송 재화 적립 */}
        <div className="xl:col-span-6 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={cheeseEnabled}
              onChange={(e) => setCheeseEnabled(e.target.checked)}
              className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
            />
            <div>
              <div className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                🧀 치지직 치즈 → 방송 재화({cUnit}) 적립
              </div>
              <div className="text-[11px] text-slate-400">
                1,000치즈 후원 시 <b className="text-emerald-300">+{previewEarned.toLocaleString()}{cUnit}</b> 자동 적립 ({fullRouletteCmd}·{fullFundCmd} 등 사용)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">적립률</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={cheeseRate}
              onChange={(e) => setCheeseRate(Number(e.target.value))}
              className="w-20 px-2 py-1.5 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-300 text-center font-bold"
            />
            <span className="text-slate-300 font-bold">%</span>
          </div>
        </div>

        {/* 우측: 채팅 -> 방송 재화 적립 + 통합 저장 */}
        <div className="xl:col-span-6 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-amber-300">🪙 실시간 채팅 → 방송 재화({cUnit}) 적립</div>
              <div className="text-[11px] text-slate-400">출첵·채팅으로 쌓아 {fullFundCmd} 및 미니게임에 사용</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="number"
              min="10"
              value={chatInterval}
              onChange={(e) => setChatInterval(Number(e.target.value))}
              className="w-14 px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-center font-bold"
            />
            <span className="text-slate-400">초마다</span>
            <input
              type="number"
              min="1"
              value={chatPoints}
              onChange={(e) => setChatPoints(Number(e.target.value))}
              className="w-14 px-2 py-1.5 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300 text-center font-bold"
            />
            <span className="text-slate-300">{cUnit}</span>

            <button
              onClick={handleSaveRule}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              {ruleSaved ? '저장됨 ✓' : '규칙 적용'}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 2컬럼: 좌측 시청자 지갑 / 우측 재화 랭킹 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 유저 지갑 목록 (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 gap-3">
            <div className="font-bold text-sm text-white">
              시청자 지갑 목록 ({filteredUsers.length}명)
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="시청자 닉네임 검색..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none w-48"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredUsers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                아직 등록된 시청자 지갑이 없습니다.
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.nickname}
                  className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                      {u.nickname.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{u.nickname}</span>
                        {u.role === 'streamer' && <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">스트리머</span>}
                        {u.role === 'manager' && <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">매니저</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        출석 {u.totalAttends || 0}회 · 치즈적립 {(u.totalCheeseDonation || 0).toLocaleString()}{cUnit} · 후원 {(u.totalDonation || 0).toLocaleString()}{cUnit}
                      </div>
                    </div>
                  </div>

                  {/* 단일 재화 잔액 + 조작 버튼 */}
                  <div className="flex items-center justify-end gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openModifyModal(u.nickname, false)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-right transition-colors cursor-pointer"
                      title={`클릭하여 ${cUnit} 지급/차감`}
                    >
                      <div className="text-[10px] text-amber-400/80 font-bold">🪙 보유 {cUnit}</div>
                      <div className="text-sm font-black text-amber-300">
                        {(u.chips || 0).toLocaleString()} <span className="text-[11px] font-semibold">{cUnit}</span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => openModifyModal(u.nickname, false)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer"
                        title="재화 수동 지급"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModifyModal(u.nickname, true)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="재화 수동 차감"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </button>
                      {u.role !== 'streamer' && (
                        <button
                          onClick={() => handleDeleteUser(u.nickname)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors cursor-pointer"
                          title="시청자 데이터 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측: 통합 재화 랭킹 TOP (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 gap-2">
            <div className="flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-sm text-white">재화 랭킹 TOP</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[11px] font-bold">
              🪙 {cUnit} 보유순
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {unifiedRanking.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center px-4">
                아직 적립/후원 내역이 없습니다.
              </div>
            ) : (
              unifiedRanking.map((u, idx) => (
                <div
                  key={u.nickname}
                  className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-lg font-black flex items-center justify-center text-[11px] ${
                      idx === 0 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white">{u.nickname}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-amber-300">
                      보유 {(u.chips || 0).toLocaleString()}{cUnit}
                    </div>
                    {((u.totalCheeseDonation || 0) > 0 || (u.totalDonation || 0) > 0) && (
                      <div className="text-[10px] text-slate-400">
                        {(u.totalCheeseDonation || 0) > 0 && `치즈적립 ${(u.totalCheeseDonation || 0).toLocaleString()}${cUnit}`}
                        {(u.totalCheeseDonation || 0) > 0 && (u.totalDonation || 0) > 0 && ' · '}
                        {(u.totalDonation || 0) > 0 && <span className="text-rose-300">후원 {(u.totalDonation || 0).toLocaleString()}{cUnit}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 라이브 방송 치즈 후원 목록 (Full Width) */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">라이브 방송 치즈 후원 목록</h3>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 text-[11px] font-bold border border-amber-500/20 font-mono">
                  총 {filteredDonations.length}건 · {totalCheese.toLocaleString()} 치즈
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                현재 방송 동안 치지직에서 수신된 실시간 치즈 후원(채팅·영상·미션) 리스트입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 도네 유형 필터 탭 */}
            <div className="flex rounded-xl bg-slate-950 p-0.5 border border-white/10 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setDonationFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  donationFilter === 'ALL' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                전체 ({liveDonations.length})
              </button>
              <button
                type="button"
                onClick={() => setDonationFilter('CHAT')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  donationFilter === 'CHAT' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                채팅 ({chatDonationCount})
              </button>
              <button
                type="button"
                onClick={() => setDonationFilter('VIDEO')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  donationFilter === 'VIDEO' ? 'bg-purple-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3 h-3" />
                영상 ({videoDonationCount})
              </button>
              <button
                type="button"
                onClick={() => setDonationFilter('MISSION')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  donationFilter === 'MISSION' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3 h-3" />
                미션 ({missionDonationCount})
              </button>
            </div>

            {/* 내역 비우기 버튼 */}
            {liveDonations.length > 0 && (
              <button
                type="button"
                onClick={handleClearDonations}
                disabled={isClearing}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] font-bold transition-all cursor-pointer"
                title="현재 방송의 치즈 후원 목록을 초기화합니다."
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
                <span>내역 비우기</span>
              </button>
            )}
          </div>
        </div>

        {/* 후원 리스트 본문 */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredDonations.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              {liveDonations.length === 0 ? (
                <>
                  <Coins className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  이번 라이브 방송에서 수신된 치즈 후원 내역이 아직 없습니다.
                  <div className="text-[11px] text-slate-600 mt-1">
                    (치지직 생방송 중 시청자가 치즈를 후원하면 닉네임, 수량, 메시지가 실시간 자동 기록됩니다)
                  </div>
                </>
              ) : (
                '해당 카테고리의 후원 내역이 없습니다.'
              )}
            </div>
          ) : (
            filteredDonations.map((d) => {
              const kindBadge = getDonationKindBadge(d.donationType);
              return (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-amber-500/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 md:mt-0">
                      {d.user ? d.user.slice(0, 1) : '익'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{d.user}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${kindBadge.style}`}>
                          {kindBadge.icon}
                          {kindBadge.label}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {getRelativeTime(d.timestamp)}
                        </span>
                      </div>
                      <div className="text-slate-300 text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/5 inline-block max-w-full break-words">
                        {d.message ? d.message : <span className="text-slate-500 italic">(메시지 없이 후원)</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end shrink-0 pl-11 md:pl-0">
                    <div className="text-right px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="text-[10px] text-amber-400/80 font-bold">후원 치즈</div>
                      <div className="text-base font-black text-amber-300 font-mono">
                        🧀 {d.cheese.toLocaleString()} <span className="text-xs font-bold">치즈</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 재화 수동 지급/차감 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {isDeduct ? `${cUnit} 수동 차감 (회수)` : `${cUnit} 수동 지급`}
              </h3>
              <div className="flex rounded-lg bg-slate-950 p-0.5 border border-white/10 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setIsDeduct(false)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer ${!isDeduct ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                >
                  + 지급
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeduct(true)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer ${isDeduct ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                >
                  - 차감
                </button>
              </div>
            </div>

            <form onSubmit={handleModifyPoints} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  대상 시청자 닉네임
                </label>
                <input
                  type="text"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  placeholder="닉네임 정확히 입력"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isDeduct ? '차감할 수량' : '지급할 수량'} ({cUnit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  사유 (선택사항)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예: 이벤트 당첨 보상, 수동 정산 등"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer ${
                    isDeduct
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {isDeduct ? '차감 실행' : '지급 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
