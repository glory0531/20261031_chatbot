import React, { useState, useEffect, useMemo } from 'react';
import { 
  Music, 
  ListOrdered, 
  Calendar, 
  ArrowLeft, 
  Moon, 
  RefreshCw, 
  MessageSquare, 
  Sparkles, 
  Dice5, 
  Swords, 
  CheckCircle2, 
  Clock, 
  Users, 
  AlertCircle,
  ExternalLink,
  Radio
} from 'lucide-react';
import { 
  ChannelStatus, 
  Settings, 
  CustomCommand, 
  DefaultCommandConfig, 
  UserWallet, 
  SongRequestsState, 
  GeneralRequest, 
  ScheduleItem, 
  FundState, 
  PredictionState 
} from '../types';
import { api } from '../services/api';
import { WeeklyCalendarView } from './ScheduleView';

// 치지직 시그니처 아이콘 컴포넌트
export const ChzzkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M5.5 3h13v4h-8.5l9 6.5V21h-13v-4h8.5l-9-6.5V3z" />
  </svg>
);

interface ViewerPublicPageProps {
  status: ChannelStatus;
  settings?: Settings;
  commands?: CustomCommand[];
  defaultCommands?: Record<string, DefaultCommandConfig>;
  users?: Record<string, UserWallet>;
  songRequests: SongRequestsState;
  requests: GeneralRequest[];
  schedules: ScheduleItem[];
  weeklySchedules?: Record<string, ScheduleItem[]>;
  activeWeekKey?: string;
  fund?: FundState;
  prediction?: PredictionState;
  isLocalHost?: boolean;
  onBackToDashboard: () => void;
}

