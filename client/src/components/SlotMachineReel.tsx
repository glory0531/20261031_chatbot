import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RouletteItem } from '../types';

interface SlotMachineReelProps {
  items: RouletteItem[];
  winnerName: string | null;
  spinTrigger: number;
  isSpinning: boolean;
  className?: string;
}

const ITEM_HEIGHT = 64;
const REPEAT_COUNT = 10;

export const SlotMachineReel: React.FC<SlotMachineReelProps> = ({
  items,
  winnerName,
  spinTrigger,
  isSpinning,
  className = ''
}) => {
  const safeItems = useMemo<RouletteItem[]>(() => {
    if (items && items.length > 0) return items;
    return [{ id: 'empty', name: '상품을 추가하세요', chance: 100, color: '#f59e0b' }];
  }, [items]);

  // 릴 스트립: 상품을 충분히 반복해 빠른 세로 스크롤 구현
  const reelStrip = useMemo(() => {
    const arr: RouletteItem[] = [];
    for (let r = 0; r < REPEAT_COUNT; r++) {
      for (const it of safeItems) {
        arr.push(it);
      }
    }
    return arr;
  }, [safeItems]);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const safeItemsRef = useRef<RouletteItem[]>(safeItems);
  safeItemsRef.current = safeItems;

  const winnerNameRef = useRef<string | null>(winnerName);
  winnerNameRef.current = winnerName;

  const [translateY, setTranslateY] = useState<number>(-(safeItems.length - 1) * ITEM_HEIGHT);
  const [animateTransition, setAnimateTransition] = useState<boolean>(false);
  const prevTriggerRef = useRef<number>(0);

  useEffect(() => {
    if (spinTrigger === 0 || spinTrigger === prevTriggerRef.current) return;
    prevTriggerRef.current = spinTrigger;

    const currentItems = safeItemsRef.current;
    const targetName = winnerNameRef.current;
    const winnerIdx = targetName
      ? currentItems.findIndex((it) => it.name === targetName)
      : 0;
    const resolvedIdx = winnerIdx >= 0 ? winnerIdx : 0;

    // 1. 트랜지션 없이 상단(2번째 루프 시작점) 위치로 즉시 리셋
    const startIdx = Math.max(1, currentItems.length + resolvedIdx);
    setAnimateTransition(false);
    setTranslateY(-(startIdx - 1) * ITEM_HEIGHT);

    // 2. 브라우저가 리셋된 위치를 확실히 그린 뒤(강제 reflow + 35ms) 목표 루프로 회전 시작
    const timer = window.setTimeout(() => {
      if (stripRef.current) {
        void stripRef.current.offsetHeight;
      }
      const targetLoop = REPEAT_COUNT - 2;
      const targetIndex = targetLoop * currentItems.length + resolvedIdx;
      setAnimateTransition(true);
      setTranslateY(-(targetIndex - 1) * ITEM_HEIGHT);
    }, 35);

    return () => window.clearTimeout(timer);
  }, [spinTrigger]);

  // 상품 목록 길이가 바뀔 때(초기 로드/편집 중, 스핀 중이 아닐 때만) 위치 보정
  useEffect(() => {
    if (!isSpinning && spinTrigger === 0) {
      setAnimateTransition(false);
      setTranslateY(-(safeItems.length - 1) * ITEM_HEIGHT);
    }
  }, [safeItems.length, isSpinning, spinTrigger]);

  return (
    <div className={`w-full max-w-md mx-auto select-none ${className}`}>
      {/* 슬롯 머신 외곽 프레임 */}
      <div className="relative rounded-3xl p-3 bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-amber-500/30 border-2 border-amber-400/60 shadow-[0_0_35px_rgba(245,158,11,0.2)]">
        {/* 상단 상태 바 */}
        <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-black tracking-widest uppercase">
          <span className="text-amber-300 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isSpinning ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
            {isSpinning ? 'SPINNING...' : 'SLOT READY'}
          </span>
          <span className="text-amber-200/70">LUCKY SLOT</span>
        </div>

        {/* 릴 뷰포트 (3칸 높이 = 192px, 가운데 칸이 당첨 라인) */}
        <div
          className="relative overflow-hidden rounded-2xl bg-slate-950 border border-white/15 shadow-inner"
          style={{ height: `${ITEM_HEIGHT * 3}px` }}
        >
          {/* 중앙 당첨 하이라이트 라인 */}
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none border-y-2 border-amber-400/90 bg-amber-400/10 shadow-[inset_0_0_16px_rgba(245,158,11,0.18)]"
            style={{ top: `${ITEM_HEIGHT}px`, height: `${ITEM_HEIGHT}px` }}
          >
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[7px] border-y-transparent border-l-[10px] border-l-amber-400 drop-shadow" />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[7px] border-y-transparent border-r-[10px] border-r-amber-400 drop-shadow" />
          </div>

          {/* 상·하단 그라데이션 페이드 마스크 */}
          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-slate-950/95 via-slate-950/60 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent z-10 pointer-events-none" />

          {/* 움직이는 세로 릴 스트립 */}
          <div
            ref={stripRef}
            style={{
              transform: `translateY(${translateY}px)`,
              transition: animateTransition ? 'transform 3.3s cubic-bezier(0.12, 0.88, 0.22, 1)' : 'none',
              willChange: 'transform'
            }}
          >
            {reelStrip.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                style={{ height: `${ITEM_HEIGHT}px` }}
                className="px-6 flex items-center justify-between gap-3 border-b border-white/[0.04]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white/20 shadow"
                    style={{ backgroundColor: item.color || '#f59e0b' }}
                  />
                  <span className="font-black text-base sm:text-lg text-white truncate tracking-tight">
                    {item.name}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-300/80 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-white/10 shrink-0">
                  {item.chance}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
