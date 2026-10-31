import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { socket } from '../services/socket';
import { RouletteState } from '../types';

export const RouletteOverlay: React.FC = () => {
  const [roulette, setRoulette] = useState<RouletteState | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    socket.on('initial_state', (data: any) => {
      if (data.roulette) setRoulette(data.roulette);
    });

    socket.on('spin_roulette', (data: { winner: string; targetAngle: number }) => {
      setIsSpinning(true);
      setWinner(null);
      const totalRot = rotation + 360 * 5 + data.targetAngle;
      setRotation(totalRot);

      setTimeout(() => {
        setIsSpinning(false);
        setWinner(data.winner);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 3500);
    });

    return () => {
      socket.off('spin_roulette');
    };
  }, [rotation]);

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
      <div className="flex flex-col items-center">
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
          <div className="mt-4 px-6 py-2.5 rounded-2xl bg-slate-950/90 border-2 border-amber-400 text-amber-300 font-black text-xl shadow-2xl animate-bounce">
            🎉 당첨: {winner}
          </div>
        )}
      </div>
    </div>
  );
};
