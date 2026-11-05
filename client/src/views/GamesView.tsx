import React, { useState, useEffect, useMemo } from 'react';
import {
  Dices, Play, Gift, Sparkles, RefreshCw, Plus, Trash2, Edit3, Save,
  Check, AlertCircle, Palette, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RouletteState, RouletteItem, Settings } from '../types';
import { api } from '../services/api';

interface GamesViewProps {
  roulette: RouletteState;
  settings?: Settings;
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
      { id: 'p1-4', name: '포인트 500P 반환', chance: 30, color: '#10b981' },
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

// 자주 쓰는 컬러 팔레트 칩
const COLOR_PRESETS = [
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
  '#3b82f6', '#06b6d4', '#10b981', '#6b7280'
];

export const GamesView: React.FC<GamesViewProps> = ({ roulette, settings }) => {
  const pUnit = settings?.pointName || 'P';
  const cUnit = settings?.chipName || '칩';

  // --- 룰렛 상태 ---
  const [rouletteItems, setRouletteItems] = useState<RouletteItem[]>(roulette.items || []);
  const [rouletteCost, setRouletteCost] = useState<number>(roulette.cost || 500);
  const [rouletteCurrency, setRouletteCurrency] = useState<'points' | 'chips'>(roulette.currency || 'points');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winnerItem, setWinnerItem] = useState<string | null>(null);
  const [rouletteSaved, setRouletteSaved] = useState(false);
  const [isRouletteEditMode, setIsRouletteEditMode] = useState(false);

  // 동기화
  useEffect(() => {
    if (roulette.items) setRouletteItems(roulette.items);
    if (roulette.cost) setRouletteCost(roulette.cost);
    if (roulette.currency) setRouletteCurrency(roulette.currency);
  }, [roulette]);

  // 룰렛 확률 합계 계산
  const totalChance = useMemo(() => {
    return rouletteItems.reduce((acc, it) => acc + (Number(it.chance) || 0), 0);
  }, [rouletteItems]);

  // 룰렛 휠 CSS conic-gradient 계산 (비율 정확 반영)
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

