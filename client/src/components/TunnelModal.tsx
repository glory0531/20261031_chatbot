import React, { useState, useEffect } from 'react';
import {
  Globe,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Sparkles,
  Power,
  X,
  Loader2,
  Calendar,
  Music,
  MessageSquare,
  HelpCircle,
  Radio,
  Link,
  Zap,
  Key,
  AlertCircle
} from 'lucide-react';
import { TunnelState } from '../types';
import { api } from '../services/api';

interface TunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  tunnel: TunnelState;
}

export const TunnelModal: React.FC<TunnelModalProps> = ({
  isOpen,
  onClose,
  tunnel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // 모드 선택 탭: 'quick'(클라우드플레어 퀵 - 기본 추천) | 'token'(클라우드플레어 토큰) | 'subdomain'(로컬터널 서브도메인)
  const [selectedMode, setSelectedMode] = useState<'quick' | 'token' | 'subdomain'>(
    (tunnel.mode as 'quick' | 'token' | 'subdomain') || 'quick'
  );
  const [subdomainInput, setSubdomainInput] = useState(tunnel.subdomain || 'shabot-chzzk');
  const [tokenInput, setTokenInput] = useState(tunnel.token || '');
  const [customDomainInput, setCustomDomainInput] = useState(tunnel.customDomain || '');

  useEffect(() => {
    if (tunnel.mode === 'quick' || tunnel.mode === 'token' || tunnel.mode === 'subdomain') {
      setSelectedMode(tunnel.mode);
    }
    if (tunnel.subdomain) setSubdomainInput(tunnel.subdomain);
    if (tunnel.token) setTokenInput(tunnel.token);
    if (tunnel.customDomain) setCustomDomainInput(tunnel.customDomain);
  }, [tunnel.mode, tunnel.subdomain, tunnel.token, tunnel.customDomain]);

  if (!isOpen) return null;

  const viewerUrl = tunnel.viewerUrl || (tunnel.publicUrl ? `${tunnel.publicUrl}/view` : '');

  const handleToggleTunnel = async () => {
    setIsLoading(true);
    setLocalError(null);
    try {
      if (tunnel.isRunning) {
        await api.stopTunnel();
      } else {
        let res: any;
        if (selectedMode === 'subdomain') {
          const cleanSub = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || 'shabot-live';
          res = await api.startTunnel({
            provider: 'localtunnel',
            mode: 'subdomain',
            subdomain: cleanSub
          });
        } else if (selectedMode === 'token') {
          if (!tokenInput.trim()) {
            setLocalError('Cloudflare Tunnel 토큰을 입력해주세요.');
            setIsLoading(false);
            return;
          }
          res = await api.startTunnel({
            provider: 'cloudflare',
            mode: 'token',
            token: tokenInput.trim(),
            customDomain: customDomainInput.trim()
          });
        } else {
          res = await api.startTunnel({
            provider: 'cloudflare',
            mode: 'quick'
          });
        }

        if (res?.data?.error) {
          setLocalError(res.data.error);
        } else if (res && res.success === false && res.message) {
          setLocalError(res.message);
        }
      }
    } catch (err: any) {
      setLocalError('공개 링크 처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!viewerUrl) return;
    navigator.clipboard.writeText(viewerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // QR 코드 이미지 주소
  const qrCodeUrl = viewerUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=e5c158&bgcolor=141624&data=${encodeURIComponent(viewerUrl)}`
    : '';

  const activeError = localError || tunnel.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-950 border border-amber-400/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* 상단 헤더 배너 */}
        <div className="relative p-6 bg-gradient-to-r from-[#1c182a] via-[#16182a] to-[#121424] border-b border-amber-400/25">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-200 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
                <Globe className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                  <span>시청자 대시보드 공개 링크</span>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </h3>
                {tunnel.isRunning ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    공유 유지 중
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold">
                    공유 중지됨
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-400 mt-0.5">
                공유를 시작하면 봇을 닫아도 직접 [공유 중지]를 누르기 전까지 백그라운드에서 계속 유지됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 바디 컨텐츠 */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {activeError && !tunnel.isRunning && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{activeError}</span>
            </div>
          )}

          {/* 터널 활성화 상태일 때 */}
          {tunnel.isRunning && viewerUrl ? (
            <div className="space-y-4">
              {/* 백그라운드 상주 보장 알림 카드 */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-bold">백그라운드 상주 공유 중</span>
                  <span className="text-emerald-400/80 text-[11px]">(샤봇을 닫아도 시청자 대시보드 유지)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 uppercase font-mono">
                  {tunnel.provider === 'localtunnel' ? 'Localtunnel' : tunnel.mode === 'token' ? 'Cloudflare 토큰' : 'Cloudflare 퀵'}
                </span>
              </div>

              {/* 공유 링크 박스 */}
              <div className="p-4 rounded-2xl bg-[#181a2b] border border-amber-400/30 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-400" /> 시청자 접속 전용 HTTPS 주소
                  </span>
                  <span className="text-[11px] text-emerald-300 font-medium">비밀번호 없이 즉시 접속 · 자동 재연결</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={viewerUrl}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-amber-200 select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#aa8323] hover:from-amber-500 hover:to-[#be942a] text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-slate-950" /> 복사 완료! ✨
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> 링크 복사
                      </>
                    )}
                  </button>
                  <a
                    href={viewerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-[#25283d] hover:bg-[#2f334d] text-amber-300 transition-colors border border-white/10"
                    title="새 창에서 시청자 화면 미리보기"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <p className="text-[11px] text-amber-400">
                  💡 <b>치지직 방송 설명란</b>, <b>치지직 공지사항</b>, 또는 <b>디스코드</b>에 이 주소를 붙여넣어 공유하세요!
                </p>
              </div>

              {/* QR 코드 보기 토글 */}
              <div className="p-3.5 rounded-2xl bg-[#161828] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">모바일 시청자용 QR 코드</div>
                    <div className="text-[11px] text-slate-400">방송 화면에 띄우거나 폰 카메라로 비춰서 바로 열 수 있습니다.</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowQr(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-[#22263b] hover:bg-[#2a304b] text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {showQr ? 'QR 숨기기' : 'QR 보기'}
                </button>
              </div>

              {/* QR 코드 디스플레이 */}
              {showQr && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-400/30 flex flex-col items-center justify-center gap-3 animate-fadeIn">
                  <img
                    src={qrCodeUrl}
                    alt="Viewer Public Page QR Code"
                    className="w-48 h-48 rounded-xl border-2 border-amber-400/40 p-2 bg-slate-900 shadow-lg"
                  />
                  <span className="text-[11px] text-slate-100 font-medium">
                    스마트폰 카메라로 스캔하면 바로 시청자 전용 공개 페이지가 열립니다 📱
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* 터널 비활성화 상태일 때 모드 설정 탭 */
            <div className="space-y-4">
              <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedMode('quick')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMode === 'quick'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Cloudflare 퀵 (추천)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('token')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMode === 'token'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Cloudflare 고정 토큰</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('subdomain')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMode === 'subdomain'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>서브도메인 (보조)</span>
                </button>
              </div>

              {/* 탭 1: Cloudflare 퀵 터널 (기본 추천) */}
              {selectedMode === 'quick' && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-amber-400/25 space-y-2">
                  <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Cloudflare 초고속 글로벌 터널 (기본 추천)
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    별도 가입이나 비밀번호 입력창 없이 시청자가 클릭 즉시 접속할 수 있는 Cloudflare 전용 HTTPS 링크를 생성합니다.
                    네트워크가 일시적으로 끊겨도 자동으로 재연결되며, 샤봇을 닫아도 계속 유지됩니다.
                  </p>
                </div>
              )}

              {/* 탭 2: Cloudflare Named Tunnel (토큰) */}
              {selectedMode === 'token' && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" /> Cloudflare Tunnel Token
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Cloudflare Zero Trust 대시보드에서 생성한 무료 터널 토큰을 붙여넣으세요.
                    </p>
                  </div>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="eyJh..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">
                      연결된 내 도메인 주소 (선택사항)
                    </label>
                    <input
                      type="text"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      placeholder="https://shabot.mydomain.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* 탭 3: 원클릭 고정 서브도메인 (Localtunnel) */}
              {selectedMode === 'subdomain' && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-amber-400" /> Localtunnel 영문 서브도메인
                    </label>
                    <p className="text-[11px] text-slate-400">
                      참고: Localtunnel(*.loca.lt)은 외부 시청자 최초 접속 시 보안 IP 입력 화면이 표시될 수 있으므로 Cloudflare 퀵 모드를 권장합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">https://</span>
                    <input
                      type="text"
                      value={subdomainInput}
                      onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="shabot-myname"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <span className="text-xs text-slate-400 font-mono">.loca.lt/view</span>
                  </div>
                </div>
              )}

              {/* 백그라운드 상주 안내 배너 */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <strong className="text-amber-300">독립 백그라운드 상주 & 자동 복구 시스템</strong>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    공유를 시작하면 샤봇과 완전히 분리된 백그라운드 서버로 동작하여, <b>샤봇을 닫거나 종료해도</b> 다시 봇을 열어 <b>[공유 중지]</b>를 누르기 전까지 시청자 대시보드가 계속 유지됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 시청자가 볼 수 있는 기능 목록 안내 */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2.5">
            <h5 className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 시청자가 이 링크에서 볼 수 있는 정보
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>주간 방송 일정표 (스냅샷 보존)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-200">
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span>신청곡 대기열 & 주크박스</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-200">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>챗봇 명령어 사전 & 사용법</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-200">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span>생방송 실시간 LIVE / 오프라인 상태</span>
              </div>
            </div>
          </div>

          {/* 보안 방어 안내 */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-extrabold text-emerald-300">스트리머 보안 완벽 격리</div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                외부 인터넷 접속자는 시청자 전용 페이지(`/view`)만 볼 수 있으며, 스트리머 관리자 대시보드와 치지직 API 비밀 키, 설정 변경 권한은 100% 자동 차단되어 안전합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 하단 푸터 버튼 */}
        <div className="p-4 bg-slate-900 border-t border-amber-400/25 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>공유를 멈추실 때만 오른쪽의 공유 중지 버튼을 눌러주세요.</span>
          </div>

          <button
            onClick={handleToggleTunnel}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer ${
              tunnel.isRunning
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-gradient-to-r from-amber-500 to-[#b38825] hover:from-amber-500 hover:to-[#c8982a] text-slate-950 font-black shadow-amber-500/20'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>처리 중...</span>
              </>
            ) : tunnel.isRunning ? (
              <>
                <Power className="w-4 h-4" />
                <span>시청자 대시보드 공유 중지</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>시청자 대시보드 공유 시작 ✨</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
