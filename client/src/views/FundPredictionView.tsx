import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Vote,
  CheckCircle2,
  Trophy,
  Edit3,
  Check,
  RotateCcw,
  Plus,
  Lock,
  XCircle,
  Copy,
  ExternalLink,
  Sparkles,
  Play,
  ToggleLeft,
  ToggleRight,
  Flame,
  Users,
  AlertCircle,
  Clock,
  Coins
} from 'lucide-react';
import { FundState, PredictionState, DefaultCommandConfig, ChannelStatus } from '../types';
import { api } from '../services/api';

interface FundPredictionViewProps {
  fund: FundState;
  prediction: PredictionState;
  defaultCommands?: Record<string, DefaultCommandConfig>;
  status?: ChannelStatus;
  settings?: any;
}

export const FundPredictionView: React.FC<FundPredictionViewProps> = ({
  fund,
  prediction,
  defaultCommands,
  status
}) => {
  // 모금함 설정 상태
  const [isEditingFund, setIsEditingFund] = useState(false);
  const [fundTitle, setFundTitle] = useState(fund.title);
  const [goalPoints, setGoalPoints] = useState(fund.goalPoints);

  // 새 예측 투표 모달 상태
  const [isNewPredictionOpen, setIsNewPredictionOpen] = useState(false);
  const [predTitle, setPredTitle] = useState('');
  const [option1, setOption1] = useState('승리 (이긴다) ✨');
  const [option2, setOption2] = useState('패배 (진다) 🌙');

  // 토스트 피드백
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setFundTitle(fund.title);
    setGoalPoints(fund.goalPoints);
  }, [fund.title, fund.goalPoints]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // 모금함 설정 저장
  const handleSaveFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundTitle.trim() || goalPoints <= 0) return;
    await api.updateFund({
      title: fundTitle.trim(),
      goalPoints: Number(goalPoints)
    });
    setIsEditingFund(false);
    showFeedback('모금함 목표가 저장되었습니다!');
  };

  // 모금액 0P 초기화
  const handleResetFund = async () => {
    if (!window.confirm('현재까지의 모금액과 기부자 목록을 0P로 초기화하시겠습니까? 새 모금 목표를 시작할 때 유용합니다.')) return;
    await api.resetFund();
    showFeedback('모금함이 0P 클린 상태로 초기화되었습니다.');
  };

  // 모금 명령어 토글
  const handleToggleFund = async () => {
    const isCurrentlyEnabled = defaultCommands?.fund?.enabled ?? true;
    await api.toggleDefaultCommand('fund', !isCurrentlyEnabled);
    showFeedback(!isCurrentlyEnabled ? '모금(!모금) 명령어가 활성화되었습니다!' : '모금 기능이 비활성화되었습니다.');
  };

  // 모금 테스트 (본인 계정으로 5,000P 기부)
  const handleTestFund = async () => {
    await api.testFund(5000);
    showFeedback(`[${status?.channelName || '스트리머'}] 계정으로 모금함에 5,000P를 테스트 기부했습니다!`);
  };

  // OBS 오버레이 링크 복사
  const handleCopyGoalOverlay = () => {
    const url = `${window.location.origin}/overlay/goal`;
    navigator.clipboard.writeText(url);
    showFeedback('OBS 목표바 오버레이 URL이 클립보드에 복사되었습니다!');
  };

  // 새 예측 투표 생성
  const handleCreatePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predTitle.trim() || !option1.trim() || !option2.trim()) {
      alert('투표 주제와 선택지 2개를 모두 입력해주세요.');
      return;
    }

    const res = await api.createPrediction({
      title: predTitle.trim(),
      options: [option1.trim(), option2.trim()]
    });

    if (res.success) {
      setIsNewPredictionOpen(false);
      setPredTitle('');
      showFeedback('새로운 신사들의 승부예측이 시작되었습니다! 치지직 채팅에서 베팅할 수 있습니다.');
    }
  };

  // 투표 마감
  const handleClosePrediction = async () => {
    if (!window.confirm('베팅을 마감하시겠습니까? 마감 후에는 더 이상 시청자가 포인트를 걸 수 없습니다.')) return;
    await api.closePrediction();
    showFeedback('투표 베팅이 마감되었습니다. 결과가 나오면 정산해주세요.');
  };

  // 정산
  const handleResolvePrediction = async (optionId: string, optTitle: string) => {
    if (!window.confirm(`[${optTitle}] 선택지를 정답(승리)으로 확정하고 정산하시겠습니까?`)) return;
    await api.resolvePrediction(optionId);
    showFeedback(`[${optTitle}] 선택지가 승리로 확정되어 정산되었습니다! 🏆`);
  };

  // 투표 취소
  const handleCancelPrediction = async () => {
    if (!window.confirm('현재 투표를 취소(무효 처리)하시겠습니까?')) return;
    await api.cancelPrediction();
    showFeedback('투표가 취소되었습니다.');
  };

  // 투표 초기화
  const handleResetPrediction = async () => {
    if (!window.confirm('투표 기록을 비우고 새 투표 대기 상태로 초기화하시겠습니까?')) return;
    await api.resetPrediction();
    showFeedback('예측 투표가 클린 상태로 초기화되었습니다.');
  };

  // 투표 명령어 토글
  const handleTogglePrediction = async () => {
    const isCurrentlyEnabled = defaultCommands?.vote?.enabled ?? true;
    await api.toggleDefaultCommand('vote', !isCurrentlyEnabled);
    showFeedback(!isCurrentlyEnabled ? '투표(!투표) 명령어가 활성화되었습니다!' : '투표 기능이 비활성화되었습니다.');
  };

  // 테스트 베팅
  const handleTestBet = async (optionId: string) => {
    await api.testPredictionBet(optionId, 1000);
    showFeedback(`${optionId}번 선택지에 1,000P를 테스트 베팅했습니다.`);
  };

  // 더미 데이터 전체 정리 (실방송 모드)
  const handleClearAllDummy = async () => {
    if (!window.confirm('모금함(0P)과 예측 투표를 모두 실제 방송용 클린 상태로 초기화하시겠습니까?')) return;
    await api.resetFund();
    await api.resetPrediction();
    showFeedback('모금함과 예측 투표가 실제 방송용 클린 상태로 정리되었습니다! ✨');
  };

  const isFundEnabled = defaultCommands?.fund?.enabled ?? true;
  const isVoteEnabled = defaultCommands?.vote?.enabled ?? true;

  const percent = fund.goalPoints > 0 ? Math.min(100, Math.floor((fund.currentPoints / fund.goalPoints) * 100)) : 0;
  const totalVotesPoints = prediction.options ? prediction.options.reduce((acc, opt) => acc + (opt.points || 0), 0) : 0;
  const totalVotesCount = prediction.options ? prediction.options.reduce((acc, opt) => acc + (opt.votes || 0), 0) : 0;

  return (
    <div className="space-y-6">
      {/* 토스트 피드백 */}
      {feedback && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-amber-500/90 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 헤더 및 빠른 관리 액션 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-amber-950/30 border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                포인트 공동 모금 & 승부예측 투표
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {status?.channelName || '스트리머'} 방송
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                시청자들과 함께 포인트를 모으는 <b className="text-amber-400">!모금</b>과 승부 예측 <b className="text-blue-400">!투표</b>를 실시간으로 제어합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 상단 빠른 버튼 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 전체 클린 버튼 */}
          <button
            onClick={handleClearAllDummy}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="테스트 더미 데이터를 비우고 실방송 모드로 시작합니다."
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>더미 데이터 정리</span>
          </button>

          {/* OBS 오버레이 링크 복사 */}
          <button
            onClick={handleCopyGoalOverlay}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="OBS 브라우저 소스에 넣을 모금 목표바 URL을 복사합니다."
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>OBS 목표바 URL</span>
          </button>
        </div>
      </div>

      {/* 2컬럼 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ======================================================== */}
        {/* 1. 공동 모금함 카드 */}
        {/* ======================================================== */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">공동 모금함 설정 (!모금)</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* 모금 기능 ON/OFF 토글 */}
                <button
                  onClick={handleToggleFund}
                  className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1 transition-all ${
                    isFundEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                  title="시청자의 !모금 명령어 사용 여부를 켜거나 끕니다."
                >
                  {isFundEnabled ? <ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> : <ToggleLeft className="w-3.5 h-3.5 text-rose-400" />}
                  <span>!모금 {isFundEnabled ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => setIsEditingFund(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold flex items-center gap-1 transition-all"
                >
                  <Edit3 className="w-3 h-3 text-amber-400" /> 수정
                </button>
              </div>
            </div>

            {/* 모금 목표 본문 */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-amber-400/80 font-bold uppercase tracking-wider block">현재 모금 목표</span>
                  <span className="font-extrabold text-base text-white">{fund.title}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-400">{percent}%</span>
                </div>
              </div>

              {/* 진행률 게이지 바 */}
              <div className="w-full h-4 rounded-full bg-slate-900 p-0.5 border border-white/10 overflow-hidden relative">
                <div
                  style={{ width: `${percent}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-700 shadow-lg shadow-amber-500/30"
                ></div>
              </div>

              <div className="flex justify-between text-xs text-slate-400 pt-1">
                <span>현재 모금액: <strong className="text-white text-sm">{fund.currentPoints.toLocaleString()}P</strong></span>
                <span>목표액: <strong className="text-slate-300 text-sm">{fund.goalPoints.toLocaleString()}P</strong></span>
              </div>
            </div>

            {/* 최근 모금 참여자 목록 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> 최근 모금 참여자 ({fund.recentDonors?.length || 0}명)
                </span>
                <span className="text-[11px] text-slate-500">채팅에서 !모금 [포인트] 입력 시 적립</span>
              </div>

              <div className="min-h-[140px] max-h-[170px] overflow-y-auto space-y-1.5 pr-1">
                {!fund.recentDonors || fund.recentDonors.length === 0 ? (
                  <div className="h-[140px] rounded-xl bg-slate-950/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                    <Target className="w-6 h-6 text-slate-600 mb-1" />
                    <p>아직 모금에 참여한 시청자가 없습니다.</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">방송 중 시청자가 !모금을 보내면 실시간으로 이곳에 기록됩니다.</p>
                  </div>
                ) : (
                  fund.recentDonors.map((d, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                          {i + 1}
                        </span>
                        <span className="font-bold text-white">{d.user}</span>
                      </div>
                      <span className="text-amber-400 font-extrabold">+{d.points.toLocaleString()}P</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 하단 제어 버튼 */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              onClick={handleResetFund}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="모금액과 기부자 내역을 0으로 리셋합니다."
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>모금액 0P 초기화</span>
            </button>

            <button
              onClick={handleTestFund}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Play className="w-3 h-3 fill-slate-950" />
              <span>5,000P 모금 테스트</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. 포인트 예측 투표 카드 */}
        {/* ======================================================== */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">포인트 예측 투표 (!투표)</h3>
              </div>

              <div className="flex items-center gap-2">
                {/* 투표 기능 ON/OFF 토글 */}
                <button
                  onClick={handleTogglePrediction}
                  className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1 transition-all ${
                    isVoteEnabled
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                  title="시청자의 !투표 명령어 사용 여부를 켜거나 끕니다."
                >
                  {isVoteEnabled ? <ToggleRight className="w-3.5 h-3.5 text-blue-400" /> : <ToggleLeft className="w-3.5 h-3.5 text-rose-400" />}
                  <span>!투표 {isVoteEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* 상태 배지 */}
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                    prediction.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                      : prediction.status === 'closed'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : prediction.status === 'resolved'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-slate-800 text-slate-400 border-white/5'
                  }`}
                >
                  {prediction.status === 'active'
                    ? '🟢 진행 중 (베팅 가능)'
                    : prediction.status === 'closed'
                    ? '🔒 베팅 마감 (결과 대기)'
                    : prediction.status === 'resolved'
                    ? '🏆 정산 완료'
                    : '🚫 취소됨'}
                </span>
              </div>
            </div>

            {/* 투표 본문 정보 */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] text-blue-400/80 font-bold uppercase tracking-wider block">투표 주제</span>
                  <h4 className="text-base font-extrabold text-white">{prediction.title}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">총 베팅 포인트</span>
                  <span className="text-base font-black text-amber-400">{totalVotesPoints.toLocaleString()}P</span>
                  <span className="text-[10px] text-slate-500 block">({totalVotesCount}표 참여)</span>
                </div>
              </div>

              {/* 선택지 목록 및 배당율 게이지 */}
              <div className="space-y-2.5 pt-1">
                {prediction.options?.map((opt, idx) => {
                  const optPercent = totalVotesPoints > 0 ? Math.round((opt.points / totalVotesPoints) * 100) : 50;
                  const isWinner = prediction.winnerOptionId === opt.id;
                  const isClosedOrActive = prediction.status === 'active' || prediction.status === 'closed';

                  return (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isWinner
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                          : 'bg-slate-900/80 border-white/5 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            idx === 0 ? 'bg-blue-500 text-white' : 'bg-rose-500 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white">{opt.title}</span>
                          {isWinner && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black flex items-center gap-0.5">
                              <Trophy className="w-3 h-3" /> 승리 확정!
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{opt.votes || 0}표</span>
                          <span className="text-sm font-black text-white">{optPercent}% ({opt.points.toLocaleString()}P)</span>
                        </div>
                      </div>

                      {/* 비율 바 */}
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden mb-2">
                        <div
                          style={{ width: `${optPercent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-blue-500' : 'bg-rose-500'}`}
                        ></div>
                      </div>

                      {/* 승리 정산 버튼 (진행 중이거나 마감 상태일 때) */}
                      {isClosedOrActive && (
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => handleResolvePrediction(opt.id, opt.title)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-[11px] font-bold transition-all flex items-center gap-1"
                          >
                            <Trophy className="w-3 h-3 text-emerald-400" />
                            <span>이 선택지 승리로 정산</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 하단 제어 버튼 모음 */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* 베팅 마감 버튼 */}
              {prediction.status === 'active' && (
                <button
                  onClick={handleClosePrediction}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/5 text-xs font-bold flex items-center gap-1 transition-all"
                  title="베팅을 마감하고 결과를 기다립니다."
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>베팅 마감</span>
                </button>
              )}

              {/* 투표 취소 버튼 */}
              {(prediction.status === 'active' || prediction.status === 'closed') && (
                <button
                  onClick={handleCancelPrediction}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/5 text-xs font-bold flex items-center gap-1 transition-all"
                  title="투표를 무효 처리합니다."
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>투표 취소</span>
                </button>
              )}

              {/* 투표 초기화 (정산/취소 완료 시) */}
              {(prediction.status === 'resolved' || prediction.status === 'cancelled') && (
                <button
                  onClick={handleResetPrediction}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>투표 초기화</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* 테스트 베팅 */}
              {prediction.status === 'active' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTestBet('1')}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all"
                  >
                    1번 베팅 (1,000P)
                  </button>
                  <button
                    onClick={() => handleTestBet('2')}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
                  >
                    2번 베팅 (1,000P)
                  </button>
                </div>
              )}

              {/* 새 투표 만들기 버튼 */}
              <button
                onClick={() => setIsNewPredictionOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 예측 투표 만들기</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 모달 1: 모금함 목표 수정 모달 */}
      {/* ======================================================== */}
      {isEditingFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" /> 모금 목표 설정 수정
              </h3>
              <button
                onClick={() => setIsEditingFund(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  모금 목표 제목
                </label>
                <input
                  type="text"
                  value={fundTitle}
                  onChange={(e) => setFundTitle(e.target.value)}
                  placeholder="예: 공포게임 켠왕 미션 & 시청자 이벤트 모금함"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  목표 포인트 (P)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={goalPoints}
                  onChange={(e) => setGoalPoints(Math.max(1000, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingFund(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>설정 저장</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 모달 2: 새 예측 투표 만들기 모달 */}
      {/* ======================================================== */}
      {isNewPredictionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Vote className="w-4 h-4 text-blue-400" /> 새로운 신사들의 승부예측 만들기
              </h3>
              <button
                onClick={() => setIsNewPredictionOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePrediction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  예측 투표 주제
                </label>
                <input
                  type="text"
                  value={predTitle}
                  onChange={(e) => setPredTitle(e.target.value)}
                  placeholder="예: 오늘 공포게임 소리 3번 이하로 지를까?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-1.5">
                    1번 선택지
                  </label>
                  <input
                    type="text"
                    value={option1}
                    onChange={(e) => setOption1(e.target.value)}
                    placeholder="예: 성공한다! ✨"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-400 mb-1.5">
                    2번 선택지
                  </label>
                  <input
                    type="text"
                    value={option2}
                    onChange={(e) => setOption2(e.target.value)}
                    placeholder="예: 실패한다... 🌙"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                💡 투표가 생성되면 시청자들이 치지직 채팅창에 <b className="text-white">!투표 [선택지번호] [포인트]</b> (예: <span className="font-mono text-white">!투표 1 1000</span>)를 입력하여 실시간으로 베팅할 수 있습니다.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPredictionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>투표 시작하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
