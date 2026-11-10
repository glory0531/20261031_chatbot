import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { socket } from '../services/socket';
import { RouletteState, RouletteSpinSummaryItem } from '../types';

export const RouletteOverlay: React.FC = () => {
  const [roulette, setRoulette] = useState<RouletteState | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [spinUser, setSpinUser] = useState<string | null>(null);
  const [totalPulls, setTotalPulls] = useState<number>(1);
  const [bonusPulls, setBonusPulls] = useState<number>(0);
  const [summary, setSummary] = useState<RouletteSpinSummaryItem[]>([]);

  useEffect(() => {
    socket.on('initial_state', (data: any) => {
      if (data.roulette) setRoulette(data.roulette);
    });

    socket.on('roulette_update', (data: RouletteState) => {
      setRoulette(data);
    });

    socket.on('spin_roulette', (data: {
      user?: string;
      winner: string;
      targetAngle: number;
      totalPulls?: number;
      bonusPulls?: number;
      resultsSummary?: RouletteSpinSummaryItem[];
      readResultTts?: boolean;
    }) => {
      setIsSpinning(true);
      setWinner(null);
      setSummary([]);
      setSpinUser(data.user || null);
      setTotalPulls(data.totalPulls || 1);
      setBonusPulls(data.bonusPulls || 0);

      setRotation(prev => prev + 360 * 5 + (data.targetAngle || 0));

      setTimeout(() => {
        setIsSpinning(false);
        setWinner(data.winner);
        if (Array.isArray(data.resultsSummary)) {
          setSummary(data.resultsSummary);
        }
        confetti({
          particleCount: (data.totalPulls || 1) > 1 ? 140 : 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        // 결과 TTS 읽기
        if (data.readResultTts !== false && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const summaryText = Array.isArray(data.resultsSummary) && data.resultsSummary.length > 0 && (data.totalPulls || 1) > 1
              ? `${data.user ? `${data.user}님 ` : ''}${data.totalPulls}연차 결과! ` +
                data.resultsSummary.map(s => `${s.name} ${s.count}개`).join(', ')
              : `${data.user ? `${data.user}님 ` : ''}룰렛 당첨! ${data.winner}`;
            const utter = new SpeechSynthesisUtterance(summaryText);
            utter.lang = 'ko-KR';
            utter.rate = 1.05;
            window.speechSynthesis.speak(utter);
          } catch {}
        }
      }, 3500);
    });

    return () => {
      socket.off('initial_state');
      socket.off('roulette_update');
      socket.off('spin_roulette');
    };
  }, []);

  if (!roulette || !roulette.items || roulette.items.length === 0) return null;

  const totalChance = roulette.items.reduce((acc, it) => acc + (Number(it.chance) || 0), 0) || 100;
  let currentAcc = 0;
  const gradientParts = roulette.items.map(it => {
    const start = (currentAcc / totalChance) * 100;
    currentAcc += (Number(it.chance) || 0);
    const end = (currentAcc / totalChance) * 100;
    return `${it.color} ${start}% ${end}%`;
  });
  const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;

  let labelAngleAcc = 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-transparent select-none pointer-events-none">
      <div className="flex flex-col items-center max-w-md">
        <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 z-10 -mb-4 drop-shadow-lg"></div>

        <div className="relative w-80 h-80 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden flex items-center justify-center bg-slate-950">
          <div
            style={{
              background: conicGradient,
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none'
            }}
            className="w-full h-full rounded-full relative"
          >
            {roulette.items.map((item) => {
              const sliceAngle = ((Number(item.chance) || 0) / totalChance) * 360;
              const midAngle = labelAngleAcc + sliceAngle / 2;
              labelAngleAcc += sliceAngle;

              return (
                <div
                  key={item.id}
                  style={{
                    transform: `rotate(${midAngle}deg)`,
                    transformOrigin: '50% 50%'
                  }}
                  className="absolute inset-0 flex items-start justify-center pt-4 pointer-events-none"
                >
                  <span className="bg-slate-950/80 text-white font-black px-2 py-0.5 rounded text-[11px] shadow border border-white/20 max-w-[95px] truncate">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="absolute w-16 h-16 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-amber-300 font-black text-xs shadow-xl tracking-wider">
            SPIN
          </div>
        </div>

        {winner && (
          <div className="mt-4 px-6 py-3 rounded-2xl bg-slate-950/90 border-2 border-amber-400 text-center shadow-2xl space-y-2 animate-bounce">
            {spinUser && (
              <div className="text-xs font-extrabold text-slate-300">
                [{spinUser}] {totalPulls > 1 ? `총 ${totalPulls}연차${bonusPulls > 0 ? ` (보너스 +${bonusPulls})` : ''}` : '룰렛 결과'}
              </div>
            )}
            <div className="text-amber-300 font-black text-xl">
              🎉 당첨: {winner}
            </div>
            {totalPulls > 1 && summary.length > 0 && (
              <div className="pt-1.5 border-t border-white/10 flex flex-wrap justify-center gap-1.5">
                {summary.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/15 text-xs font-bold text-white flex items-center gap-1"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color || '#f59e0b' }} />
                    <span>{s.name}</span>
                    <span className="text-amber-400 font-black">x{s.count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
