import React, { useState, useEffect } from 'react';
import { socket } from './services/socket';
import { api } from './services/api';
import {
  ChannelStatus,
  Settings,
  CustomCommand,
  DefaultCommandConfig,
  AutoMessage,
  UserWallet,
  SongRequestsState,
  GeneralRequest,
  FundState,
  PredictionState,
  RouletteState,
  ChatMessage,
  ScheduleItem,
  TunnelState,
  UpdateState,
  LiveDonation
} from './types';

import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { OverlayModal } from './components/OverlayModal';
import { TunnelModal } from './components/TunnelModal';
import { UpdateBanner } from './components/UpdateBanner';
import { OnboardingModal } from './components/OnboardingModal';

import { HomeView } from './views/HomeView';
import { CommandsView } from './views/CommandsView';
import { DefaultCommandsView } from './views/DefaultCommandsView';
import { AutoMessagesView } from './views/AutoMessagesView';
import { AttendanceView } from './views/AttendanceView';
import { PointsView } from './views/PointsView';
import { FundPredictionView } from './views/FundPredictionView';
import { SongRequestView } from './views/SongRequestView';
import { RequestsView } from './views/RequestsView';
import { GamesView } from './views/GamesView';
import { SimulatorView } from './views/SimulatorView';
import { SettingsView } from './views/SettingsView';
import { ViewerPublicPage } from './views/ViewerPublicPage';
import { ScheduleView } from './views/ScheduleView';

import { AvatarOverlay } from './overlays/AvatarOverlay';
import { AlertOverlay } from './overlays/AlertOverlay';
import { SongOverlay } from './overlays/SongOverlay';
import { GoalOverlay } from './overlays/GoalOverlay';
import { RouletteOverlay } from './overlays/RouletteOverlay';

