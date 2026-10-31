import React, { useState, useEffect } from 'react';
import { Target, Star } from 'lucide-react';
import { socket } from '../services/socket';
import { FundState } from '../types';

export const GoalOverlay: React.FC = () => {
  const [fund, setFund] = useState<FundState | null>(null);

  useEffect(() => {
    socket.on('initial_state', (data: any) => {
      if (data.fund) setFund(data.fund);
    });

    socket.on('fund_update', (data: FundState) => {
      setFund(data);
    });

    return () => {
      socket.off('fund_update');
    };
  }, []);

  if (!fund) return null;

  const percent = Math.min(100, Math.floor((fund.currentPoints / fund.goalPoints) * 100));

  return (
    <div className="fixed top-6 right-6 w-80 p-4 rounded-2xl bg-[#1C1C1C]/90 backdrop-blur-md border-2 border-[#7A8060]/60 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-2 select-none pointer-events-none">
      <div className="flex items-center justify-between text-xs font-black text-white">
        <span className="flex items-center gap-1.5 truncate">
          <Star className="w-4 h-4 text-[#7A8060] fill-[#7A8060]" />
          {fund.title}
        </span>
        <span className="text-[#FFE5B4] text-sm drop-shadow">{percent}%</span>
      </div>

      <div className="w-full h-3 rounded-full bg-[#1C1C1C] p-0.5 border border-[#7A8060]/30 overflow-hidden">
        <div
          style={{ width: `${percent}%` }}
          className="h-full rounded-full bg-gradient-to-r from-[#8E7C6F] via-[#7A8060] to-[#FFE5B4] transition-all duration-500 shadow-sm"
        ></div>
      </div>

      <div className="flex justify-between text-[11px] font-bold text-[#7A8060]">
        <span>{fund.currentPoints.toLocaleString()}P</span>
        <span>목표 {fund.goalPoints.toLocaleString()}P</span>
      </div>
    </div>
  );
};
