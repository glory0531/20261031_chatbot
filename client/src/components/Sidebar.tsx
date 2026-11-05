import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  Sliders,
  BellRing,
  CalendarCheck,
  Coins,
  TrendingUp,
  Music,
  ListOrdered,
  Dices,
  FlaskConical,
  Settings,
  Calendar,
  ChevronRight
} from 'lucide-react';

export type NavTab =
  | 'home'
  | 'commands'
  | 'default-commands'
  | 'automessages'
  | 'attendance'
  | 'points'
  | 'fund-prediction'
  | 'sr'
  | 'requests'
  | 'games'
  | 'schedule'
  | 'simulator'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  fandomName?: string;
  updateAvailable?: boolean;
  stats: {
    commandCount: number;
    queueCount: number;
    requestCount: number;
  };
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  dot?: boolean;
  highlight?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  fandomName = '시청자',
  updateAvailable = false,
  stats
}) => {
  const navItems: NavGroup[] = [
    {
      group: '방송 대시보드',
      items: [
        { id: 'home', label: '실시간 방송 홈', icon: LayoutDashboard }
      ]
    },
    {
      group: '채팅 & 명령어',
      items: [
        { id: 'commands', label: '커스텀 명령어', icon: Terminal, badge: stats.commandCount },
        { id: 'default-commands', label: '기본 내장 명령어', icon: Sliders },
        { id: 'automessages', label: '정기 자동 공지', icon: BellRing }
      ]
    },
    {
      group: `${fandomName} & 재화`,
      items: [
        { id: 'attendance', label: '출석 체크 관리', icon: CalendarCheck },
        { id: 'points', label: '포인트 & 칩 지갑', icon: Coins },
        { id: 'fund-prediction', label: '공동 모금 & 승부예측', icon: TrendingUp }
      ]
    },
    {
      group: '컨텐츠 & 미니게임',
      items: [
        { id: 'sr', label: '유튜브 노래 신청 (SR)', icon: Music, badge: stats.queueCount },
        { id: 'requests', label: '시참 & 미션 대기열', icon: ListOrdered, badge: stats.requestCount },
        { id: 'games', label: '행운의 룰렛', icon: Dices },
        { id: 'schedule', label: '주간 방송 일정표', icon: Calendar }
      ]
    },
    {
      group: '도구 & 시스템',
      items: [
        { id: 'simulator', label: '방송 시뮬레이터', icon: FlaskConical, highlight: true },
        { id: 'settings', label: '환경설정 & 업데이트', icon: Settings, dot: updateAvailable }
      ]
    }
  ];

  return (
    <aside className="w-full lg:w-68 flex-shrink-0 bg-slate-950/70 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-amber-400/15 p-3 lg:p-4 overflow-y-auto">
      <div className="flex lg:flex-col gap-5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
        {navItems.map((group, gIdx) => (
          <div key={gIdx} className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <span className="text-amber-400">✦</span>
              <span>{group.group}</span>
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all group text-left cursor-pointer ${
                    isActive
                      ? 'bg-amber-400/15 text-slate-100 border border-amber-400/45 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  } ${item.highlight && !isActive ? 'ring-1 ring-amber-400/25' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-amber-300'
                      }`}
                    />
                    <span>{item.label}</span>
                    {item.dot && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="새 업데이트 있음" />
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                          isActive
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-amber-300 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400 hidden lg:block" />}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
};