export function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.has('chzzk_auth') || p.has('chzzk_error')) {
        return 'settings';
      }
    } catch {}
    return 'home';
  });
  const [isOverlayModalOpen, setIsOverlayModalOpen] = useState(false);
  const [isTunnelModalOpen, setIsTunnelModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [simulatorRunning, setSimulatorRunning] = useState(false);

  const [tunnel, setTunnel] = useState<TunnelState>({
    status: 'stopped',
    isRunning: false,
    publicUrl: null,
    viewerUrl: null,
    startedAt: null,
    error: null
  });

  const [updateState, setUpdateState] = useState<UpdateState | undefined>(undefined);

  const [status, setStatus] = useState<ChannelStatus>({
    botEnabled: true,
    channelId: '',
    channelName: '스트리머',
    title: '오늘도 즐거운 방송 함께해요!',
    category: 'talk',
    viewers: 0,
    startTime: Date.now(),
    uptimeSeconds: 0
  });

  const [settings, setSettings] = useState<Settings>({
    prefix: '!',
    botName: '샤봇',
    streamerName: '스트리머',
    fandomName: '시청자',
    themePreset: 'chzzk-emerald',
    onboardingCompleted: true,
    autoUpdateOnStart: true,
    ttsEnabled: true,
    ttsVoice: 'Google 한국의',
    pointName: 'P',
    chatPoints: 5,
    chatIntervalSeconds: 60,
    attendPoints: 100,
    attendStreakBonus: 20,
    platform: 'chzzk',
    chzzkChannelId: '',
    chzzkChatChannelId: '',
    autoMessageIntervalMin: 10
  });

  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [defaultCommands, setDefaultCommands] = useState<Record<string, DefaultCommandConfig>>({});
  const [autoMessages, setAutoMessages] = useState<AutoMessage[]>([]);
  const [users, setUsers] = useState<Record<string, UserWallet>>({});
  const [songRequests, setSongRequests] = useState<SongRequestsState>({
    current: null,
    queue: [],
    settings: { enabled: true, maxQueueSize: 20, maxPerUser: 2, minCost: 0, volume: 75 }
  });
  const [generalRequests, setGeneralRequests] = useState<GeneralRequest[]>([]);
  const [fund, setFund] = useState<FundState>({
    title: '시청자와 함께하는 방송 컨텐츠 모금함',
    goalPoints: 50000,
    currentPoints: 0,
    enabled: true,
    recentDonors: []
  });
  const [prediction, setPrediction] = useState<PredictionState>({
    id: 'pred-ready',
    title: '오늘 방송 미션 성공할까?',
    options: [
      { id: '1', title: '성공한다! 👑', points: 0, votes: 0 },
      { id: '2', title: '실패한다... 💀', points: 0, votes: 0 }
    ],
    status: 'closed',
    winnerOptionId: null,
    createdAt: Date.now()
  });
  const [roulette, setRoulette] = useState<RouletteState>({
    items: [],
    cost: 500,
    history: []
  });
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<Record<string, ScheduleItem[]>>({});
  const [activeWeekKey, setActiveWeekKey] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveDonations, setLiveDonations] = useState<LiveDonation[]>([]);

  useEffect(() => {
    socket.on('initial_state', (data: any) => {
      if (data.status) setStatus(data.status);
      if (data.settings) {
        setSettings(data.settings);
        if (!data.settings.onboardingCompleted && !data.settings.chzzkChannelId) {
          setIsOnboardingOpen(true);
        }
      }
      if (data.commands) setCommands(data.commands);
      if (data.defaultCommands) setDefaultCommands(data.defaultCommands);
      if (data.autoMessages) setAutoMessages(data.autoMessages);
      if (data.users) setUsers(data.users);
      if (data.songRequests) setSongRequests(data.songRequests);
      if (data.generalRequests) setGeneralRequests(data.generalRequests);
      if (data.fund) setFund(data.fund);
      if (data.prediction) setPrediction(data.prediction);
      if (data.roulette) setRoulette(data.roulette);
      if (data.schedules) setSchedules(data.schedules);
      if (data.weeklySchedules) setWeeklySchedules(data.weeklySchedules);
      if (data.activeWeekKey !== undefined) setActiveWeekKey(data.activeWeekKey);
      if (data.liveDonations && Array.isArray(data.liveDonations)) setLiveDonations(data.liveDonations);
      if (data.messages && Array.isArray(data.messages)) setMessages(data.messages);
      if (data.tunnel) setTunnel(data.tunnel);
      if (data.update) setUpdateState(data.update);
      if (data.simulatorRunning !== undefined) setSimulatorRunning(Boolean(data.simulatorRunning));
      setInitialLoaded(true);
    });

    socket.on('status_update', (data: ChannelStatus) => setStatus(data));
    socket.on('settings_update', (data: Settings) => setSettings(data));
    socket.on('commands_update', (data: CustomCommand[]) => setCommands(data));
    socket.on('default_commands_update', (data: Record<string, DefaultCommandConfig>) => setDefaultCommands(data));
    socket.on('automessages_update', (data: AutoMessage[]) => setAutoMessages(data));
    socket.on('points_update', (data: Record<string, UserWallet>) => setUsers(data));
    socket.on('sr_update', (data: SongRequestsState) => setSongRequests(data));
    socket.on('requests_update', (data: GeneralRequest[]) => setGeneralRequests(data));
    socket.on('fund_update', (data: FundState) => setFund(data));
    socket.on('prediction_update', (data: PredictionState) => setPrediction(data));
    socket.on('roulette_update', (data: RouletteState) => setRoulette(data));
    socket.on('schedules_update', (data: ScheduleItem[]) => setSchedules(data));
    socket.on('weekly_schedules_update', (data: Record<string, ScheduleItem[]>) => setWeeklySchedules(data));
    socket.on('active_week_update', (key: string) => setActiveWeekKey(key));
    socket.on('donations_update', (data: LiveDonation[]) => setLiveDonations(data));
    socket.on('tunnel_update', (data: TunnelState) => setTunnel(data));
    socket.on('update_state', (data: UpdateState) => setUpdateState(data));
    socket.on('simulator_status', (running: boolean) => setSimulatorRunning(running));

    socket.on('chat_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev.slice(-99), msg]);
    });

    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      socket.off('initial_state');
      socket.off('status_update');
      socket.off('settings_update');
      socket.off('commands_update');
      socket.off('default_commands_update');
      socket.off('automessages_update');
      socket.off('points_update');
      socket.off('sr_update');
      socket.off('requests_update');
      socket.off('fund_update');
      socket.off('prediction_update');
      socket.off('roulette_update');
      socket.off('schedules_update');
      socket.off('weekly_schedules_update');
      socket.off('active_week_update');
      socket.off('donations_update');
      socket.off('tunnel_update');
      socket.off('update_state');
      socket.off('simulator_status');
      socket.off('chat_message');
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // 전역 테마 프리셋 반영
  useEffect(() => {
    if (!pathname.startsWith('/overlay')) {
      document.documentElement.dataset.theme = settings.themePreset || 'chzzk-emerald';
    }
  }, [settings.themePreset, pathname]);

  // OBS 오버레이 투명 모드 제어
  useEffect(() => {
    if (pathname.startsWith('/overlay')) {
      document.documentElement.classList.add('overlay-mode');
      document.body.classList.add('overlay-mode');
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.body.style.backgroundImage = 'none';
    } else {
      document.documentElement.classList.remove('overlay-mode');
      document.body.classList.remove('overlay-mode');
    }
  }, [pathname]);

  // 치지직 OAuth 리디렉션 결과 안내 및 URL 쿼리 파라미터 정리
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const auth = p.get('chzzk_auth');
      const err = p.get('chzzk_error');
      if (auth === 'success') {
        setCurrentTab('settings');
        setTimeout(() => {
          alert('🎉 치지직 계정 연동이 완료되었습니다!\n발송 명의와 채팅 연동 상태를 확인해 주세요.');
        }, 150);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (err) {
        setCurrentTab('settings');
        setTimeout(() => {
          alert(`⚠️ 치지직 연동 중 오류가 발생했습니다:\n\n[오류 내용] ${decodeURIComponent(err)}\n\n환경설정에서 Client ID, 비밀키(Secret) 및 치지직 개발자 센터 설정을 확인해 주세요.`);
        }, 150);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {}
  }, []);

  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.');

  if (pathname === '/overlay/avatar') return <div className="overlay-root"><AvatarOverlay /></div>;
  if (pathname === '/overlay/alert') return <div className="overlay-root"><AlertOverlay /></div>;
  if (pathname === '/overlay/sr' || pathname === '/overlay/song') return <div className="overlay-root"><SongOverlay /></div>;
  if (pathname === '/overlay/goal') return <div className="overlay-root"><GoalOverlay /></div>;
  if (pathname === '/overlay/roulette') return <div className="overlay-root"><RouletteOverlay /></div>;

  if (!isLocalHost) {
    return (
      <ViewerPublicPage
        status={status}
        settings={settings}
        commands={commands}
        defaultCommands={defaultCommands}
        users={users}
        songRequests={songRequests}
        requests={generalRequests}
        schedules={schedules}
        weeklySchedules={weeklySchedules}
        activeWeekKey={activeWeekKey}
        fund={fund}
        prediction={prediction}
        isLocalHost={false}
        onBackToDashboard={() => {}}
      />
    );
  }

  if (pathname.startsWith('/view')) {
    return (
      <ViewerPublicPage
        status={status}
        settings={settings}
        commands={commands}
        defaultCommands={defaultCommands}
        users={users}
        songRequests={songRequests}
        requests={generalRequests}
        schedules={schedules}
        weeklySchedules={weeklySchedules}
        activeWeekKey={activeWeekKey}
        fund={fund}
        prediction={prediction}
        isLocalHost={true}
        onBackToDashboard={() => {
          window.history.pushState({}, '', '/');
          setPathname('/');
        }}
      />
    );
  }

  const handleToggleBot = async () => {
    await api.toggleBot();
  };

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleOpenViewerPage = () => {
    window.history.pushState({}, '', '/view');
    setPathname('/view');
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-[#faf6f0] text-slate-900'}`}>
      {/* 원격 업데이트 상단 배너 */}
      <UpdateBanner update={updateState} isLive={status.isLive} />

      {/* 헤더 */}
      <Header
        status={status}
        settings={settings}
        theme={theme}
        tunnel={tunnel}
        version={updateState?.currentVersion}
        onToggleTheme={handleToggleTheme}
        onToggleBot={handleToggleBot}
        onOpenOverlayModal={() => setIsOverlayModalOpen(true)}
        onOpenViewerPage={handleOpenViewerPage}
        onOpenTunnelModal={() => setIsTunnelModalOpen(true)}
        onNavigateSettings={() => setCurrentTab('settings')}
      />

      {/* 메인 바디 레이아웃 */}
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          fandomName={settings.fandomName || '시청자'}
          updateAvailable={Boolean(updateState?.updateAvailable)}
          stats={{
            commandCount: commands.length,
            queueCount: songRequests.queue.length,
            requestCount: generalRequests.filter(r => r.status === 'waiting').length
          }}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'home' && (
            <HomeView
              status={status}
              settings={settings}
              defaultCommands={defaultCommands}
              messages={messages}
              users={users}
              songRequests={songRequests}
              fund={fund}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'commands' && (
            <CommandsView commands={commands} prefix={settings.prefix} settings={settings} />
          )}

          {currentTab === 'default-commands' && (
            <DefaultCommandsView defaultCommands={defaultCommands} prefix={settings.prefix} settings={settings} />
          )}

          {currentTab === 'automessages' && (
            <AutoMessagesView autoMessages={autoMessages} />
          )}

          {currentTab === 'attendance' && (
            <AttendanceView
              users={users}
              settings={settings}
              defaultCommands={defaultCommands}
              status={status}
            />
          )}

          {currentTab === 'points' && (
            <PointsView
              users={users}
              settings={settings}
              liveDonations={liveDonations}
              defaultCommands={defaultCommands}
            />
          )}

          {currentTab === 'fund-prediction' && (
            <FundPredictionView
              fund={fund}
              prediction={prediction}
              defaultCommands={defaultCommands}
              status={status}
              settings={settings}
            />
          )}

          {currentTab === 'sr' && (
            <SongRequestView songRequests={songRequests} settings={settings} />
          )}

          {currentTab === 'requests' && (
            <RequestsView
              requests={generalRequests}
              defaultCommands={defaultCommands}
              prefix={settings.prefix}
            />
          )}

          {currentTab === 'games' && (
            <GamesView
              roulette={roulette}
              settings={settings}
              defaultCommands={defaultCommands}
              commands={commands}
            />
          )}

          {currentTab === 'schedule' && (
            <ScheduleView
              schedules={schedules}
              weeklySchedules={weeklySchedules}
              activeWeekKey={activeWeekKey}
              status={status}
              settings={settings}
            />
          )}

          {currentTab === 'simulator' && (
            <SimulatorView simulatorRunning={simulatorRunning} settings={settings} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              update={updateState}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              defaultCommands={defaultCommands}
            />
          )}
        </main>
      </div>

      <OverlayModal
        isOpen={isOverlayModalOpen}
        onClose={() => setIsOverlayModalOpen(false)}
      />

      <TunnelModal
        isOpen={isTunnelModalOpen}
        onClose={() => setIsTunnelModalOpen(false)}
        tunnel={tunnel}
      />

      {initialLoaded && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          settings={settings}
          onComplete={() => setIsOnboardingOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
