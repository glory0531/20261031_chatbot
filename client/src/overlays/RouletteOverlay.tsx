import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { socket } from '../services/socket';
import { RouletteState, RouletteSpinSummaryItem } from '../types';
import { SlotMachineReel } from '../components/SlotMachineReel';

export const RouletteOverlay: React.FC = () => {
  const [roulette, setRoulette] = useState<RouletteState | null>(null);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [targetWinner, setTargetWinner] = useState<string | null>(null);
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
      setTargetWinner(data.winner || null);
      setSpinTrigger(prev => prev + 1);

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

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-transparent select-none pointer-events-none">
      <div className="flex flex-col items-center w-full max-w-md">
        <SlotMachineReel
          items={roulette.items}
          winnerName={targetWinner}
          spinTrigger={spinTrigger}
          isSpinning={isSpinning}
        />

        {winner && (
          <div className="mt-4 px-6 py-3 rounded-2xl bg-slate-950/90 border-2 border-amber-400 text-center shadow-2xl space-y-2 animate-bounce">
            {spinUser && (
              <div className="text-xs font-extrabold text-slate-300">
                [{spinUser}] {totalPulls > 1 ? `총 ${totalPulls}연차${bonusPulls > 0 ? ` (보너스 +${bonusPulls})` : ''}` : '슬롯 결과'}
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
