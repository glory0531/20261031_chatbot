import React from 'react';
import { Target, Trophy, Flame, Coins } from 'lucide-react';
import { FundState, UserWallet } from '../types';

/**
 * 📦 [보관소] 시청자 페이지에서 임시 제외된 컴포넌트 모음
 * 나중에 다시 시청자 페이지에 띄우고 싶을 때 ViewerPublicPage.tsx 로 가져와 바로 사용할 수 있습니다.
 */

// 1. 목표 모금 진행바 위젯 (Fund Goal Bar)
interface ViewerFundGoalWidgetProps {
  fund?: FundState;
  pointName?: string;
  prefix?: string;
  fundCommandName?: string;
}

export const ViewerFundGoalWidget: React.FC<ViewerFundGoalWidgetProps> = ({
  fund,
  pointName = 'P',
  prefix = '!',
  fundCommandName = '모금'
}) => {
  if (!fund?.enabled || fund.goalPoints <= 0) return null;

  const fundPercent = Math.min(100, Math.round((fund.currentPoints / fund.goalPoints) * 100));

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1f1a2e] via-[#171928] to-slate-950 border border-amber-400/35 space-y-2 shadow-md">
      <div className="flex items-center justify-between text-xs">
        <span className="font-extrabold text-slate-100 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-amber-400" /> {fund.title}
        </span>
        <span className="font-mono text-amber-300 font-bold">
          {fund.currentPoints.toLocaleString()} / {fund.goalPoints.toLocaleString()} {pointName} ({fundPercent}%)
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5 p-0.5">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-200 rounded-full transition-all duration-500 shadow-sm shadow-amber-500/40"
          style={{ width: `${fundPercent}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-amber-400">
        <span>치지직 채팅창에 <b className="text-amber-300">{prefix}{fundCommandName} [포인트]</b> 로 참여하세요!</span>
        {fund.recentDonors && fund.recentDonors.length > 0 && (
          <span className="text-amber-200">최근 기부: {fund.recentDonors[fund.recentDonors.length - 1].user}</span>
        )}
      </div>
    </div>
  );
};

// 2. 별빛 명예의 전당 (연속 출석 & 포인트 랭킹 탭)
interface ViewerRankingTabProps {
  users?: Record<string, UserWallet>;
  pointName?: string;
}

export const ViewerRankingTab: React.FC<ViewerRankingTabProps> = ({
  users = {},
  pointName = 'P'
}) => {
  const userList = Object.values(users);
  const pointRanking = [...userList].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
  const streakRanking = [...userList].sort((a, b) => (b.attendStreak || 0) - (a.attendStreak || 0)).slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" /> 별빛 서재 명예의 전당
        </h3>
        <p className="text-xs text-amber-400 mt-0.5">
          매일 성실하게 출석하고 방송에 참여해 포인트를 모은 시청자 랭킹입니다!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 연속 출석 랭킹 */}
        <div className="p-4 rounded-2xl witch-card border border-amber-400/30 space-y-3">
          <div className="font-black text-xs text-amber-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Flame className="w-3.5 h-3.5 text-rose-400" /> 연속 출석 일수 TOP 10
          </div>

          <div className="space-y-1.5">
            {streakRanking.length > 0 ? (
              streakRanking.map((u, idx) => (
                <div key={u.nickname} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                      idx === 1 ? 'bg-slate-300 text-slate-950 font-bold' :
                      idx === 2 ? 'bg-amber-700 text-white font-bold' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate max-w-[120px]">{u.nickname}</span>
                  </div>
                  <span className="text-amber-300 font-mono font-bold">{u.attendStreak || 0}일 연속</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">출석 기록이 없습니다.</div>
            )}
          </div>
        </div>

        {/* 포인트 보유 랭킹 */}
        <div className="p-4 rounded-2xl witch-card border border-amber-400/30 space-y-3">
          <div className="font-black text-xs text-amber-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Coins className="w-3.5 h-3.5 text-amber-400" /> 보유 {pointName} 랭킹 TOP 10
          </div>

          <div className="space-y-1.5">
            {pointRanking.length > 0 ? (
              pointRanking.map((u, idx) => (
                <div key={u.nickname} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                      idx === 1 ? 'bg-slate-300 text-slate-950 font-bold' :
                      idx === 2 ? 'bg-amber-700 text-white font-bold' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate max-w-[120px]">{u.nickname}</span>
                  </div>
                  <span className="text-amber-300 font-mono font-bold">{(u.points || 0).toLocaleString()} {pointName}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">포인트 기록이 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
