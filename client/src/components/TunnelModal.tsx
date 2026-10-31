import React, { useState } from 'react';
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
  Radio
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

  if (!isOpen) return null;

  const viewerUrl = tunnel.viewerUrl || (tunnel.publicUrl ? `${tunnel.publicUrl}/view` : '');

  const handleToggleTunnel = async () => {
    setIsLoading(true);
    try {
      if (tunnel.isRunning) {
        await api.stopTunnel();
      } else {
        await api.startTunnel();
      }
    } catch (err: any) {
      alert('공개 링크 전환 중 오류가 발생했습니다: ' + err.message);
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

  // QR 코드 이미지 주소 (외부 라이브러리 없이 표준 API 활용)
  const qrCodeUrl = viewerUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=e5c158&bgcolor=141624&data=${encodeURIComponent(viewerUrl)}`
    : '';

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
                  <span>시청자 전용 공개 링크 공유</span>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </h3>
                {tunnel.isRunning ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    인터넷 공개 중
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold">
                    비활성화 상태
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-400 mt-0.5">
                시청자가 스마트폰이나 PC로 방송 일정표, 노래신청 대기열을 바로 볼 수 있는 보안 링크를 생성합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 바디 컨텐츠 */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* 터널 활성화 상태일 때 */}
          {tunnel.isRunning && viewerUrl ? (
            <div className="space-y-4">
              {/* 공유 링크 박스 */}
              <div className="p-4 rounded-2xl bg-[#181a2b] border border-amber-400/30 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-400" /> 시청자 접속 전용 HTTPS 주소
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">Cloudflare 보안 터널 가동 중</span>
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
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#aa8323] hover:from-amber-500 hover:to-[#be942a] text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
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
                  className="px-3 py-1.5 rounded-xl bg-[#22263b] hover:bg-[#2a304b] text-amber-300 text-xs font-bold transition-colors"
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
            /* 터널 비활성화 상태일 때 안내 */
            <div className="text-center py-6 px-4 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/25 text-amber-400 mx-auto flex items-center justify-center">
                <Globe className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-white">아직 공개 링크가 켜져 있지 않습니다</h4>
                <p className="text-xs text-amber-400 max-w-sm mx-auto leading-relaxed">
                  [공개 링크 생성하기] 버튼을 누르면 Cloudflare 보안망을 통해 전 세계 어디서나 접속할 수 있는 암호화된 HTTPS 링크가 즉시 발급됩니다.
                </p>
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
                <span>주간 방송 일정표</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-200">
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span>별빛 주크박스 신청곡 대기열</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-200">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>챗봇 명령어 & 사용법</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-200">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span>생방송 실시간 라이브 상태</span>
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
            <span>방송을 마치면 안전을 위해 링크를 닫아주세요.</span>
          </div>

          <button
            onClick={handleToggleTunnel}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 ${
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
                <span>공개 링크 종료하기</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>공개 링크 생성하기 ✨</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
