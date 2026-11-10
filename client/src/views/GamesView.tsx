import React, { useState, useEffect, useMemo } from 'react';
import {
  Dices, Play, Sparkles, Plus, Trash2, Save,
  Check, AlertCircle, Info, Volume2, MessageSquare, Gift, Terminal, Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  RouletteState,
  RouletteItem,
  RouletteTriggerSettings,
  RouletteSpinSummaryItem,
  Settings,
  DefaultCommandConfig,
  CustomCommand,
  getFullCommand
} from '../types';
import { api } from '../services/api';
import { socket } from '../services/socket';

interface GamesViewProps {
  roulette: RouletteState;
  settings?: Settings;
  defaultCommands?: Record<string, DefaultCommandConfig>;
  commands?: CustomCommand[];
}

// 룰렛 추천 프리셋 템플릿
const ROULETTE_PRESETS = [
  {
    name: '🌙 기본 방송용 룰렛',
    cost: 500,
    items: [
      { id: 'p1-1', name: '치킨 기프티콘', chance: 2, color: '#f59e0b' },
      { id: 'p1-2', name: '노래 1곡 신청권', chance: 20, color: '#3b82f6' },
      { id: 'p1-3', name: '소원권 (방제/게임)', chance: 5, color: '#ec4899' },
      { id: 'p1-4', name: '칩 500개 반환', chance: 30, color: '#10b981' },
      { id: 'p1-5', name: '꽝 (다음 기회에)', chance: 43, color: '#6b7280' }
    ]
  },
  {
    name: '😈 스트리머 벌칙 룰렛',
    cost: 1000,
    items: [
      { id: 'p2-1', name: '애교 3종 세트 💖', chance: 25, color: '#ec4899' },
      { id: 'p2-2', name: '스쿼트 10회 🏋️', chance: 25, color: '#f59e0b' },
      { id: 'p2-3', name: '물 한잔 원샷 💧', chance: 20, color: '#06b6d4' },
      { id: 'p2-4', name: '노데스 챌린지 🎮', chance: 15, color: '#8b5cf6' },
      { id: 'p2-5', name: '벌칙 면제권! 🎉', chance: 15, color: '#10b981' }
    ]
  },
  {
    name: '🍕 야식 & 디저트 룰렛',
    cost: 700,
    items: [
      { id: 'p3-1', name: '도미노 피자 세트', chance: 3, color: '#ef4444' },
      { id: 'p3-2', name: '황금올리브 치킨', chance: 7, color: '#f59e0b' },
      { id: 'p3-3', name: '싸이버거 세트', chance: 15, color: '#3b82f6' },
      { id: 'p3-4', name: '스타벅스 아메리카노', chance: 25, color: '#10b981' },
      { id: 'p3-5', name: '배라 싱글레귤러', chance: 20, color: '#ec4899' },
      { id: 'p3-6', name: '꽝 (다음 기회에)', chance: 30, color: '#6b7280' }
    ]
  }
];

const COLOR_PRESETS = [
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
  '#3b82f6', '#06b6d4', '#10b981', '#6b7280'
];

const DEFAULT_ROULETTE_SETTINGS: RouletteTriggerSettings = {
  enabled: true,
  commandEnabled: true,
  commandTrigger: '!룰렛',
  donationEnabled: true,
  donationUnitCheese: 1000,
  donationMaxCheese: 0,
  donationAllowNonMultiple: true,
  donationMessageKeyword: '',
  donationAlsoEarnChips: false,
  subEnabled: false,
  subTier: 'all',
  subGiftEnabled: false,
  subGiftTier: 'all',
  subGiftCountPerSpin: 1,
  pullLimitMode: 'max',
  maxPullCount: 0,
  fixedPullCounts: '1, 5, 10',
  bonusEnabled: true,
  bonusEveryN: 10,
  bonusAddM: 1,
  sendResultToChat: true,
  readResultTts: true
};

