import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Zap,
  Users,
  Check,
  Flame,
  Trophy,
  RotateCcw,
  UserPlus,
  Play,
  Trash2,
  Search,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Radio,
  Clock
} from 'lucide-react';
import { UserWallet, Settings, DefaultCommandConfig, ChannelStatus, getFullCommand } from '../types';
import { api } from '../services/api';

interface AttendanceViewProps {
  users: Record<string, UserWallet>;
  settings: Settings;
  defaultCommands?: Record<string, DefaultCommandConfig>;
  status?: ChannelStatus;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  users,
  settings,
  defaultCommands,
  status
}) => {
  const [basePoints, setBasePoints] = useState<number>(settings.attendPoints ?? 100);
  const [bonusPoints, setBonusPoints] = useState<number>(settings.attendStreakBonus ?? 20);
  const [isSaved, setIsSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualNickname, setManualNickname] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const prefix = settings.prefix || '!';
  const fullAttendCmd = getFullCommand('attend', defaultCommands, prefix, '출첵');

  const cUnit = settings.chipName || '칩';
  const pUnit = settings.pointName || 'P';

  // 설정값 동기화
  useEffect(() => {
    setBasePoints(settings.attendPoints ?? 100);
    setBonusPoints(settings.attendStreakBonus ?? 20);
  }, [settings.attendPoints, settings.attendStreakBonus]);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // 출석 보상 규칙 저장
  const handleSaveSettings = async () => {
    await api.updateSettings({
      attendPoints: Number(basePoints),
      attendStreakBonus: Number(bonusPoints)
    });
    setIsSaved(true);
    showFeedback('출석 보상 포인트 규칙이 저장되었습니다!');
    setTimeout(() => setIsSaved(false), 2000);
  };

  // 출석 명령어 활성/비활성 토글
  const handleToggleAttendance = async () => {
    const isCurrentlyEnabled = defaultCommands?.attend?.enabled ?? true;
    await api.toggleDefaultCommand('attend', !isCurrentlyEnabled);
    showFeedback(!isCurrentlyEnabled ? `출석체크(${fullAttendCmd}) 명령어가 활성화되었습니다!` : '출석체크 기능이 비활성화되었습니다.');
  };

  // 오늘 출석 초기화
  const handleResetToday = async () => {
    if (!window.confirm(`오늘의 출석 기록을 모두 초기화하시겠습니까? 오늘 출석한 시청자가 다시 ${fullAttendCmd}을(를) 할 수 있습니다.`)) return;
    const res = await api.resetTodayAttendance();
    if (res.success) {
      showFeedback(`오늘 출석 기록 ${res.resetCount}건이 초기화되었습니다.`);
    }
  };

  // 더미 데이터 정리 (실방송 모드)
  const handleClearDummy = async () => {
    if (!window.confirm('가짜 테스트 유저 데이터를 모두 비우고 실제 방송 모드로 전환하시겠습니까?')) return;
    const res = await api.clearDummyUsers();
    if (res.success) {
      showFeedback('테스트 데이터가 정리되어 실제 방송 모드로 시작합니다.');
    }
  };

  // 수동 출석 등록
  const handleManualAttend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNickname.trim()) return;
    const res = await api.manualAttend(manualNickname.trim());
    if (res.success) {
      showFeedback(`[${manualNickname.trim()}]님 수동 출석 완료 (+${res.earned}${cUnit} 지급)`);
      setManualNickname('');
      setIsManualModalOpen(false);
    } else {
      alert(res.message || '출석 처리에 실패했습니다.');
    }
  };

  // 특정 유저 오늘 출석 취소
  const handleRemoveUserAttendance = async (nickname: string) => {
    if (!window.confirm(`[${nickname}]님의 오늘 출석 기록을 취소하시겠습니까?`)) return;
    await api.removeAttendance(nickname);
    showFeedback(`[${nickname}]님의 오늘 출석이 취소되었습니다.`);
  };

  // 출석 테스트
  const handleTestAttend = async () => {
    await api.testAttendance();
    showFeedback(`스트리머 [${status?.channelName || '스트리머'}] 계정으로 ${fullAttendCmd} 테스트를 실행했습니다.`);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const userList = Object.values(users);
  const isAttendEnabled = defaultCommands?.attend?.enabled ?? true;

  // 오늘 출석자 목록
  const todayAttendees = userList
    .filter(u => u.lastAttend === todayStr)
    .sort((a, b) => b.attendStreak - a.attendStreak);

  // 검색 필터 적용
  const filteredTodayAttendees = todayAttendees.filter(u =>
    u.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 연속 출석 랭킹 TOP 10 (출석 기록이 있는 사람만)
  const streakRanking = [...userList]
    .filter(u => (u.totalAttends || 0) > 0 || (u.attendStreak || 0) > 0)
    .sort((a, b) => (b.attendStreak || 0) - (a.attendStreak || 0) || (b.totalAttends || 0) - (a.totalAttends || 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* 상단 알림 피드백 토스트 */}
      {actionFeedback && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-emerald-500/90 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* 헤더 및 빠른 관리 액션 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-purple-950/40 border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                시청자 출석 체크 & 연속 출석 관리
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {status?.channelName || '스트리머'} 방송
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                치지직 채팅창에서 시청자가 <b className="text-emerald-400">{fullAttendCmd}</b>을(를) 입력하면 자동으로 {cUnit}을 지급하고 출근 명부에 기록합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 오른쪽 빠른 제어 버튼 모음 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 출석 명령어 ON/OFF 토글 */}
          <button
            onClick={handleToggleAttendance}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
              isAttendEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
            }`}
            title={`시청자의 ${fullAttendCmd} 사용 가능 여부를 켜거나 끕니다.`}
          >
            {isAttendEnabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-rose-400" />}
            <span>{fullAttendCmd} {isAttendEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* 수동 출석 등록 */}
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 text-purple-400" />
            <span>수동 출석</span>
          </button>

          {/* 오늘 출석 초기화 */}
          <button
            onClick={handleResetToday}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="오늘 출석한 기록만 0건으로 리셋합니다."
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>오늘 출석 초기화</span>
          </button>

          {/* 더미 정리 */}
          <button
            onClick={handleClearDummy}
            className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="등록된 시청자 목록을 비우고 초기 상태로 정리합니다."
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>더미 데이터 정리</span>
          </button>

          {/* 테스트 실행 */}
          <button
            onClick={handleTestAttend}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
            title={`스트리머 본인 계정으로 ${fullAttendCmd}을(를) 1회 테스트합니다.`}
          >
            <Play className="w-3 h-3 fill-slate-950" />
            <span>{fullAttendCmd} 테스트</span>
          </button>
        </div>
      </div>

      {/* 출석 칩 보상 설정 카드 */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> 출석 {cUnit} 보상 규칙 설정
          </h3>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            매일 자정(00:00) 기준 1일 1회 출석 인정
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              기본 출석 보상 {cUnit}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={basePoints}
                onChange={(e) => setBasePoints(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
              <span className="text-xs font-bold text-slate-400">{cUnit}</span>
            </div>
            <p className="text-[11px] text-slate-500">당일 첫 출석 시 기본 지급되는 {cUnit}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              연속 출석 1일당 추가 보너스
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={bonusPoints}
                onChange={(e) => setBonusPoints(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
              <span className="text-xs font-bold text-slate-400">{cUnit}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              계산식: 기본 {basePoints}{cUnit} + (연속일수 - 1) × {bonusPoints}{cUnit}
              <span className="text-emerald-400 ml-1.5 font-semibold">
                (예: 3일 연속 시 {basePoints + 2 * bonusPoints}{cUnit})
              </span>
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            {isSaved ? <Check className="w-4 h-4" /> : null}
            {isSaved ? '저장 완료!' : '보상 설정 저장'}
          </button>
        </div>
      </div>

      {/* 출석 현황 2컬럼 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 오늘 출석 완료자 목록 */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg flex flex-col h-[440px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">
                오늘의 출석자 ({todayAttendees.length}명)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">{todayStr}</span>
            </div>
          </div>

          {/* 검색창 */}
          {todayAttendees.length > 5 && (
            <div className="mb-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="시청자 닉네임 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/60 border border-white/10 text-xs text-white focus:outline-none"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {todayAttendees.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">아직 오늘 출석한 시청자가 없습니다</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    시청자가 치지직 채팅창에 <b className="text-emerald-400">{fullAttendCmd}</b>을(를) 입력하면 실시간으로 감지되어 포인트 지급 및 목록에 표시됩니다.
                  </p>
                </div>
                <button
                  onClick={handleTestAttend}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-purple-300" />
                  <span>내 계정으로 {fullAttendCmd} 테스트해보기</span>
                </button>
              </div>
            ) : filteredTodayAttendees.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                검색 결과와 일치하는 출석자가 없습니다.
              </div>
            ) : (
              filteredTodayAttendees.map((u, idx) => (
                <div
                  key={u.nickname}
                  className="p-3 rounded-xl bg-slate-950/60 border border-white/5 hover:border-white/10 flex items-center justify-between text-xs transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{u.nickname}</span>
                        {u.role === 'streamer' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 font-semibold">스트리머</span>
                        )}
                        {u.role === 'manager' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 font-semibold">매니저</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">총 누적 {u.totalAttends}회 출석</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 font-bold text-[11px] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" /> {u.attendStreak}일 연속
                    </span>
                    <span className="text-emerald-400 font-bold text-[11px]">출석완료</span>
                    <button
                      onClick={() => handleRemoveUserAttendance(u.nickname)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                      title="오늘 출석 취소"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 명예의 전당 (연속 출석 랭킹) */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg flex flex-col h-[440px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">연속 출석 명예의 전당 TOP 10</h3>
            </div>
            <span className="text-xs text-amber-400 font-semibold">연속 기록 기준</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {streakRanking.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500 text-xs">
                <Trophy className="w-10 h-10 text-slate-700" />
                <p>아직 연속 출석 기록이 없습니다.</p>
                <p className="text-[11px] text-slate-600">방송 중 시청자들이 {fullAttendCmd}을(를) 쌓아가면 이곳에 랭킹이 표시됩니다.</p>
              </div>
            ) : (
              streakRanking.map((u, idx) => (
                <div
                  key={u.nickname}
                  className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white">{u.nickname}</span>
                      <span className="text-[10px] text-slate-500 ml-2">보유: {(u.chips ?? 0).toLocaleString()}{cUnit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{u.attendStreak}일 연속</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 수동 출석 등록 모달 */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" /> 시청자 수동 출석 등록
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualAttend} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  시청자 치지직 닉네임
                </label>
                <input
                  type="text"
                  placeholder="예: 시청자 닉네임 입력"
                  value={manualNickname}
                  onChange={(e) => setManualNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  입력 시 오늘 출석 처리되며 연속 출석 일수와 보상 포인트가 즉시 반영됩니다.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>출석 등록 완료</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
