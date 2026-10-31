import React, { useState } from 'react';
import { Coins, Search, PlusCircle, MinusCircle, Award, Settings as SettingsIcon, Check, HeartHandshake, Trash2, RotateCcw } from 'lucide-react';
import { UserWallet, Settings } from '../types';
import { api } from '../services/api';

interface PointsViewProps {
  users: Record<string, UserWallet>;
  settings: Settings;
}

export const PointsView: React.FC<PointsViewProps> = ({ users, settings }) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [isDeduct, setIsDeduct] = useState(false);
  const [reason, setReason] = useState('');

  // 포인트 적립 규칙
  const [chatPoints, setChatPoints] = useState(settings.chatPoints || 5);
  const [chatInterval, setChatInterval] = useState(settings.chatIntervalSeconds || 60);
  const [ruleSaved, setRuleSaved] = useState(false);

  const handleSaveRule = async () => {
    await api.updateSettings({
      chatPoints: Number(chatPoints),
      chatIntervalSeconds: Number(chatInterval)
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
    await api.modifyPoints(selectedUser, finalAmount, reason);
    setModalOpen(false);
  };

  // 특정 시청자 삭제
  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`'${username}' 시청자 데이터를 목록에서 삭제하시겠습니까?`)) return;
    await api.deleteUser(username);
  };

  // 가상 테스트 계정 일괄 정리 (실제 방송 모드)
  const handleClearDummy = async () => {
    if (!window.confirm('가상 테스트 시청자 계정을 모두 비우고 실제 방송 모드로 정리하시겠습니까?\n(스트리머 계정만 남고, 실제 채팅을 치는 시청자들만 실시간 등록됩니다)')) return;
    await api.clearDummyUsers();
  };

  const userList = Object.values(users);
  const filteredUsers = userList.filter(u => 
    u.nickname.toLowerCase().includes(search.toLowerCase())
  );

  // 후원 랭킹
  const donationRanking = [...userList]
    .filter(u => (u.totalDonation || 0) > 0)
    .sort((a, b) => (b.totalDonation || 0) - (a.totalDonation || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            신사들의 시크릿 금고 (포인트 지갑 & 후원 관리)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            채팅과 출석으로 적립되는 방송 전용 포인트입니다. 시청자별 포인트 지급/회수와 누적 후원 내역을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleClearDummy}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-1.5 border border-amber-400/30 transition-all shadow-sm"
            title="테스트 더미 유저를 비우고 실제 방송 모드로 정리"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> 테스트 계정 정리
          </button>
          <button
            onClick={() => openModifyModal('', false)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> 칩 직접 지급/차감
          </button>
        </div>
      </div>

      {/* 포인트 자동 적립 설정 */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">채팅 자동 포인트 적립 규칙</h4>
            <p className="text-[11px] text-slate-400">시청자가 채팅을 칠 때 정해진 주기마다 자동으로 지급됩니다.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs">
            <input
              type="number"
              min="10"
              value={chatInterval}
              onChange={(e) => setChatInterval(Number(e.target.value))}
              className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-center font-bold"
            />
            <span className="text-slate-400">초마다</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="number"
              min="1"
              value={chatPoints}
              onChange={(e) => setChatPoints(Number(e.target.value))}
              className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-amber-300 text-center font-bold"
            />
            <span className="text-slate-400">칩 지급</span>
          </div>

          <button
            onClick={handleSaveRule}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-white/10 transition-colors"
          >
            {ruleSaved ? '저장됨' : '적용'}
          </button>
        </div>
      </div>

      {/* 메인 2컬럼: 좌측 유저 목록 / 우측 후원 TOP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 유저 지갑 목록 (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg flex flex-col h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 gap-3">
            <div className="font-bold text-sm text-white">
              시청자 포인트 목록 ({filteredUsers.length}명)
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="시청자 닉네임 검색..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none w-44"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredUsers.map((u) => (
              <div
                key={u.nickname}
                className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-xs">
                    {u.nickname.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{u.nickname}</span>
                      {u.role === 'streamer' && <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">스트리머</span>}
                      {u.role === 'manager' && <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">매니저</span>}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      총 출석 {u.totalAttends || 0}회 · 누적 후원 {(u.totalDonation || 0).toLocaleString()}P
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-base font-black text-amber-300">
                    {(u.points || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">P</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openModifyModal(u.nickname, false)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                      title="포인트 지급"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openModifyModal(u.nickname, true)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                      title="포인트 차감"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    {u.role !== 'streamer' && (
                      <button
                        onClick={() => handleDeleteUser(u.nickname)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors ml-0.5"
                        title="시청자 데이터 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 누적 후원 랭킹 (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg flex flex-col h-[500px]">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
            <HeartHandshake className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-sm text-white">포인트 후원 랭킹 TOP</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {donationRanking.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                아직 포인트 후원 내역이 없습니다. (!도네)
              </div>
            ) : (
              donationRanking.map((u, idx) => (
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
                  <span className="font-bold text-rose-300">
                    {(u.totalDonation || 0).toLocaleString()}P 후원
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 포인트 지급/차감 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white">
              {isDeduct ? '포인트 차감 (회수)' : '포인트 수동 지급'}
            </h3>

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
                  {isDeduct ? '차감할 포인트' : '지급할 포인트'}
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
                  placeholder="예: 방송 이벤트 당첨 보너스"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-xs text-slate-950 ${
                    isDeduct ? 'bg-rose-400 hover:bg-rose-300' : 'bg-amber-500 hover:bg-amber-400'
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
