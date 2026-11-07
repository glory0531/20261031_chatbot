import React from 'react';
import {
  Power,
  Moon,
  Sun,
  Layers,
  ExternalLink,
  Tv,
  Users,
  Radio,
  Sparkles,
  Globe
} from 'lucide-react';
import { ChannelStatus, Settings, TunnelState } from '../types';

interface HeaderProps {
  status: ChannelStatus;
  settings?: Settings;
  theme: 'dark' | 'light';
  tunnel?: TunnelState;
  version?: string;
  onToggleTheme: () => void;
  onToggleBot: () => void;
  onOpenOverlayModal: () => void;
  onOpenViewerPage: () => void;
  onOpenTunnelModal?: () => void;
  onNavigateSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  settings,
  theme,
  tunnel,
  version,
  onToggleTheme,
  onToggleBot,
  onOpenOverlayModal,
  onOpenViewerPage,
  onOpenTunnelModal,
  onNavigateSettings
}) => {
  const botName = (settings?.botName && settings.botName.trim()) || '샤봇';
  const streamerName = status.channelName || settings?.streamerName || '스트리머';
  const fandomName = settings?.fandomName || '시청자';
  const channelId = status.channelId || settings?.chzzkChannelId || '';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-amber-400/20 px-4 lg:px-6 py-2.5 transition-colors shadow-lg shadow-black/40">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* 브랜드 로고 & 채널 프로필 */}
        <div className="flex items-center gap-3.5">
          <div className="relative group cursor-pointer" onClick={onOpenViewerPage} title={`${fandomName} 공개 페이지 열기`}>
            <div className="w-11 h-11 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 shadow-lg">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 relative flex items-center justify-center">
                {status.channelImageUrl ? (
                  <img
                    src={status.channelImageUrl}
                    alt={streamerName}
                    className="w-full h-full object-cover object-center transition-transform group-hover:scale-110 duration-300"
                  />
                ) : (
                  <div className="text-xl select-none">🐻</div>
                )}
              </div>
            </div>
            <span className="absolute -top-1 -right-1 text-xs select-none animate-bounce">
              ✨
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg sm:text-xl tracking-tight gold-gradient-text drop-shadow-sm flex items-center gap-1.5">
                <span>{botName}</span>
                <span className="text-amber-400 text-sm">🐻</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>ShaBot {version ? `v${version}` : ''}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              {channelId
                ? `${streamerName}님의 치지직 방송과 실시간 연동 중`
                : '채널 연결 대기 중 · 환경설정에서 치지직 채널을 연결해보세요'}
            </p>
          </div>
        </div>

        {/* 방송 정보 간이 뱃지 */}
        <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs shadow-inner">
          <div className="flex items-center gap-2 text-slate-100 font-semibold">
            {status.isLive ? (
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="font-extrabold text-white max-w-[140px] truncate">{streamerName}</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            {status.isLive ? (
              <span><b className="text-white">{status.viewers.toLocaleString()}</b>명 시청 중</span>
            ) : (
              <span>팔로워 <b className="text-white">{(status.followerCount || 0).toLocaleString()}</b>명</span>
            )}
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[150px] truncate font-medium">{status.category || 'talk'}</span>
          </div>
        </div>

        {/* 우측 유틸리티 버튼들 */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onToggleBot}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
              status.botEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25'
            }`}
            title={status.botEnabled ? '봇 가동 중' : '봇 일시 중지'}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{status.botEnabled ? `${botName} ON` : `${botName} OFF`}</span>
          </button>

          <button
            onClick={onOpenTunnelModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              tunnel?.isRunning
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 hover:border-amber-400/50'
            }`}
            title={`${fandomName} 모바일 외부 공개 링크 및 QR 코드 발급`}
          >
            <Globe className={`w-3.5 h-3.5 ${tunnel?.isRunning ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">
              {tunnel?.isRunning ? '공개 링크 켜짐 ✦' : '공개 링크'}
            </span>
          </button>

          <button
            onClick={onOpenOverlayModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 text-xs font-semibold transition-all hover:border-amber-400/50 shadow-sm cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">OBS 오버레이</span>
          </button>

          {channelId ? (
            <a
              href={`https://chzzk.naver.com/${channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00ffa3]/10 hover:bg-[#00ffa3]/20 text-[#00ffa3] border border-[#00ffa3]/30 hover:border-[#00ffa3]/60 text-xs font-bold transition-all shadow-sm"
              title="내 치지직 방송 채널 열기"
            >
              <Radio className="w-3.5 h-3.5 text-[#00ffa3]" />
              <span className="hidden sm:inline">치지직 채널</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          ) : (
            <button
              onClick={onNavigateSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all cursor-pointer"
              title="치지직 채널 연결하러 가기"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">채널 연결</span>
            </button>
          )}

          <button
            onClick={onOpenViewerPage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-slate-100 border border-amber-400/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title={`${fandomName} 공개 페이지 열기`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{fandomName} 페이지</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="라이트/다크 배경 전환"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