export const GamesView: React.FC<GamesViewProps> = ({
  roulette,
  settings,
  defaultCommands,
  commands = []
}) => {
  const cUnit = settings?.chipName || settings?.pointName || '칩';
  const prefix = settings?.prefix || '!';
  const fullRouletteCmd = getFullCommand('roulette', defaultCommands, prefix, '룰렛');

  // --- 룰렛 상태 ---
  const [rouletteItems, setRouletteItems] = useState<RouletteItem[]>(roulette.items || []);
  const [rouletteCost, setRouletteCost] = useState<number>(roulette.cost ?? 500);
  const [rSettings, setRSettings] = useState<RouletteTriggerSettings>({
    ...DEFAULT_ROULETTE_SETTINGS,
    ...(roulette.settings || {})
  });
  const [triggerTab, setTriggerTab] = useState<'command' | 'donation' | 'subscription'>('donation');

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winnerItem, setWinnerItem] = useState<string | null>(null);
  const [spinSummary, setSpinSummary] = useState<RouletteSpinSummaryItem[]>([]);
  const [lastSpinMeta, setLastSpinMeta] = useState<{
    user?: string;
    totalPulls?: number;
    basePulls?: number;
    bonusPulls?: number;
    triggerType?: string;
  } | null>(null);
  const [rouletteSaved, setRouletteSaved] = useState(false);

  // 동기화
  useEffect(() => {
    if (roulette.items) setRouletteItems(roulette.items);
    if (roulette.cost !== undefined) setRouletteCost(roulette.cost);
    if (roulette.settings) {
      setRSettings({
        ...DEFAULT_ROULETTE_SETTINGS,
        ...roulette.settings
      });
    }
  }, [roulette]);

  // TTS 발화 도우미
  const speakRouletteResult = (text: string, shouldRead?: boolean) => {
    if (shouldRead === false) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ko-KR';
      utter.rate = 1.05;
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  // 실시간 소켓 스핀 수신 (시청자 명령어/후원/구독 발동 시 대시보드 휠도 동기화 회전)
  useEffect(() => {
    const onSpin = (data: any) => {
      const targetAngle = data?.targetAngle !== undefined ? data.targetAngle : Math.floor(Math.random() * 360);
      const winnerName = data?.winner || '당첨';
      setIsSpinning(true);
      setWinnerItem(null);
      setSpinSummary([]);
      setLastSpinMeta(null);

      setRotation(prev => prev + 360 * 5 + targetAngle);

      setTimeout(() => {
        setIsSpinning(false);
        setWinnerItem(winnerName);
        if (Array.isArray(data?.resultsSummary)) {
          setSpinSummary(data.resultsSummary);
        }
        setLastSpinMeta({
          user: data?.user,
          totalPulls: data?.totalPulls || 1,
          basePulls: data?.basePulls || 1,
          bonusPulls: data?.bonusPulls || 0,
          triggerType: data?.triggerType || 'manual'
        });
        confetti({
          particleCount: (data?.totalPulls || 1) > 1 ? 130 : 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 3500);
    };

    socket.on('spin_roulette', onSpin);
    return () => {
      socket.off('spin_roulette', onSpin);
    };
  }, []);

  // 룰렛 확률 합계 계산
  const totalChance = useMemo(() => {
    return rouletteItems.reduce((acc, it) => acc + (Number(it.chance) || 0), 0);
  }, [rouletteItems]);

  // 룰렛 휠 CSS conic-gradient 계산
  const conicGradient = useMemo(() => {
    if (rouletteItems.length === 0) return '#334155';
    const sum = totalChance || 100;
    let currentAcc = 0;
    const parts = rouletteItems.map(it => {
      const start = (currentAcc / sum) * 100;
      currentAcc += (Number(it.chance) || 0);
      const end = (currentAcc / sum) * 100;
      return `${it.color} ${start}% ${end}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }, [rouletteItems, totalChance]);

  // 테스트 스핀 실행 (1회 or 다중 연차)
  const handleSpinRoulette = async (pulls = 1) => {
    if (isSpinning || rouletteItems.length === 0) return;
    try {
      const res = await api.spinRoulette(settings?.streamerName || '스트리머', pulls);
      const data = res.data;
      if (data?.readResultTts !== false && rSettings.readResultTts) {
        setTimeout(() => {
          const summaryStr = Array.isArray(data?.resultsSummary) && data.resultsSummary.length > 0
            ? data.resultsSummary.map((s: any) => `${s.name} ${s.count}개`).join(', ')
            : data?.winner;
          speakRouletteResult(`룰렛 당첨 결과! ${summaryStr}`, true);
        }, 3600);
      }
    } catch (e: any) {
      alert('룰렛 실행 실패: ' + (e.message || '오류'));
    }
  };

  // 룰렛 설정 전체 저장
  const handleSaveRoulette = async () => {
    try {
      await api.updateRoulette({
        items: rouletteItems,
        cost: Number(rouletteCost),
        currency: 'chips',
        settings: rSettings
      });
      setRouletteSaved(true);
      setTimeout(() => setRouletteSaved(false), 2500);
    } catch (e: any) {
      alert('룰렛 저장 실패: ' + e.message);
    }
  };

  const updateRSetting = <K extends keyof RouletteTriggerSettings>(
    key: K,
    val: RouletteTriggerSettings[K]
  ) => {
    setRSettings(prev => ({ ...prev, [key]: val }));
  };

  // 룰렛 아이템 추가/수정/삭제
  const handleAddRouletteItem = () => {
    const newItem: RouletteItem = {
      id: 'r-' + Date.now(),
      name: '새 상품',
      chance: 10,
      color: COLOR_PRESETS[rouletteItems.length % COLOR_PRESETS.length]
    };
    setRouletteItems([...rouletteItems, newItem]);
  };

  const handleUpdateRouletteItem = (index: number, field: keyof RouletteItem, value: any) => {
    const next = [...rouletteItems];
    next[index] = { ...next[index], [field]: value };
    setRouletteItems(next);
  };

  const handleDeleteRouletteItem = (index: number) => {
    if (rouletteItems.length <= 1) {
      alert('최소 1개 이상의 항목이 필요합니다.');
      return;
    }
    setRouletteItems(rouletteItems.filter((_, i) => i !== index));
  };

  const handleEvenDistribution = () => {
    if (rouletteItems.length === 0) return;
    const base = Math.floor(100 / rouletteItems.length);
    const remainder = 100 % rouletteItems.length;
    const next = rouletteItems.map((it, idx) => ({
      ...it,
      chance: idx === 0 ? base + remainder : base
    }));
    setRouletteItems(next);
  };

  const handleFillRemainderWithLoss = () => {
    const diff = 100 - totalChance;
    if (diff === 0) return;

    const lossIdx = rouletteItems.findIndex(it => it.name.includes('꽝') || it.name.includes('다음'));
    if (lossIdx >= 0) {
      const next = [...rouletteItems];
      const newChance = Math.max(0, (next[lossIdx].chance || 0) + diff);
      next[lossIdx].chance = newChance;
      setRouletteItems(next);
    } else {
      setRouletteItems([
        ...rouletteItems,
        { id: 'r-' + Date.now(), name: '꽝 (다음 기회에)', chance: Math.max(1, diff), color: '#6b7280' }
      ]);
    }
  };

  const handleApplyPreset = (preset: typeof ROULETTE_PRESETS[0]) => {
    if (confirm(`'${preset.name}' 템플릿으로 변경하시겠습니까?`)) {
      setRouletteItems(preset.items);
      setRouletteCost(preset.cost);
    }
  };

  const isSubAnyEnabled = rSettings.subEnabled || rSettings.subGiftEnabled;
  const bonusN = Math.max(1, Number(rSettings.bonusEveryN) || 10);
  const bonusM = Math.max(1, Number(rSettings.bonusAddM) || 1);

  const getTriggerLabel = (t?: string) => {
    if (t === 'donation') return '🧀 후원';
    if (t === 'subscription') return '👑 구독';
    if (t === 'subscription_gift') return '🎁 구독선물';
    if (t === 'command') return '⌨️ 명령어';
    return '🎯 테스트';
  };

  return (
    <div className="space-y-6">
      {/* 상단 헤더 & 저장 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 shadow-lg">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Dices className="w-5 h-5 text-amber-400" />
            행운의 룰렛 & 트리거 상세 설정
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
              rSettings.enabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              {rSettings.enabled ? '● 작동 중' : '○ 비활성화됨'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            명령어({cUnit}) · 치지직 치즈 후원 · 구독/구독선물 트리거와 다중 연차·보너스·TTS를 세밀하게 설정합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 mr-1">
            <span className="font-bold text-slate-300">프리셋:</span>
            {ROULETTE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 border border-white/5 transition-all text-[11px] font-bold cursor-pointer"
              >
                {p.name.split(' ')[1]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSaveRoulette}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {rouletteSaved ? (
              <>
                <Check className="w-4 h-4" /> 설정 저장 완료!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> 룰렛 설정 저장하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* 메인 3컬럼 그리드: 1) 룰렛 휠 & 테스트 / 2) 상품 및 확률 / 3) 트리거 & 연차 상세 설정 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* 1열: 룰렛 휠 시각화 & 다중 연차 결과 (4 cols) */}
        <div className="xl:col-span-4 space-y-5">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
            {/* 상단 화살표 포인터 */}
            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 z-20 -mb-4 drop-shadow-lg" />

            {/* 룰렛 원형 휠 */}
            <div className="relative w-60 h-60 sm:w-68 sm:h-68 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden flex items-center justify-center bg-slate-950">
              <div
                style={{
                  background: conicGradient,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 3.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none'
                }}
                className="w-full h-full rounded-full relative"
              >
                {(() => {
                  let acc = 0;
                  const sum = totalChance || 100;
                  return rouletteItems.map((item) => {
                    const sliceAngle = ((Number(item.chance) || 0) / sum) * 360;
                    const midAngle = acc + sliceAngle / 2;
                    acc += sliceAngle;

                    return (
                      <div
                        key={item.id}
                        style={{
                          transform: `rotate(${midAngle}deg)`,
                          transformOrigin: '50% 50%'
                        }}
                        className="absolute inset-0 flex items-start justify-center pt-3 pointer-events-none"
                      >
                        <span className="bg-slate-950/85 text-white font-black px-1.5 py-0.5 rounded text-[10px] shadow border border-white/10 max-w-[82px] truncate select-none">
                          {item.name}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* 중앙 캡 */}
              <div className="absolute w-14 h-14 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-black text-xs shadow-xl select-none tracking-wider">
                SPIN
              </div>
            </div>

            {/* 당첨 결과 & 다중 연차 집계 표시 */}
            {winnerItem && (
              <div className="mt-5 w-full p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-center space-y-2 animate-fade-in">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-200">
                  {lastSpinMeta?.user && <span>[{lastSpinMeta.user}]</span>}
                  {lastSpinMeta?.triggerType && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-950/70 text-amber-300 text-[10px]">
                      {getTriggerLabel(lastSpinMeta.triggerType)}
                    </span>
                  )}
                  {(lastSpinMeta?.totalPulls || 1) > 1 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                      총 {lastSpinMeta?.totalPulls}연차
                      {(lastSpinMeta?.bonusPulls || 0) > 0 ? ` (보너스 +${lastSpinMeta?.bonusPulls})` : ''}
                    </span>
                  )}
                </div>

                <div className="text-amber-300 font-black text-sm">
                  🎉 대표 당첨: {winnerItem}
                </div>

                {spinSummary.length > 1 || (lastSpinMeta?.totalPulls || 1) > 1 ? (
                  <div className="pt-2 border-t border-amber-500/20 flex flex-wrap justify-center gap-1.5">
                    {spinSummary.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-[11px] font-bold text-white flex items-center gap-1"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color || '#f59e0b' }} />
                        <span>{s.name}</span>
                        <span className="text-amber-400 font-black">x{s.count}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* 테스트 스핀 버튼 모음 */}
            <div className="mt-5 w-full grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSpinRoulette(1)}
                disabled={isSpinning || rouletteItems.length === 0}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 fill-slate-950 ${isSpinning ? 'animate-spin' : ''}`} />
                1회 테스트 스핀
              </button>

              <button
                type="button"
                onClick={() => handleSpinRoulette(10)}
                disabled={isSpinning || rouletteItems.length === 0}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-black text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                10연차 테스트
              </button>
            </div>
          </div>

          {/* 최근 당첨 히스토리 카드 */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                최근 룰렛 당첨 내역
              </h4>
              <span className="text-[10px] text-slate-500">최근 10건</span>
            </div>

            {!roulette.history || roulette.history.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                아직 당첨 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[210px] overflow-y-auto pr-1 text-[11px]">
                {roulette.history.slice(0, 10).map((h, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-2 text-slate-300"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                        {getTriggerLabel(h.triggerType)}
                      </span>
                      <span className="font-bold text-amber-300 truncate">{h.user}</span>
                    </div>
                    <span className="text-white font-semibold truncate flex-1 text-right">{h.prize}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {new Date(h.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2열: 룰렛 상품 및 확률 설정 (4 cols) */}
        <div className="xl:col-span-4 p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">룰렛 상품 및 확률</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                totalChance === 100
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                합계: {totalChance}% {totalChance === 100 ? '✓' : '(100% 권장)'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddRouletteItem}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> 상품 추가
            </button>
          </div>

          {totalChance !== 100 && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-xs text-rose-300">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                확률 합계 {totalChance}% (차이: {100 - totalChance}%)
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleFillRemainderWithLoss}
                  className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-rose-200 cursor-pointer"
                >
                  꽝 채우기
                </button>
                <button
                  type="button"
                  onClick={handleEvenDistribution}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer"
                >
                  균등 분배
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {rouletteItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 rounded-xl bg-slate-950/70 border border-white/5 flex items-center gap-2.5 text-xs hover:border-white/10 transition-colors"
              >
                <input
                  type="color"
                  value={item.color}
                  onChange={(e) => handleUpdateRouletteItem(idx, 'color', e.target.value)}
                  className="w-6 h-6 rounded-full overflow-hidden border border-white/20 cursor-pointer shrink-0"
                  title="색상 변경"
                />

                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateRouletteItem(idx, 'name', e.target.value)}
                    placeholder="상품명 입력"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-bold"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={item.chance}
                    onChange={(e) => handleUpdateRouletteItem(idx, 'chance', Number(e.target.value))}
                    className="w-14 px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-amber-300 font-mono text-right focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <span className="text-slate-400 font-bold text-[11px]">%</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteRouletteItem(idx)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0 cursor-pointer"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 leading-relaxed">
            💡 다중 연차(예: 10연차 + 1 보너스) 발동 시 휠은 <b className="text-amber-300">가장 희귀한(확률이 낮은) 당첨 상품</b>을 향해 1회 대표 회전하며, 전체 당첨 집계표가 화면과 채팅에 함께 표시됩니다.
          </div>
        </div>

        {/* 3열: 트리거 설정 (명령어 / 후원 / 구독) & 연차·결과 상세 설정 (4 cols) */}
        <div className="xl:col-span-4 p-5 rounded-2xl bg-[#141517] border border-white/10 shadow-2xl space-y-5 text-xs">
          {/* 1. 마스터 활성화 토글 */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <div className="text-sm font-black text-white">활성화</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                끄면 명령어·후원·구독으로 작동하지 않아요
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateRSetting('enabled', !rSettings.enabled)}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                rSettings.enabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  rSettings.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. 트리거 설정 (명령어 | 후원 | 구독 탭) */}
          <div className="space-y-4 pb-4 border-b border-white/10">
            <div className="text-xs font-extrabold text-slate-300">트리거 설정</div>

            {/* 3분할 세그먼트 탭 */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#222428] border border-white/5">
              <button
                type="button"
                onClick={() => setTriggerTab('command')}
                className={`py-2 px-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  triggerTab === 'command'
                    ? 'bg-[#121316] text-amber-400 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>명령어</span>
                {!rSettings.commandEnabled && (
                  <span className="text-[10px] font-semibold text-slate-500">꺼짐</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTriggerTab('donation')}
                className={`py-2 px-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  triggerTab === 'donation'
                    ? 'bg-[#121316] text-amber-400 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>후원</span>
                {!rSettings.donationEnabled && (
                  <span className="text-[10px] font-semibold text-slate-500">꺼짐</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTriggerTab('subscription')}
                className={`py-2 px-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  triggerTab === 'subscription'
                    ? 'bg-[#121316] text-amber-400 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>구독</span>
                {!isSubAnyEnabled && (
                  <span className="text-[10px] font-semibold text-slate-500">꺼짐</span>
                )}
              </button>
            </div>

            {/* 탭 1: 명령어 설정 */}
            {triggerTab === 'command' && (
              <div className="space-y-4 pt-1 animate-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      명령어로 작동
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      연결한 명령어를 채팅에 치면 돌아가요
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRSetting('commandEnabled', !rSettings.commandEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      rSettings.commandEnabled ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        rSettings.commandEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400">연결 명령어</label>
                  <select
                    value={rSettings.commandTrigger || fullRouletteCmd}
                    onChange={(e) => updateRSetting('commandTrigger', e.target.value)}
                    disabled={!rSettings.commandEnabled}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400 disabled:opacity-40"
                  >
                    <option value={fullRouletteCmd}>{fullRouletteCmd} (기본 내장 룰렛 명령어)</option>
                    {commands.map((c) => {
                      const fullCustomTrigger = c.name.startsWith(prefix) ? c.name : `${prefix}${c.name}`;
                      return (
                        <option key={c.id} value={fullCustomTrigger}>
                          {fullCustomTrigger} (커스텀 명령어)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <div className="font-bold text-white text-xs">1회 회전 비용 ({cUnit})</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      예: {rSettings.commandTrigger || fullRouletteCmd} 10 입력 시 {(rouletteCost * 10).toLocaleString()}{cUnit} 차감
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={rouletteCost}
                    onChange={(e) => setRouletteCost(Math.max(0, Number(e.target.value)))}
                    disabled={!rSettings.commandEnabled}
                    className="w-28 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold text-right focus:outline-none focus:border-amber-400 disabled:opacity-40"
                  />
                </div>
              </div>
            )}

            {/* 탭 2: 후원 설정 */}
            {triggerTab === 'donation' && (
              <div className="space-y-3.5 pt-1 animate-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-xs">후원으로 작동</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      룰렛 가격만큼 후원하면 돌아가요
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRSetting('donationEnabled', !rSettings.donationEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      rSettings.donationEnabled ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        rSettings.donationEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <div>
                    <div className="font-bold text-white text-xs">룰렛 가격</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">이 금액(치즈)을 후원하면 작동</div>
                  </div>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={rSettings.donationUnitCheese}
                    onChange={(e) => updateRSetting('donationUnitCheese', Math.max(1, Number(e.target.value)))}
                    disabled={!rSettings.donationEnabled}
                    className="w-32 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400 disabled:opacity-40"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <div>
                    <div className="font-bold text-white text-xs">최대 후원 금액</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">이 금액을 넘으면 무시 (0 = 상한 없음)</div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={rSettings.donationMaxCheese}
                    onChange={(e) => updateRSetting('donationMaxCheese', Math.max(0, Number(e.target.value)))}
                    disabled={!rSettings.donationEnabled}
                    className="w-32 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400 disabled:opacity-40"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <div>
                    <div className="font-bold text-white text-xs">배수가 아니어도 작동</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      가능한 만큼 돌리고 남는 금액은 무시 (4,000원 룰렛에 12,300원 → 3연차)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRSetting('donationAllowNonMultiple', !rSettings.donationAllowNonMultiple)}
                    disabled={!rSettings.donationEnabled}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                      rSettings.donationAllowNonMultiple ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        rSettings.donationAllowNonMultiple ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <div className="shrink-0">
                    <div className="font-bold text-white text-xs">후원 메시지 포함</div>
                  </div>
                  <input
                    type="text"
                    placeholder="(선택사항)"
                    value={rSettings.donationMessageKeyword}
                    onChange={(e) => updateRSetting('donationMessageKeyword', e.target.value)}
                    disabled={!rSettings.donationEnabled}
                    className="w-40 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-40"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <div>
                    <div className="font-bold text-amber-300 text-xs">룰렛 작동 치즈도 {cUnit} 동시 적립</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      끄면 후원 룰렛에 사용된 치즈는 {cUnit} 자동 적립에서 제외됩니다
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRSetting('donationAlsoEarnChips', !rSettings.donationAlsoEarnChips)}
                    disabled={!rSettings.donationEnabled}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                      rSettings.donationAlsoEarnChips ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        rSettings.donationAlsoEarnChips ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 탭 3: 구독 설정 */}
            {triggerTab === 'subscription' && (
              <div className="space-y-3.5 pt-1 animate-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      구독으로 작동
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      시청자가 구독하면 1회 돌아가요 (연차 제한·보너스와 상관없이 1회)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRSetting('subEnabled', !rSettings.subEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      rSettings.subEnabled ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        rSettings.subEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <div className="font-bold text-white text-xs">구독 티어</div>
                  <select
                    value={rSettings.subTier}
                    onChange={(e: any) => updateRSetting('subTier', e.target.value)}
                    disabled={!rSettings.subEnabled}
                    className="w-36 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400 disabled:opacity-40"
                  >
                    <option value="all">모든 티어</option>
                    <option value="tier1">티어 1</option>
                    <option value="tier2">티어 2</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div>
                    <div className="font-bold text-white text-xs">구독선물로 작동</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      구독을 선물하면 선물 수마다 1회 돌아가요 (랜덤·지정 선물 모두, 익명은 익명으로 표시)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRSetting('subGiftEnabled', !rSettings.subGiftEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      rSettings.subGiftEnabled ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        rSettings.subGiftEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <div className="font-bold text-slate-300 text-xs">선물한 구독 티어</div>
                  <select
                    value={rSettings.subGiftTier}
                    onChange={(e: any) => updateRSetting('subGiftTier', e.target.value)}
                    disabled={!rSettings.subGiftEnabled}
                    className="w-36 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400 disabled:opacity-40"
                  >
                    <option value="all">모든 티어</option>
                    <option value="tier1">티어 1</option>
                    <option value="tier2">티어 2</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                  <div>
                    <div className="font-bold text-slate-300 text-xs">선물 수</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      이 개수마다 1회 (5 → 12개 선물은 2회, 4개는 안 돌아요)
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={rSettings.subGiftCountPerSpin}
                    onChange={(e) => updateRSetting('subGiftCountPerSpin', Math.max(1, Number(e.target.value)))}
                    disabled={!rSettings.subGiftEnabled}
                    className="w-32 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400 disabled:opacity-40"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. 연차 · 결과 설정 */}
          <div className="space-y-4">
            <div className="text-xs font-extrabold text-slate-300">연차 · 결과</div>

            {/* 최대 연차 횟수 vs 지정 연차 횟수 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#222428] border border-white/5">
                <button
                  type="button"
                  onClick={() => updateRSetting('pullLimitMode', 'max')}
                  className={`py-2 px-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                    rSettings.pullLimitMode === 'max'
                      ? 'bg-[#121316] text-amber-400 shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  최대 연차 횟수
                </button>
                <button
                  type="button"
                  onClick={() => updateRSetting('pullLimitMode', 'fixed')}
                  className={`py-2 px-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                    rSettings.pullLimitMode === 'fixed'
                      ? 'bg-[#121316] text-amber-400 shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  지정 연차 횟수
                </button>
              </div>
              <span title="연차 제한 방식을 선택합니다: 최대 상한선을 두거나 지정된 연차(예: 1, 5, 10)만 허용할 수 있습니다.">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
              </span>
            </div>

            {rSettings.pullLimitMode === 'max' ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400 font-semibold">0 = 제한 없음</span>
                <input
                  type="number"
                  min="0"
                  value={rSettings.maxPullCount}
                  onChange={(e) => updateRSetting('maxPullCount', Math.max(0, Number(e.target.value)))}
                  className="w-40 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400 font-semibold">허용 연차 (쉼표 구분)</span>
                <input
                  type="text"
                  placeholder="예: 1, 5, 10"
                  value={rSettings.fixedPullCounts}
                  onChange={(e) => updateRSetting('fixedPullCounts', e.target.value)}
                  className="w-40 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {/* 연차 보너스 */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div>
                <div className="font-bold text-white text-xs">연차 보너스</div>
                <div className="text-[11px] text-slate-400 mt-0.5">n연차마다 m회 무료 추가</div>
              </div>
              <button
                type="button"
                onClick={() => updateRSetting('bonusEnabled', !rSettings.bonusEnabled)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  rSettings.bonusEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    rSettings.bonusEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {rSettings.bonusEnabled && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-white text-xs">발동 연차 (n)</span>
                  <input
                    type="number"
                    min="2"
                    value={rSettings.bonusEveryN}
                    onChange={(e) => updateRSetting('bonusEveryN', Math.max(2, Number(e.target.value)))}
                    className="w-32 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-white text-xs">보너스 횟수 (m)</span>
                  <input
                    type="number"
                    min="1"
                    value={rSettings.bonusAddM}
                    onChange={(e) => updateRSetting('bonusAddM', Math.max(1, Number(e.target.value)))}
                    className="w-32 px-3 py-2 rounded-xl bg-[#222428] border border-white/10 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {bonusN}연차마다 {bonusM}회를 무료로 더 돌립니다. 예: {bonusN}연차는 총 {bonusN + bonusM}회, {bonusN * 2}연차는 총 {(bonusN + bonusM) * 2}회. n보다 적은 연차에는 붙지 않습니다.
                </p>
              </div>
            )}

            {/* 결과를 채팅으로 송신 */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  결과를 채팅으로 송신
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">연차는 집계해서 1회만 보냅니다</div>
              </div>
              <button
                type="button"
                onClick={() => updateRSetting('sendResultToChat', !rSettings.sendResultToChat)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  rSettings.sendResultToChat ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    rSettings.sendResultToChat ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 결과 TTS 읽기 */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  결과 TTS 읽기
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  오버레이에서 당첨 항목을 소리내어 읽어줍니다
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateRSetting('readResultTts', !rSettings.readResultTts)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  rSettings.readResultTts ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    rSettings.readResultTts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