export const ViewerPublicPage: React.FC<ViewerPublicPageProps> = ({
  status,
  settings,
  commands = [],
  defaultCommands = {},
  users = {},
  songRequests,
  requests,
  schedules,
  weeklySchedules = {},
  activeWeekKey = '',
  fund,
  prediction,
  isLocalHost = false,
  onBackToDashboard
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'sr' | 'requests' | 'commands'>('schedule');
  const [isSyncing, setIsSyncing] = useState(false);

  // 스트리머 설정값 동적 반영
  const prefix = settings?.prefix || '!';
  const botName = settings?.botName || '샤봇';
  const pointName = settings?.pointName || 'P';
  const chipName = settings?.chipName || '칩';
  const channelName = status?.channelName || settings?.streamerName || '치지직 스트리머';
  const profileImage = status?.channelImageUrl || '';
  const attendPoints = settings?.attendPoints ?? 100;
  const attendStreakBonus = settings?.attendStreakBonus ?? 20;

  // 치지직 방송 채널 URL
  const chzzkChannelId = status?.channelId || settings?.chzzkChannelId || '';
  const chzzkLiveUrl = chzzkChannelId ? `https://chzzk.naver.com/live/${chzzkChannelId}` : '#';
  const chzzkChannelUrl = chzzkChannelId ? `https://chzzk.naver.com/${chzzkChannelId}` : '#';

  // 페이지 진입 시 치지직 실황 즉시 최신화
  useEffect(() => {
    api.syncStatus().catch(() => {});
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.syncStatus();
    } catch (e) {}
    setTimeout(() => setIsSyncing(false), 800);
  };

  // 스트리머가 활성화하고 시청자 공개로 설정한 기본 명령어들만 필터링
  const enabledDefaultCommands = useMemo(() => {
    const list: { key: string; name: string; syntax: string; badge: string; desc: string; category: string }[] = [];

    // 출석체크
    if (defaultCommands?.attend?.enabled !== false && defaultCommands?.attend?.visibleInViewer !== false) {
      const name = defaultCommands?.attend?.name || '출첵';
      list.push({
        key: 'attend',
        name,
        syntax: `${prefix}${name}`,
        badge: '1일 1회',
        desc: `오늘의 출석 체크 & 기본 ${attendPoints}${chipName} 적립 (연속 출석당 +${attendStreakBonus}${chipName})`,
        category: '참여 & 재화'
      });
    }

    // 포인트 & 칩 조회 (통합)
    if (defaultCommands?.point?.enabled !== false && defaultCommands?.point?.visibleInViewer !== false) {
      const name = defaultCommands?.point?.name || '포인트';
      list.push({
        key: 'point',
        name,
        syntax: `${prefix}${name} / ${prefix}칩`,
        badge: '내 지갑',
        desc: `현재 내가 보유한 유료 ${pointName} 및 활동 ${chipName} 잔액 확인`,
        category: '참여 & 재화'
      });
    }

    // 룰렛 돌리기
    if (defaultCommands?.roulette?.enabled !== false && defaultCommands?.roulette?.visibleInViewer !== false) {
      const name = defaultCommands?.roulette?.name || '룰렛';
      list.push({
        key: 'roulette',
        name,
        syntax: `${prefix}${name}`,
        badge: '행운 룰렛',
        desc: `설정된 재화(기본: 유료 ${pointName})를 소모하여 확률 룰렛 돌리기`,
        category: '참여 & 재화'
      });
    }

    // 포인트 후원 (도네이션)
    if (defaultCommands?.donate?.enabled !== false && defaultCommands?.donate?.visibleInViewer !== false) {
      const name = defaultCommands?.donate?.name || '도네';
      const donateUnit = settings?.donateCurrency === 'points' ? pointName : chipName;
      list.push({
        key: 'donate',
        name,
        syntax: `${prefix}${name} [${donateUnit}] [메시지]`,
        badge: '방송 도네',
        desc: '방송 화면에 멜레 점프 팝업 알림과 한국어 TTS 음성 낭독',
        category: '참여 & 재화'
      });
    }

    // 노래 신청 (SR) - 스트리머의 신청곡 설정에 따라 활성화 여부 반영
    if (songRequests?.settings?.enabled !== false && defaultCommands?.sr?.enabled !== false && defaultCommands?.sr?.visibleInViewer !== false) {
      const name = defaultCommands?.sr?.name || 'sr';
      const srUnit = songRequests?.settings?.currency === 'points' ? pointName : chipName;
      const costText = songRequests?.settings?.minCost ? ` (비용: ${songRequests.settings.minCost}${srUnit})` : '';
      list.push({
        key: 'sr',
        name,
        syntax: `${prefix}${name} [노래제목 또는 유튜브링크]`,
        badge: '노래신청',
        desc: `별빛 주크박스 재생 대기열에 노래 신청${costText}`,
        category: '방송 도구'
      });
    }

    // 시참/미션 신청
    if (defaultCommands?.request?.enabled !== false && defaultCommands?.request?.visibleInViewer !== false) {
      const name = defaultCommands?.request?.name || '신청';
      list.push({
        key: 'request',
        name,
        syntax: `${prefix}${name} [내용]`,
        badge: '시참/미션',
        desc: '스트리머에게 시청자 참여 또는 방송 미션 요청 등록',
        category: '방송 도구'
      });
    }

    // 캐릭터 점프
    if (defaultCommands?.jump?.enabled !== false && defaultCommands?.jump?.visibleInViewer !== false) {
      const name = defaultCommands?.jump?.name || '점프';
      list.push({
        key: 'jump',
        name,
        syntax: `${prefix}${name}`,
        badge: '아바타',
        desc: '방송 화면 바닥을 걸어다니는 내 멜레 아바타 높이 점프',
        category: '방송 도구'
      });
    }

    // 주사위 굴리기
    if (defaultCommands?.dice?.enabled && defaultCommands?.dice?.visibleInViewer !== false) {
      const name = defaultCommands?.dice?.name || '주사위';
      list.push({
        key: 'dice',
        name,
        syntax: `${prefix}${name}`,
        badge: '미니게임',
        desc: '1부터 100 사이의 행운의 랜덤 주사위 굴리기',
        category: '미니게임'
      });
    }

    // 낚시 게임
    if (defaultCommands?.fishing?.enabled && defaultCommands?.fishing?.visibleInViewer !== false) {
      const name = defaultCommands?.fishing?.name || '낚시';
      list.push({
        key: 'fishing',
        name,
        syntax: `${prefix}${name}`,
        badge: '미니게임',
        desc: `미끼(20${chipName})를 소모해 물고기, 황금잉어 낚기`,
        category: '미니게임'
      });
    }

    // 가위바위보 게임
    if (defaultCommands?.rps?.enabled && defaultCommands?.rps?.visibleInViewer !== false) {
      const name = defaultCommands?.rps?.name || '가위바위보';
      list.push({
        key: 'rps',
        name,
        syntax: `${prefix}${name} [가위/바위/보] [${chipName}]`,
        badge: '배팅 게임',
        desc: `${botName}과 가위바위보 대결 (승리 시 배팅금 2배 획득)`,
        category: '미니게임'
      });
    }

    // 목표 모금 기부
    if (defaultCommands?.fund?.enabled && fund?.enabled && defaultCommands?.fund?.visibleInViewer !== false) {
      const name = defaultCommands?.fund?.name || '모금';
      const fundUnit = fund?.currency === 'points' ? pointName : chipName;
      list.push({
        key: 'fund',
        name,
        syntax: `${prefix}${name} [${fundUnit}]`,
        badge: '모금 기부',
        desc: `진행 중인 목표 모금함에 ${fundUnit} 기부하기`,
        category: '참여 & 재화'
      });
    }

    // 승부 예측 투표
    if (defaultCommands?.vote?.enabled && prediction?.status === 'active' && defaultCommands?.vote?.visibleInViewer !== false) {
      const name = defaultCommands?.vote?.name || '투표';
      list.push({
        key: 'vote',
        name,
        syntax: `${prefix}${name} [번호] [${chipName}]`,
        badge: '승부 예측',
        desc: `진행 중인 승부 예측에 ${chipName} 배팅하기`,
        category: '참여 & 재화'
      });
    }

    // 방송 경과 시간 (업타임)
    if (defaultCommands?.uptime?.enabled && defaultCommands?.uptime?.visibleInViewer !== false) {
      const name = defaultCommands?.uptime?.name || '업타임';
      list.push({
        key: 'uptime',
        name,
        syntax: `${prefix}${name}`,
        badge: '방송 정보',
        desc: '현재 생방송 진행 경과 시간 확인하기',
        category: '방송 정보'
      });
    }

    return list;
  }, [defaultCommands, prefix, pointName, chipName, attendPoints, attendStreakBonus, songRequests, fund, prediction, settings?.donateCurrency]);

  // 스트리머가 활성화하고 시청자 공개로 설정한 커스텀 명령어 목록 (스트리머 전용 명령어는 제외)
  const enabledCustomCommands = useMemo(() => {
    return (commands || []).filter(c => c.enabled && c.permission !== 'streamer' && c.visibleInViewer !== false);
  }, [commands]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-amber-400/25 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-600 to-amber-200 shadow-md shrink-0">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 flex items-center justify-center">
                <img
                  src={profileImage}
                  alt={channelName}
                  className="w-full h-full object-cover object-[75%_25%] scale-150"
                />
              </div>
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>{channelName}의 방송 라운지</span>
                <span className="text-amber-300 text-xs">🌙</span>
              </h1>
              <p className="text-[11px] text-amber-400">
                {botName} · 방송 일정표 · {songRequests.settings.enabled ? '별빛 주크박스 · ' : ''}명령어 안내
              </p>
            </div>
          </div>

          {/* 헤더 우측 액션 버튼들 */}
          <div className="flex items-center gap-2">
            {/* 치지직 방송 채널 바로가기 버튼 */}
            <a
              href={status.isLive ? chzzkLiveUrl : chzzkChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#00ffa3]/15 hover:bg-[#00ffa3]/25 text-[#00ffa3] hover:text-[#52ffbe] text-xs font-bold flex items-center gap-1.5 border border-[#00ffa3]/40 hover:border-[#00ffa3] transition-all shadow-sm shadow-[#00ffa3]/10 group shrink-0"
              title="치지직 방송 채널 새 창으로 열기"
            >
              <ChzzkIcon className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110" />
              <span className="hidden xs:inline">치지직 바로가기</span>
              <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
            </a>

            {/* 로컬 스트리머 본인에게만 대시보드 복귀 버튼 표시 (외부 시청자에게는 완벽 은폐) */}
            {isLocalHost && (
              <button
                onClick={onBackToDashboard}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-bold flex items-center gap-1 border border-amber-400/35 transition-colors shadow-sm shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 스트리머 대시보드
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        {/* 채널 상태 배너 (연동된 계정 이미지 블렌딩 & 실황 연동) */}
        <div className="p-5 sm:p-6 rounded-3xl witch-card-gold relative overflow-hidden shadow-xl border border-amber-400/35">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30 sm:opacity-45 pointer-events-none overflow-hidden">
            <img
              src={profileImage || "/assets/stream_frame.jpg"}
              alt={channelName || "연동된 계정 이미지"}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "/assets/stream_frame.jpg";
              }}
              className={`w-full h-full object-cover filter brightness-110 ${profileImage ? 'object-center' : 'object-[80%_35%]'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#181926] via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              {status.isLive ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-xs font-black text-rose-300 shadow-sm animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    생방송 진행 중 (LIVE)
                  </span>
                  {status.category && (
                    <span className="text-xs text-amber-400 font-semibold">· 카테고리: {status.category}</span>
                  )}
                  {status.viewers !== undefined && status.viewers > 0 && (
                    <span className="text-xs text-amber-400">· 시청자 {status.viewers.toLocaleString()}명</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/90 border border-white/10 text-xs font-bold text-amber-300/90 shadow-sm">
                    <Moon className="w-3 h-3 text-amber-400" />
                    방송 준비 중 (오프라인)
                  </span>
                  {status.category && (
                    <span className="text-xs text-slate-400">· 최근 카테고리: {status.category}</span>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleSync}
                title="치지직 실황 새로고침"
                className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-amber-300 transition-colors border border-white/5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">
              {status.title || `${channelName}의 방송 라운지`}
            </h2>

            {!status.isLive && (
              <p className="text-xs text-amber-400">
                현재는 생방송 준비 중입니다. 아래 일정표와 노래 대기열을 확인해보세요! 🌙✨
              </p>
            )}

            {/* 치지직 방송 채널 바로가기 메인 CTA 버튼 그룹 */}
            <div className="pt-2 flex items-center gap-2.5 flex-wrap">
              <a
                href={status.isLive ? chzzkLiveUrl : chzzkChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm group ${
                  status.isLive
                    ? 'bg-gradient-to-r from-[#00ffa3] to-[#00d287] hover:from-[#33ffb5] hover:to-[#00ffa3] text-black shadow-[#00ffa3]/25 scale-100 hover:scale-[1.02]'
                    : 'bg-[#00ffa3]/15 hover:bg-[#00ffa3]/25 text-[#00ffa3] hover:text-[#52ffbe] border border-[#00ffa3]/40 hover:border-[#00ffa3]'
                }`}
                title={status.isLive ? '치지직 생방송으로 바로 입장합니다' : '치지직 방송 채널로 바로 이동합니다'}
              >
                <ChzzkIcon className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110" />
                <span>
                  {status.isLive ? '치지직 생방송 시청하기 (LIVE)' : '치지직 방송 채널 바로가기'}
                </span>
                <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <a
                href={status.isLive ? chzzkChannelUrl : chzzkLiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-[#d4cfc1] hover:text-white border border-amber-400/25 hover:border-amber-400/50 text-xs font-bold transition-all shadow-sm"
                title={status.isLive ? '치지직 채널 홈 (다시보기, 커뮤니티)' : '치지직 생방송 대기 화면으로 바로가기'}
              >
                <Radio className={`w-3.5 h-3.5 ${status.isLive ? 'text-amber-400' : 'text-rose-400'}`} />
                <span>{status.isLive ? '채널 홈 & 다시보기' : '치지직 LIVE 바로가기'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* 스트리머 승부 예측 진행 위젯 */}
        {prediction?.status === 'active' && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/35 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-100 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-rose-400" /> 승부 예측 진행 중: {prediction.title}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black animate-pulse">
                {chipName} 베팅 진행 중
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {prediction.options.map((opt, idx) => (
                <div key={opt.id} className="p-2.5 rounded-xl bg-slate-950 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>{idx + 1}. {opt.title}</span>
                    <span className="text-cyan-300 font-mono">{(opt.points || 0).toLocaleString()} {chipName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    참여 방법: <b className="text-cyan-200">{prefix}{defaultCommands?.vote?.name || '투표'} {idx + 1} [금액]</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 탭 내비게이션 (모바일 가로 스크롤) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-amber-400/20">
          {[
            { id: 'schedule', label: `${channelName}의 일정표`, icon: Calendar },
            { 
              id: 'sr', 
              label: songRequests.settings.enabled ? '신청곡 대기열' : '신청곡 (마감)', 
              icon: Music 
            },
            { id: 'requests', label: '시참 미션', icon: ListOrdered },
            { id: 'commands', label: '챗봇 명령어', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/80 text-amber-400 hover:text-white hover:bg-[#1f2235] border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 탭 1: 주간 방송 일정표 */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <WeeklyCalendarView schedules={schedules} weeklySchedules={weeklySchedules} activeWeekKey={activeWeekKey} showMonthAccordion={true} />
          </div>
        )}

        {/* 탭 2: 노래 신청 대기열 (별빛 주크박스) */}
        {activeTab === 'sr' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-amber-400" /> 신청곡 재생 현황 및 대기열
              </h3>

              {/* 스트리머가 정한 신청곡 규칙 뱃지들 */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-amber-300 border border-white/5 font-semibold">
                  신청 비용: {songRequests.settings.minCost ? `${songRequests.settings.minCost} ${songRequests.settings.currency === 'points' ? pointName : chipName}` : '무료'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-slate-300 border border-white/5 font-semibold">
                  1인당 최대 {songRequests.settings.maxPerUser}곡
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-slate-300 border border-white/5 font-semibold">
                  대기: {songRequests.queue.length} / {songRequests.settings.maxQueueSize}곡
                </span>
              </div>
            </div>

            {/* 스트리머가 노래 신청을 마감했을 때의 안내 */}
            {!songRequests.settings.enabled && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>현재 스트리머가 신청곡을 일시 마감했습니다. 기존 대기열 곡이 모두 재생된 후 다시 열립니다 🌙</span>
              </div>
            )}

            {/* 현재 재생 중인 곡 */}
            {songRequests.current ? (
              <div className="p-4 rounded-2xl witch-card-gold flex items-center gap-3.5 border border-amber-400/40 shadow-md">
                <img src={songRequests.current.thumbnail} alt="" className="w-16 h-12 rounded-xl object-cover border border-white/20 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-100 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 현재 재생 중 ✦
                  </span>
                  <div className="font-extrabold text-white text-sm truncate">{songRequests.current.title}</div>
                  <div className="text-[11px] text-amber-400">신청자: {songRequests.current.requester}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-center text-xs text-slate-400">
                현재 재생 중인 노래가 없습니다. 방송 중 치지직 채팅창에 <b className="text-amber-300">{prefix}{defaultCommands?.sr?.name || 'sr'} [노래제목]</b>을 입력해보세요!
              </div>
            )}

            {/* 대기열 목록 */}
            <div className="space-y-2">
              {songRequests.queue.length > 0 ? (
                songRequests.queue.map((s, idx) => (
                  <div key={s.id} className="p-3 rounded-2xl witch-card flex items-center justify-between text-xs border border-amber-400/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white truncate">{s.title}</span>
                    </div>
                    <span className="text-amber-400 shrink-0 ml-2">{s.requester}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  신청곡 대기열이 비어 있습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 3: 시참 & 미션 신청 현황 */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-amber-400" /> 시청자 참여 & 미션 신청 현황
              </h3>
              <span className="text-[11px] text-amber-400">
                신청 명령어: <b className="text-amber-300">{prefix}{defaultCommands?.request?.name || '신청'} [내용]</b>
              </span>
            </div>

            <div className="space-y-2">
              {requests.length > 0 ? (
                requests.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-2xl witch-card flex items-center justify-between text-xs border border-amber-400/20">
                    <div>
                      <div className="font-bold text-white text-sm">{r.title}</div>
                      <div className="text-[11px] text-amber-400">신청자: {r.requester}</div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
                      r.status === 'in_progress' ? 'bg-amber-500 text-slate-950' :
                      r.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-slate-900 text-amber-400'
                    }`}>
                      {r.status === 'in_progress' ? '진행 중 ✦' : r.status === 'done' ? '완료' : '대기 중'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  현재 등록된 시참/미션이 없습니다. 채팅창에 <b className="text-amber-300">{prefix}{defaultCommands?.request?.name || '신청'} [내용]</b>을 입력하세요!
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 4: 챗봇 명령어 가이드 */}
        {activeTab === 'commands' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" /> 치지직 생방송 채팅창 명령어 가이드
              </h3>
              <p className="text-xs text-amber-400 mt-0.5">
                스트리머가 대시보드에서 활성화한 명령어 목록입니다. 접두사 <b className="text-amber-300 font-mono">[{prefix}]</b> 와 함께 채팅창에 입력해보세요!
              </p>
            </div>

            {/* 기본 탑재 명령어 */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-100 flex items-center justify-between">
                <span>✦ 기본 내장 명령어 ({enabledDefaultCommands.length}개 공개됨)</span>
              </div>

              {enabledDefaultCommands.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {enabledDefaultCommands.map((cmd) => (
                    <div key={cmd.key} className="p-3.5 rounded-2xl witch-card border border-amber-400/25 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-300 font-mono text-sm">{cmd.syntax}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 font-bold">
                          {cmd.badge}
                        </span>
                      </div>
                      <div className="text-xs text-slate-100">{cmd.desc}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 text-xs text-slate-500 rounded-2xl witch-card border border-white/5">
                  현재 시청자 페이지에 공개된 기본 명령어가 없습니다.
                </div>
              )}
            </div>

            {/* 스트리머 커스텀 명령어 */}
            <div className="space-y-2.5 pt-2">
              <div className="text-xs font-bold text-slate-100 flex items-center justify-between">
                <span>✦ 채널 전용 커스텀 명령어 ({enabledCustomCommands.length}개 공개됨)</span>
              </div>

              {enabledCustomCommands.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {enabledCustomCommands.map((c) => {
                    const cUnit = c.currency === 'points' ? pointName : chipName;
                    return (
                      <div key={c.id} className="p-3 rounded-2xl bg-slate-900/90 border border-amber-400/20 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-amber-300 font-mono">{prefix}{c.name}</span>
                          {c.cost > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 font-bold">
                              소모: {c.cost} {cUnit}
                            </span>
                          )}
                        </div>
                        <div className="text-amber-400 text-[11px] line-clamp-2 leading-relaxed">{c.response}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5 text-xs text-slate-500 rounded-2xl witch-card border border-white/5">
                  현재 시청자 페이지에 공개된 커스텀 명령어가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
