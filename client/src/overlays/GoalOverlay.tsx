import React, { useState, useEffect } from 'react';
import { Target, Star } from 'lucide-react';
import { socket } from '../services/socket';
import { FundState } from '../types';

export const GoalOverlay: React.FC = () => {
  const [fund, setFund] = useState<FundState | null>(null);
  const [funds, setFunds] = useState<FundState[]>([]);

  const targetIdParam = (() => {
    try {
      return new URLSearchParams(window.location.search).get('id') || '';
    } catch {
      return '';
    }
  })();

  useEffect(() => {
    const handleInitial = (data: any) => {
      if (data.fund) setFund(data.fund);
      if (Array.isArray(data.funds)) setFunds(data.funds);
    };
    const handleFundUpdate = (data: FundState) => setFund(data);
    const handleFundsUpdate = (data: FundState[]) => {
      if (Array.isArray(data)) setFunds(data);
    };

    socket.on('initial_state', handleInitial);
    socket.on('fund_update', handleFundUpdate);
    socket.on('funds_update', handleFundsUpdate);

    return () => {
      socket.off('initial_state', handleInitial);
      socket.off('fund_update', handleFundUpdate);
      socket.off('funds_update', handleFundsUpdate);
    };
  }, []);

  const activeFund = (() => {
    if (targetIdParam && funds.length > 0) {
      const matched = funds.find(
        (f) => f.id === targetIdParam || String(f.number) === targetIdParam
      );
      if (matched) return matched;
    }
    return funds.find((f) => f.enabled !== false) || funds[0] || fund;
  })();

  if (!activeFund) return null;

  const percent = activeFund.goalPoints > 0
    ? Math.min(100, Math.floor((activeFund.currentPoints / activeFund.goalPoints) * 100))
    : 0;
  const unit = activeFund.currency === 'points' ? 'P' : '칩';

  return (
    <div className="fixed top-6 right-6 w-80 p-4 rounded-2xl bg-[#1C1C1C]/90 backdrop-blur-md border-2 border-[#7A8060]/60 shadow-[0_10px_30px_rgba(0,0,0,0.6)] space-y-2 select-none pointer-events-none">
      <div className="flex items-center justify-between text-xs font-black text-white">
        <span className="flex items-center gap-1.5 truncate">
          <Star className="w-4 h-4 text-[#7A8060] fill-[#7A8060] shrink-0" />
          {activeFund.number ? <span className="text-[#FFE5B4]">#{activeFund.number}</span> : null}
          <span className="truncate">{activeFund.title}</span>
        </span>
        <span className="text-[#FFE5B4] text-sm drop-shadow shrink-0 ml-2">{percent}%</span>
      </div>

      <div className="w-full h-3 rounded-full bg-[#1C1C1C] p-0.5 border border-[#7A8060]/30 overflow-hidden">
        <div
          style={{ width: `${percent}%` }}
          className="h-full rounded-full bg-gradient-to-r from-[#8E7C6F] via-[#7A8060] to-[#FFE5B4] transition-all duration-500 shadow-sm"
        ></div>
      </div>

      <div className="flex justify-between text-[11px] font-bold text-[#7A8060]">
        <span>{activeFund.currentPoints.toLocaleString()}{unit}</span>
        <span>목표 {activeFund.goalPoints.toLocaleString()}{unit}</span>
      </div>
    </div>
  );
};
