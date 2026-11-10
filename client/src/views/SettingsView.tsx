import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Radio,
  Check,
  RefreshCw,
  Key,
  Shield,
  Volume2,
  Sparkles,
  ExternalLink,
  Info,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  FileJson,
  DownloadCloud,
  Wand2,
  Coins,
  CircleDollarSign,
  Lock,
  Unlock
} from 'lucide-react';
import { Settings, ThemePreset, UpdateState, CurrencyType, DefaultCommandConfig, getFullCommand } from '../types';
import { THEME_PRESETS } from '../constants/themes';
import { api } from '../services/api';

interface SettingsViewProps {
  settings: Settings;
  update?: UpdateState;
  onOpenOnboarding?: () => void;
  defaultCommands?: Record<string, DefaultCommandConfig>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, update, onOpenOnboarding, defaultCommands }) => {
  const [chzzkChannelId, setChzzkChannelId] = useState(settings.chzzkChannelId || '');
  const [chzzkClientId, setChzzkClientId] = useState(settings.chzzkClientId || '');
  const [chzzkClientSecret, setChzzkClientSecret] = useState(settings.chzzkClientSecret || '');
  const [showSecret, setShowSecret] = useState(false);
  const [chzzkWriteEnabled, setChzzkWriteEnabled] = useState(settings.chzzkWriteEnabled ?? false);
  const [suppressPointMessagesInChat, setSuppressPointMessagesInChat] = useState(settings.suppressPointMessagesInChat ?? true);
  const [sendPaidPointMessagesInChat, setSendPaidPointMessagesInChat] = useState(settings.sendPaidPointMessagesInChat ?? true);

  // 세분화된 치지직 채팅 송출 제어 상태
  const [sendChatCheeseDonation, setSendChatCheeseDonation] = useState(
    settings.sendChatCheeseDonation ?? (settings.sendPaidPointMessagesInChat !== false)
  );
  const [sendChatRoulette, setSendChatRoulette] = useState(
    settings.sendChatRoulette ?? (settings.sendPaidPointMessagesInChat !== false)
  );
  const [sendChatDonation, setSendChatDonation] = useState(
    settings.sendChatDonation ?? (settings.sendPaidPointMessagesInChat !== false)
  );
  const [sendChatAttendance, setSendChatAttendance] = useState(
    settings.sendChatAttendance ?? false
  );
  const [sendChatWallet, setSendChatWallet] = useState(
    settings.sendChatWallet ?? false
  );
  const [sendChatMiniGames, setSendChatMiniGames] = useState(
    settings.sendChatMiniGames ?? false
  );
  const [sendChatInsufficient, setSendChatInsufficient] = useState(
    settings.sendChatInsufficient ?? false
  );

  const [botName, setBotName] = useState(settings.botName ?? '샤봇');
  const [streamerName, setStreamerName] = useState(settings.streamerName || '스트리머');
  const [fandomName, setFandomName] = useState(settings.fandomName || '시청자');
  const [prefix, setPrefix] = useState(settings.prefix || '!');
  const [pointName, setPointName] = useState(settings.pointName || 'P');
  const [chipName, setChipName] = useState(settings.chipName || '칩');
  const [cheesePointEnabled, setCheesePointEnabled] = useState(settings.cheesePointEnabled ?? true);
  const [cheesePointRatePercent, setCheesePointRatePercent] = useState(settings.cheesePointRatePercent ?? 100);
  const [includeMissionCheese, setIncludeMissionCheese] = useState(settings.includeMissionCheese ?? false);
  const [donateCurrency, setDonateCurrency] = useState<CurrencyType>(settings.donateCurrency || 'chips');

  const fullDonateCmd = getFullCommand('donate', defaultCommands, prefix, '도네');
  const fullAttendCmd = getFullCommand('attend', defaultCommands, prefix, '출첵');
  const fullPointCmd = getFullCommand('point', defaultCommands, prefix, '포인트');
  const fullRpsCmd = getFullCommand('rps', defaultCommands, prefix, '가위바위보');
  const fullDiceCmd = getFullCommand('dice', defaultCommands, prefix, '주사위');

  const [themePreset, setThemePreset] = useState<ThemePreset>(settings.themePreset || 'chzzk-emerald');
  const [autoUpdateOnStart, setAutoUpdateOnStart] = useState(settings.autoUpdateOnStart ?? true);
  const [attendPoints, setAttendPoints] = useState(settings.attendPoints ?? 100);
  const [chatPoints, setChatPoints] = useState(settings.chatPoints ?? 5);
  const [ttsEnabled, setTtsEnabled] = useState(settings.ttsEnabled ?? true);
  const [platform] = useState(settings.platform || 'chzzk');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);

  const hasExistingConnection = Boolean(
    settings.chzzkChannelId ||
    settings.chzzkClientId ||
    settings.chzzkAccessToken ||
    settings.hasAccessToken
  );
  const [isConnectionLocked, setIsConnectionLocked] = useState<boolean>(() => {
    return hasExistingConnection;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setChzzkChannelId(settings.chzzkChannelId || '');
    setBotName(settings.botName ?? '샤봇');
    setStreamerName(settings.streamerName || '스트리머');
    setFandomName(settings.fandomName || '시청자');
    setPrefix(settings.prefix || '!');
    setPointName(settings.pointName || 'P');
    setChipName(settings.chipName || '칩');
    setCheesePointEnabled(settings.cheesePointEnabled ?? true);
    setCheesePointRatePercent(settings.cheesePointRatePercent ?? 100);
    setIncludeMissionCheese(settings.includeMissionCheese ?? false);
    setDonateCurrency(settings.donateCurrency || 'chips');
    setSuppressPointMessagesInChat(settings.suppressPointMessagesInChat ?? true);
    setSendPaidPointMessagesInChat(settings.sendPaidPointMessagesInChat ?? true);
    setSendChatCheeseDonation(settings.sendChatCheeseDonation ?? (settings.sendPaidPointMessagesInChat !== false));
    setSendChatRoulette(settings.sendChatRoulette ?? (settings.sendPaidPointMessagesInChat !== false));
    setSendChatDonation(settings.sendChatDonation ?? (settings.sendPaidPointMessagesInChat !== false));
    setSendChatAttendance(settings.sendChatAttendance ?? false);
    setSendChatWallet(settings.sendChatWallet ?? false);
    setSendChatMiniGames(settings.sendChatMiniGames ?? false);
    setSendChatInsufficient(settings.sendChatInsufficient ?? false);
    setThemePreset(settings.themePreset || 'chzzk-emerald');
    setAutoUpdateOnStart(settings.autoUpdateOnStart ?? true);
  }, [settings]);

  const [linkError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('chzzk_error');
  });
  const [linkSuccess] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('chzzk_auth') === 'success';
  });

  const isSecretGarbage = useMemo(() => {
    if (!chzzkClientSecret || chzzkClientSecret === '••••••••') return false;
    const s = chzzkClientSecret.trim();
    return s.includes('•') || s.includes(' ') || s.includes('애플리케이션') || s.includes('Documents') || s.length > 80;
  }, [chzzkClientSecret]);

  const handleLinkChzzk = async () => {
    if (!chzzkClientId.trim()) {
      alert('치지직 Client ID를 먼저 입력해주세요!');
      return;
    }
    if (!chzzkClientSecret.trim()) {
      alert('치지직 Client Secret(비밀키)을 먼저 입력해주세요!');
      return;
    }
    if (isSecretGarbage) {
      alert('⚠️ 현재 입력된 비밀키는 화면의 가려진 점(••••) 또는 페이지 글자입니다!\n치지직 개발자 센터에서 [재발급] 버튼을 눌러 나오는 실제 영문/숫자 비밀키를 복사해서 붙여넣어주세요.');
      return;
    }
    setIsLinking(true);
    try {
      await api.updateSettings({
        botName: typeof botName === 'string' ? botName.trim() : '',
        streamerName,
        fandomName,
        themePreset,
        autoUpdateOnStart,
        prefix,
        pointName,
        chipName,
        cheesePointEnabled,
        cheesePointRatePercent: Number(cheesePointRatePercent),
        includeMissionCheese,
        donateCurrency,
        attendPoints: Number(attendPoints),
        chatPoints: Number(chatPoints),
        ttsEnabled,
        platform,
        chzzkChannelId,
        chzzkClientId: chzzkClientId.trim(),
        chzzkClientSecret: chzzkClientSecret.trim(),
        chzzkWriteEnabled: true,
        suppressPointMessagesInChat,
        sendPaidPointMessagesInChat,
        sendChatCheeseDonation,
        sendChatRoulette,
        sendChatDonation,
        sendChatAttendance,
        sendChatWallet,
        sendChatMiniGames,
        sendChatInsufficient
      });
      window.location.href = '/api/chzzk/login';
    } catch (err: any) {
      setIsLinking(false);
      alert('설정 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleDisconnectChzzk = async () => {
    if (!confirm('현재 치지직 계정 연동 및 저장된 발송 토큰을 해제하시겠습니까?\n해제 후 새 계정으로 다시 연동하실 수 있습니다.')) return;
    try {
      await api.disconnectChzzk();
      alert('치지직 계정 연동이 해제되었습니다. 새 계정으로 다시 연동해 주세요.');
    } catch (err: any) {
      alert('연동 해제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleConnectChzzk = async () => {
    setIsConnecting(true);
    const res = await api.connectChzzk(chzzkChannelId.trim());
    if (res?.channelId) setChzzkChannelId(res.channelId);
    setIsConnecting(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateSettings({
      botName: typeof botName === 'string' ? botName.trim() : '',
      streamerName,
      fandomName,
      themePreset,
      autoUpdateOnStart,
      prefix,
      pointName,
      chipName,
      cheesePointEnabled,
      cheesePointRatePercent: Number(cheesePointRatePercent),
      includeMissionCheese,
      donateCurrency,
      attendPoints: Number(attendPoints),
      chatPoints: Number(chatPoints),
      ttsEnabled,
      platform,
      chzzkChannelId,
      chzzkClientId,
      chzzkClientSecret,
      chzzkWriteEnabled,
      suppressPointMessagesInChat,
      sendPaidPointMessagesInChat,
      sendChatCheeseDonation,
      sendChatRoulette,
      sendChatDonation,
      sendChatAttendance,
      sendChatWallet,
      sendChatMiniGames,
      sendChatInsufficient
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSelectTheme = async (preset: ThemePreset) => {
    setThemePreset(preset);
    document.documentElement.dataset.theme = preset;
    await api.updateSettings({ themePreset: preset });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1800);
  };

  const handleToggleAutoUpdate = async (checked: boolean) => {
    setAutoUpdateOnStart(checked);
    await api.updateSettings({ autoUpdateOnStart: checked });
  };

  const handleCheckUpdateNow = async () => {
    setCheckingUpdate(true);
    await api.checkUpdate();
    setCheckingUpdate(false);
  };

  const handleApplyUpdateNow = async () => {
    setApplyingUpdate(true);
    try {
      const res = await api.applyUpdate();
      if (!res.success) {
        alert('업데이트 실패: ' + (res.message || '오류가 발생했습니다.'));
        setApplyingUpdate(false);
      }
    } catch {
      // 재시작 중 연결 끊김은 UpdateBanner 폴링에서 자동 처리
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleExportPoints = () => {
    window.location.href = '/api/export/points';
  };

  // JSON 백업 파일 복원
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`선택한 백업 파일("${file.name}")로 데이터를 복원하시겠습니까?\n복원 전 현재 데이터는 data/backups 폴더에 자동 백업됩니다.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const parsedJson = JSON.parse(text);

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedJson)
      });
      const data = await res.json();

      if (data.success) {
        alert('데이터 복원이 성공적으로 완료되었습니다! 페이지를 새로고침합니다.');
        window.location.reload();
      } else {
        alert('복원 실패: ' + (data.message || '알 수 없는 오류'));
      }
    } catch (err: any) {
      alert('올바른 JSON 백업 파일이 아니거나 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetData = async () => {
    const confirmed = confirm('경고: 모든 시청자 포인트 & 칩 내역, 커스텀 명령어, 일정이 샤봇 최초 기본값으로 초기화됩니다.\n(초기화 직전 상태는 data/backups 에 자동 보관됩니다)\n\n정말 초기화하시겠습니까?');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('초기화가 완료되었습니다. 기본 상태로 다시 로드됩니다.');
        window.location.reload();
      } else {
        alert('초기화 실패: ' + (data.message || '알 수 없는 오류'));
      }
    } catch (err: any) {
      alert('초기화 중 오류가 발생했습니다: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-amber-400" />
            환경설정 & 원격 업데이트 관리
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            치지직 방송 연동, 재화 이원화(유료 포인트 & 활동 칩), 방송 호칭/테마 커스터마이징을 한곳에서 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              <Check className="w-4 h-4 text-emerald-400" />
              저장 완료!
            </div>
          )}
          {onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>1분 초기 세팅 마법사 다시 열기</span>
            </button>
          )}
        </div>
      </div>

      {/* 원격 자동 업데이트 상태 카드 */}
      <div className="witch-card p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <DownloadCloud className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>버전 정보 & 원격 자동 업데이트</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono text-[11px] font-bold">
                  현재 v{update?.currentVersion || '1.0.0'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                업데이트 시 <code className="text-amber-300">data/storage.json</code>(시청자 포인트·명령어·연동키)은 자동 백업 및 100% 보존됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckUpdateNow}
              disabled={checkingUpdate || update?.checking}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${(checkingUpdate || update?.checking) ? 'animate-spin' : ''}`} />
              <span>최신 버전 확인</span>
            </button>

            {update?.updateAvailable && (
              <button
                type="button"
                onClick={handleApplyUpdateNow}
                disabled={applyingUpdate}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>v{update.latestVersion} 지금 업데이트</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
            {!update?.configured ? (
              <div className="text-slate-400">
                📦 로컬 단독 실행 모드 (제작자가 GitHub 배포 저장소를 연결하면 원격 자동 업데이트가 즉시 활성화됩니다)
              </div>
            ) : update.updateAvailable ? (
              <div className="text-amber-300 font-bold">
                ✨ 새 버전 <span className="font-mono">v{update.latestVersion}</span> 업데이트가 준비되었습니다! ({update.repo})
              </div>
            ) : update.error ? (
              <div className="text-rose-300">⚠️ 업데이트 확인 실패: {update.error}</div>
            ) : (
              <div className="text-emerald-300 font-semibold">
                ✅ 현재 최신 버전(v{update.currentVersion})을 사용 중입니다. ({update.repo})
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-200">샤봇 시작 시 자동 업데이트 적용</div>
              <div className="text-[11px] text-slate-400">1_샤봇_시작.bat 실행 시 새 패치가 있으면 자동으로 반영합니다.</div>
            </div>
            <input
              type="checkbox"
              checked={autoUpdateOnStart}
              onChange={(e) => handleToggleAutoUpdate(e.target.checked)}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. 치지직 실시간 방송 연동 카드 */}
        <div className="witch-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs border border-emerald-500/30">
                CH
              </span>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                치지직 (CHZZK) 생방송 연동
                <span className="text-[10px] text-amber-400 font-normal">⚡ 1초 실시간 수신</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {!isConnectionLocked ? (
                <button
                  type="button"
                  onClick={() => setIsConnectionLocked(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 text-[10px] font-bold border border-amber-400/30 flex items-center gap-1 transition-all cursor-pointer"
                  title="설정 보호 덮개 닫기"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>설정 보호 (잠금)</span>
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  공식 웹소켓 지원
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* 치지직 채널 및 API 연동 설정 래퍼 (실수 방지 덮개 UI 적용 영역) */}
            <div className="relative rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-3.5 transition-all overflow-hidden">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  치지직 채널 주소 또는 32자리 UID
                </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chzzkChannelId}
                  onChange={(e) => setChzzkChannelId(e.target.value)}
                  placeholder="채널 URL 또는 32자리 영문/숫자 UID 붙여넣기"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  onClick={handleConnectChzzk}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isConnecting ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> 연결 중...</>
                  ) : (
                    <><Radio className="w-3.5 h-3.5" /> 채널 연결</>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                💡 내 치지직 채널 주소 전체를 그대로 붙여넣어도 자동으로 32자리 UID를 추출하여 연결합니다.
              </p>
            </div>

            {/* 치지직 개발자 센터 API 설정 */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black text-slate-100">
                    치지직 공식 개발자 API (실제 채팅창 답장 발송 · 선택사항)
                  </h4>
                </div>
                <a
                  href="https://developers.chzzk.naver.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  개발자 센터 열기 <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>
                  치지직 개발자 센터(서비스 URL: <code className="text-amber-300">http://localhost:24700</code>)에서 발급받은 키를 등록하면 실제 치지직 채팅창으로 봇이 답글을 남깁니다.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">1. 치지직 Client ID</label>
                <input
                  type="text"
                  value={chzzkClientId}
                  onChange={(e) => setChzzkClientId(e.target.value)}
                  placeholder="개발자 센터의 Client ID"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-300">2. 치지직 Client Secret (비밀키)</label>
                  <div className="flex items-center gap-2">
                    {chzzkClientSecret && (
                      <button
                        type="button"
                        onClick={() => setChzzkClientSecret('')}
                        className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> 지우기
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showSecret ? '가리기' : '키 확인'}
                    </button>
                  </div>
                </div>

                <input
                  type={showSecret ? 'text' : 'password'}
                  value={chzzkClientSecret}
                  onChange={(e) => setChzzkClientSecret(e.target.value)}
                  placeholder="개발자 센터에서 [재발급] 클릭 후 나타나는 영문/숫자 비밀키"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-950/80 border text-xs text-white focus:outline-none font-mono ${
                    isSecretGarbage ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700 focus:border-amber-400'
                  }`}
                />

                {isSecretGarbage && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-[11px] text-rose-300">
                    <div className="font-bold flex items-center gap-1.5 text-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      가려진 점(••••)이나 페이지 글자가 복사되었습니다! 개발자 센터에서 [재발급] 후 복사해주세요.
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-1 space-y-2">
                {linkError && (
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300">
                    치지직 인증 오류: {linkError}
                  </div>
                )}

                {settings.hasAccessToken || settings.chzzkAccessToken || linkSuccess ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <div>
                        <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                          <span>치지직 계정 연동 완료!</span>
                          {settings.chzzkAuthedChannelName && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-amber-300 font-bold border border-emerald-400/40">
                              발송 명의: {settings.chzzkAuthedChannelName}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-400/80 mt-0.5">
                          {settings.chzzkAuthedChannelName
                            ? `치지직 채팅창에 '${settings.chzzkAuthedChannelName}' 닉네임으로 답장이 나갑니다.`
                            : '실제 방송 채팅창 답장 발송 준비 완료'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={handleLinkChzzk} className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer">
                        다시 연동하기
                      </button>
                      <button type="button" onClick={handleDisconnectChzzk} className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer">
                        연동 해제
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isLinking}
                    onClick={handleLinkChzzk}
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isLinking ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> 연동 저장 및 이동 중...</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> 3. 치지직 계정 1초 연동하기 (자동 저장 후 연결)</>
                    )}
                  </button>
                )}
              </div>

              {/* 잠금 오버레이 덮개 (Cover Shield) */}
              {isConnectionLocked && (
                <div className="absolute inset-0 z-20 backdrop-blur-md bg-slate-950/85 p-5 flex flex-col items-center justify-center text-center transition-all animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-2.5 shadow-lg shadow-black/40">
                    <Lock className="w-5 h-5 text-amber-300" />
                  </div>
                  <h5 className="text-sm font-black text-white flex items-center gap-1.5 mb-1">
                    <span>치지직 연동 설정 보호 중</span>
                  </h5>
                  <p className="text-[11px] text-slate-400 max-w-xs mb-3.5 leading-relaxed">
                    방송 중 실수로 클릭하거나 API 키가 수정/삭제되지 않도록 덮개로 안전하게 잠겨 있습니다.
                  </p>

                  {/* 현재 연동 상태 요약 뱃지 */}
                  <div className="mb-4 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-center gap-2.5 text-xs shadow-inner">
                    <span className={`w-2 h-2 rounded-full ${chzzkChannelId ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span className="text-slate-300 font-medium">
                      연동 채널: <span className="text-white font-bold">{streamerName || (chzzkChannelId ? `${chzzkChannelId.slice(0, 10)}...` : '미연동')}</span>
                    </span>
                    {settings.chzzkAuthedChannelName && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-amber-300 font-bold">발송: {settings.chzzkAuthedChannelName}</span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsConnectionLocked(false)}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>설정 변경하기 (잠금 해제)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. 치지직 채팅창 답장 & 송출 제어 독립 카드 (설정 보호에서 완전히 분리, 상시 즉시 변경 가능) */}
          <div className="witch-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 font-black flex items-center justify-center text-xs border border-amber-400/30">
                  📢
                </span>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    치지직 채팅창 답장 & 송출 제어
                    <span className="text-[10px] text-emerald-400 font-normal">⚡ 실시간 즉시 반영</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    방송 채팅창으로 나갈 봇 메시지의 종류를 세부적으로 켜고 끕니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 마스터 스위치 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/40">
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${chzzkWriteEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>실제 치지직 채팅창 답장 전체 활성화</span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  끄면 아래 세부 항목과 무관하게 치지직 채팅창으로 봇 메시지가 발송되지 않습니다.
                </div>
              </div>
              <input
                type="checkbox"
                checked={chzzkWriteEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setChzzkWriteEnabled(val);
                  api.updateSettings({ chzzkWriteEnabled: val });
                }}
                className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
              />
            </div>

            {/* A. 유료 포인트 & 룰렛 결과 송출 세분화 */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1 px-1">
                <span>💰 유료 후원 & 보상 메시지 송출</span>
                <span className="text-[10px] text-slate-400 font-normal">(체크 시 치지직 채팅창에 발송)</span>
              </div>

              {/* 1. 치즈 후원 적립 알림 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-200">🧀 치즈 후원 시 감사 & 포인트 적립 알림</div>
                  <div className="text-[10px] text-slate-400">예: <code>🧀 [닉네임]님 1,000치즈 후원 감사합니다! (+1,000P 적립)</code></div>
                </div>
                <input
                  type="checkbox"
                  checked={sendChatCheeseDonation}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSendChatCheeseDonation(val);
                    api.updateSettings({ sendChatCheeseDonation: val });
                  }}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </div>

              {/* 2. 룰렛 당첨 결과 알림 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-200">🎰 행운의 룰렛 당첨 결과 알림</div>
                  <div className="text-[10px] text-slate-400">예: <code>🎰 [닉네임]님이 룰렛을 돌려 [아이템]에 당첨되셨습니다!</code></div>
                </div>
                <input
                  type="checkbox"
                  checked={sendChatRoulette}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSendChatRoulette(val);
                    api.updateSettings({ sendChatRoulette: val });
                  }}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </div>

              {/* 3. 포인트/칩 도네이션 후원 알림 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-200">⚔️ 포인트/칩 도네이션({fullDonateCmd}) 후원 알림</div>
                  <div className="text-[10px] text-slate-400">예: <code>⚔️ [닉네임]님이 1,000포인트를 후원하셨습니다! "메시지"</code></div>
                </div>
                <input
                  type="checkbox"
                  checked={sendChatDonation}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSendChatDonation(val);
                    api.updateSettings({ sendChatDonation: val });
                  }}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* B. 무료 활동 칩 메시지 송출 세분화 (도배 방지) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="text-xs font-bold text-teal-300 flex items-center gap-1 px-1">
                <span>🛡️ 무료 활동 메시지 송출 (도배 방지)</span>
                <span className="text-[10px] text-slate-400 font-normal">(해제 시 대시보드에만 표시, 채팅창 미송출)</span>
              </div>

              {/* 1. 출석체크 알림 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-200">🎉 출석체크 완료 알림 ({fullAttendCmd})</div>
                  <div className="text-[10px] text-slate-400">출석 보상 지급 및 연속 출석 안내 메시지</div>
                </div>
                <input
                  type="checkbox"
                  checked={sendChatAttendance}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSendChatAttendance(val);
                    api.updateSettings({ sendChatAttendance: val });
                  }}
                  className="w-4 h-4 accent-teal-400 rounded cursor-pointer"
                />
              </div>

              {/* 2. 지갑 및 잔액 조회 알림 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-200">💰 지갑 및 잔액 조회 알림 ({fullPointCmd})</div>
                  <div className="text-[10px] text-slate-400">시청자 개인의 보유 잔액 조회 메시지</div>
                </div>
                <input
                  type="checkbox"
                  checked={sendChatWallet}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSendChatWallet(val);
                    api.updateSettings({ sendChatWallet: val });
                  }}
                  className="w-4 h-4 accent-teal-400 rounded cursor-pointer"
                />
              </div>

              {/* 3. 미니게임 결과 알림 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-200">🎮 미니게임 결과 알림 ({fullRpsCmd}, {fullDiceCmd} 등)</div>
                  <div className="text-[10px] text-slate-400">가위바위보 대결 결과 및 주사위 굴림 결과 메시지</div>
                </div>
                <input
                  type="checkbox"
                  checked={sendChatMiniGames}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSendChatMiniGames(val);
                    api.updateSettings({ sendChatMiniGames: val });
                  }}
                  className="w-4 h-4 accent-teal-400 rounded cursor-pointer"
                />
              </div>

              {/* 4. 잔액 부족 및 권한 부족 에러 안내 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-200">⚠️ 잔액 부족 및 권한 부족 안내 메시지</div>
                  <div className="text-[10px] text-slate-400"><code>[잔액 부족]</code>, <code>[권한 부족]</code> 등 시스템 에러 메시지</div>
                </div>
                <input
                  type="checkbox"
                  checked={sendChatInsufficient}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSendChatInsufficient(val);
                    api.updateSettings({ sendChatInsufficient: val });
                  }}
                  className="w-4 h-4 accent-teal-400 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* 2. 방송 호칭 & 재화 이원화 규칙 & 데이터 백업 카드 */}
        <div className="space-y-6">
          <div className="witch-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Shield className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">내 방송 맞춤 호칭 & 재화 규칙 (이원화)</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">스트리머 이름</label>
                  <input
                    type="text"
                    value={streamerName}
                    onChange={(e) => setStreamerName(e.target.value)}
                    placeholder="스트리머 닉네임"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">챗봇 이름</label>
                    <span className="text-[10px] text-amber-300 font-medium">공백 허용 (비워두면 접두사 없음)</span>
                  </div>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="비워두거나 | 또는 샤봇 입력"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 예: <code>|</code> 입력 시 [김김시하 | 내용], 비워두면 [김김시하 내용] (대괄호 없이 송출)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">시청자/팬덤 애칭</label>
                  <input
                    type="text"
                    value={fandomName}
                    onChange={(e) => setFandomName(e.target.value)}
                    placeholder="시청자"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">명령어 접두사</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="!"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 단위명 설정: 유료 포인트 vs 활동 칩 */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1">
                    <CircleDollarSign className="w-3.5 h-3.5" /> 유료 포인트 단위명
                  </label>
                  <input
                    type="text"
                    value={pointName}
                    onChange={(e) => setPointName(e.target.value)}
                    placeholder="P / 캐시"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-400/40 text-xs text-white text-center focus:outline-none focus:border-amber-400 font-bold"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">치즈 후원 연동, 룰렛 유료화 전용</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-cyan-300 mb-1 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> 활동 칩 단위명
                  </label>
                  <input
                    type="text"
                    value={chipName}
                    onChange={(e) => setChipName(e.target.value)}
                    placeholder="칩 / 쿠키"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-cyan-400/40 text-xs text-white text-center focus:outline-none focus:border-cyan-400 font-bold"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">출석·채팅 적립, 모금, 미니게임 전용</div>
                </div>
              </div>

              {/* 치즈 후원 유료 포인트 적립 세부 설정 */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>🧀 치즈 후원 시 유료 포인트 자동 적립</span>
                    </div>
                    <div className="text-[10px] text-slate-400">시청자가 치즈 후원 시 해당 금액을 포인트로 적립합니다.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={cheesePointEnabled}
                    onChange={(e) => setCheesePointEnabled(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </div>

                {cheesePointEnabled && (
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        치즈 1개당 적립 비율 (%)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={cheesePointRatePercent}
                          onChange={(e) => setCheesePointRatePercent(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white text-center font-bold"
                        />
                        <span className="text-xs text-amber-300 font-bold">%</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        100% = 1,000치즈 후원 시 1,000{pointName} 적립
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <div>
                        <div className="text-[11px] font-bold text-slate-200">미션 치즈 포함</div>
                        <div className="text-[9px] text-slate-400">일반/영상 외 미션 치즈도 적립</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeMissionCheese}
                        onChange={(e) => setIncludeMissionCheese(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-400 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 활동 칩 무료 적립 보상 (출석/채팅) */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    출석 보상 ({chipName})
                  </label>
                  <input
                    type="number"
                    value={attendPoints}
                    onChange={(e) => setAttendPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    채팅 보상 ({chipName})
                  </label>
                  <input
                    type="number"
                    value={chatPoints}
                    onChange={(e) => setChatPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {fullDonateCmd} 기본 재화
                  </label>
                  <select
                    value={donateCurrency}
                    onChange={(e) => setDonateCurrency(e.target.value as CurrencyType)}
                    className="w-full px-2 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white text-center"
                  >
                    <option value="chips">활동 칩 ({chipName})</option>
                    <option value="points">유료 포인트 ({pointName})</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-slate-200">후원 음성 TTS 재생 활성화</span>
                </div>
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {savedSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{savedSuccess ? '설정 저장 완료!' : '프로필 & 재화 규칙 저장하기'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* 데이터 백업 & 복원 카드 */}
          <div className="witch-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <FileJson className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">데이터 백업 · 복원 · PC 이전</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-xs font-bold flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-400/15 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-left">
                  <div className="font-black text-white text-xs">전체 데이터 백업</div>
                  <div className="text-[10px] text-slate-400">JSON 파일 다운로드</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportPoints}
                className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-xs font-bold flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="font-black text-white text-xs">포인트 & 칩 엑셀</div>
                  <div className="text-[10px] text-slate-400">CSV 스프레드시트</div>
                </div>
              </button>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-xs font-bold flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-white text-xs">{isRestoring ? '복원 진행 중...' : '백업 파일 복원'}</div>
                    <div className="text-[10px] text-slate-400">저장된 JSON 불러오기</div>
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetData}
                className="p-3 rounded-xl bg-slate-950/80 hover:bg-rose-950/30 border border-rose-500/30 text-xs font-bold flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-left">
                  <div className="font-black text-rose-300 text-xs">공장 초기화</div>
                  <div className="text-[10px] text-slate-400">자동 백업 후 리셋</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 멀티 컬러 테마 프리셋 카드 */}
      <div className="witch-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">대시보드 & 시청자 페이지 컬러 테마</h3>
              <p className="text-xs text-slate-400">원하는 테마를 클릭하면 대시보드와 시청자 공개 페이지(/view)에 즉시 적용됩니다.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {THEME_PRESETS.map((t) => {
            const active = themePreset === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTheme(t.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 font-bold">
                    {t.badge}
                  </span>
                  {active && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="text-xs font-black text-white mb-1">{t.name}</div>
                <p className="text-[11px] text-slate-400 mb-3 leading-snug">{t.subtitle}</p>
                <div className="flex items-center gap-1.5">
                  {t.swatches.map((hex, idx) => (
                    <span
                      key={idx}
                      className="w-5 h-5 rounded-full border border-white/20"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