  // 룰렛 스핀
  const handleSpinRoulette = async () => {
    if (isSpinning || rouletteItems.length === 0) return;
    setIsSpinning(true);
    setWinnerItem(null);

    try {
      const res = await api.spinRoulette('스트리머');
      const data = res.data;
      const targetAngle = data?.targetAngle !== undefined ? data.targetAngle : Math.floor(Math.random() * 360);
      const winnerName = data?.winner || (data?.item?.name ?? '당첨');

      // 5바퀴 회전 후 타겟 각도 정렬
      const extraSpins = 360 * 5;
      const totalRot = rotation + extraSpins + targetAngle;
      setRotation(totalRot);

      setTimeout(() => {
        setIsSpinning(false);
        setWinnerItem(winnerName);
        confetti({
          particleCount: 90,
          spread: 65,
          origin: { y: 0.6 }
        });
      }, 3500);
    } catch (e) {
      // 로컬 스핀 fallback
      const rand = Math.random() * (totalChance || 100);
      let acc = 0;
      let selected = rouletteItems[rouletteItems.length - 1];
      let sliceStart = 0;
      let sliceEnd = 100;
      for (const it of rouletteItems) {
        const start = (acc / (totalChance || 100)) * 100;
        acc += Number(it.chance) || 0;
        const end = (acc / (totalChance || 100)) * 100;
        if (rand <= acc) {
          selected = it;
          sliceStart = start;
          sliceEnd = end;
          break;
        }
      }
      const midAngle = ((sliceStart + sliceEnd) / 2 / 100) * 360;
      const targetAngle = (360 - midAngle) % 360;
      const totalRot = rotation + 360 * 5 + targetAngle;
      setRotation(totalRot);

      setTimeout(() => {
        setIsSpinning(false);
        setWinnerItem(selected.name);
        confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });
      }, 3500);
    }
  };

  // 룰렛 저장
  const handleSaveRoulette = async () => {
    try {
      await api.updateRoulette({
        items: rouletteItems,
        cost: Number(rouletteCost),
        currency: rouletteCurrency
      });
      setRouletteSaved(true);
      setTimeout(() => setRouletteSaved(false), 2500);
    } catch (e: any) {
      alert('룰렛 저장 실패: ' + e.message);
    }
  };

  // 룰렛 아이템 추가
  const handleAddRouletteItem = () => {
    const newItem: RouletteItem = {
      id: 'r-' + Date.now(),
      name: '새 상품',
      chance: 10,
      color: COLOR_PRESETS[rouletteItems.length % COLOR_PRESETS.length]
    };
    setRouletteItems([...rouletteItems, newItem]);
  };

  // 룰렛 아이템 수정
  const handleUpdateRouletteItem = (index: number, field: keyof RouletteItem, value: any) => {
    const next = [...rouletteItems];
    next[index] = { ...next[index], [field]: value };
    setRouletteItems(next);
  };

  // 룰렛 아이템 삭제
  const handleDeleteRouletteItem = (index: number) => {
    if (rouletteItems.length <= 1) {
      alert('최소 1개 이상의 항목이 필요합니다.');
      return;
    }
    setRouletteItems(rouletteItems.filter((_, i) => i !== index));
  };

  // 100% 균등 분배
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

  // 꽝으로 100% 맞추기
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

  // 프리셋 로드
  const handleApplyPreset = (preset: typeof ROULETTE_PRESETS[0]) => {
    if (confirm(`'${preset.name}' 템플릿으로 변경하시겠습니까?`)) {
      setRouletteItems(preset.items);
      setRouletteCost(preset.cost);
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Dices className="w-5 h-5 text-amber-400" />
            행운의 룰렛
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            시청자들이 포인트 또는 칩으로 참여하는 행운의 룰렛 게임의 상품 및 확률을 설정합니다.
          </p>
        </div>
      </div>

      <div className="space-y-6">
          {/* 상단 룰렛 제어 바 */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex flex-wrap items-center gap-3">
              {/* 사용 재화 선택 토글 */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setRouletteCurrency('points')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    rouletteCurrency === 'points'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🧀 유료 포인트({pUnit})
                </button>
                <button
                  type="button"
                  onClick={() => setRouletteCurrency('chips')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    rouletteCurrency === 'chips'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🪙 활동 칩({cUnit})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">1회 참여 비용:</span>
                <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-white/10">
                  <input
                    type="number"
                    value={rouletteCost}
                    onChange={(e) => setRouletteCost(Math.max(0, Number(e.target.value)))}
                    className="w-16 bg-transparent text-xs font-black text-amber-300 text-right focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">{rouletteCurrency === 'points' ? pUnit : cUnit}</span>
                </div>
              </div>

              {/* 편집 모드 토글 */}
              <button
                type="button"
                onClick={() => setIsRouletteEditMode(!isRouletteEditMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isRouletteEditMode
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isRouletteEditMode ? '편집 완료 / 플레이 모드' : '룰렛 항목 편집하기'}
              </button>
            </div>

            {/* 템플릿 프리셋 & 저장 버튼 */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300">템플릿:</span>
                {ROULETTE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 border border-white/5 transition-all text-[10px] font-bold"
                  >
                    {p.name.split(' ')[1]}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSaveRoulette}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                {rouletteSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> 저장 완료!
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> 설정 저장
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 룰렛 휠 시각화 (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/70 border border-white/10 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
              {/* 상단 화살표 포인터 */}
              <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 z-20 -mb-4 drop-shadow-lg"></div>

              {/* 룰렛 원형 휠 (Pro Conic-Gradient) */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden flex items-center justify-center bg-slate-950">
                <div
                  style={{
                    background: conicGradient,
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 3.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none'
                  }}
                  className="w-full h-full rounded-full relative"
                >
                  {/* 슬라이스 텍스트 라벨 (중심 각도에 방사형 배치) */}
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
                          <span className="bg-slate-950/80 text-white font-black px-1.5 py-0.5 rounded text-[10px] shadow border border-white/10 max-w-[80px] truncate select-none">
                            {item.name}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* 중앙 엠블럼 캡 */}
                <div className="absolute w-14 h-14 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-black text-xs shadow-xl select-none tracking-wider">
                  SPIN
                </div>
              </div>

              {/* 당첨 결과 배너 */}
              {winnerItem && (
                <div className="mt-5 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-sm animate-bounce text-center">
                  🎉 당첨 결과: {winnerItem}
                </div>
              )}

              {/* 룰렛 돌리기 버튼 */}
              <div className="mt-5 w-full flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleSpinRoulette}
                  disabled={isSpinning || rouletteItems.length === 0}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 fill-slate-950 ${isSpinning ? 'animate-spin' : ''}`} />
                  {isSpinning ? '룰렛 회전 중...' : `룰렛 돌리기! (${rouletteCost}P)`}
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  💡 시청자는 방송 채팅창에 <span className="text-amber-300 font-mono">!룰렛</span> 을 입력하여 참여할 수 있습니다.
                </p>
              </div>
            </div>

            {/* 룰렛 항목 목록 & 편집 패널 (7 cols) */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">룰렛 상품 및 확률 설정</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    totalChance === 100
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    총 확률: {totalChance}% {totalChance === 100 ? '✓' : '(100% 권장)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddRouletteItem}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> 상품 추가
                </button>
              </div>

              {/* 확률 조정 도우미 버튼 */}
              {totalChance !== 100 && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    현재 확률 합계가 {totalChance}% 입니다. (차이: {100 - totalChance}%)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleFillRemainderWithLoss}
                      className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-rose-200"
                    >
                      꽝으로 채우기
                    </button>
                    <button
                      type="button"
                      onClick={handleEvenDistribution}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200"
                    >
                      균등 분배
                    </button>
                  </div>
                </div>
              )}

              {/* 항목 리스트 */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {rouletteItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl bg-slate-950/70 border border-white/5 flex items-center gap-3 text-xs"
                  >
                    {/* 색상 선택 (동그라미 칩) */}
                    <div className="relative group shrink-0">
                      <input
                        type="color"
                        value={item.color}
                        onChange={(e) => handleUpdateRouletteItem(idx, 'color', e.target.value)}
                        className="w-6 h-6 rounded-full overflow-hidden border border-white/20 cursor-pointer"
                        title="색상 변경"
                      />
                    </div>

                    {/* 상품명 */}
                    <div className="flex-1 min-w-[120px]">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateRouletteItem(idx, 'name', e.target.value)}
                        placeholder="상품명 입력"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-bold"
                      />
                    </div>

                    {/* 확률 입력 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.chance}
                        onChange={(e) => handleUpdateRouletteItem(idx, 'chance', Number(e.target.value))}
                        className="w-14 px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-amber-300 font-mono text-right focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <span className="text-slate-400 font-bold text-[11px]">%</span>
                    </div>

                    {/* 삭제 */}
                    <button
                      type="button"
                      onClick={() => handleDeleteRouletteItem(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* 최근 당첨 히스토리 */}
              {roulette.history && roulette.history.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">최근 룰렛 당첨 내역</h4>
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto text-[11px]">
                    {roulette.history.slice(0, 5).map((h, i) => (
                      <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-950/40 border border-white/5 flex items-center justify-between text-slate-300">
                        <span className="font-bold text-amber-300">{h.user}</span>
                        <span className="text-white font-medium">{h.prize}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(h.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};
