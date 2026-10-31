import React, { useState } from 'react';
import { DownloadCloud, Sparkles, RefreshCw, X, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import { UpdateState } from '../types';
import { api } from '../services/api';

interface UpdateBannerProps {
  update?: UpdateState;
  isLive?: boolean;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ update, isLive }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [dismissedSession, setDismissedSession] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');

  if (!update) return null;

  const waitAndReloadWhenReady = (targetVer: string) => {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const res = await api.getVersion();
        if (res?.success && (res.version === targetVer || attempts > 4)) {
          clearInterval(timer);
          window.location.reload();
        }
      } catch {
        // 재시작 중 연결 일시 끊김은 정상
      }
      if (attempts > 35) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 900);
  };

  const handleApplyUpdate = async () => {
    if (isLive) {
      const ok = window.confirm(
        '현재 생방송 중으로 감지되었습니다.\n업데이트 적용 시 서버가 약 2~3초간 재시작됩니다.\n지금 바로 업데이트하시겠습니까?'
      );
      if (!ok) return;
    }

    setIsApplying(true);
    setApplyMessage('데이터를 안전하게 자동 백업하고 최신 패치를 다운로드하고 있습니다...');
    try {
      const res = await api.applyUpdate();
      if (!res.success) {
        alert('업데이트 실패: ' + (res.message || '알 수 없는 오류'));
        setIsApplying(false);
        return;
      }
      setApplyMessage(`v${update.latestVersion} 패치 적용 및 서버 재시작 중... 잠시 후 자동으로 새로고침됩니다!`);
      setTimeout(() => waitAndReloadWhenReady(update.latestVersion), 1200);
    } catch (err: any) {
      // 서버가 즉시 종료되며 응답이 끊긴 경우에도 폴링으로 복귀 감지
      setApplyMessage('서버를 최신 버전으로 재시작하고 있습니다... 잠시만 기다려주세요.');
      setTimeout(() => waitAndReloadWhenReady(update.latestVersion), 1200);
    }
  };

  // 전체화면 재시작 진행 오버레이
  if (isApplying || update.phase === 'restarting') {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="witch-card max-w-md w-full p-7 rounded-3xl text-center space-y-4 border border-amber-400/40 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
            <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
          </div>
          <h3 className="text-lg font-black text-white">
            샤봇 최신 업데이트 적용 중 (v{update.latestVersion})
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {applyMessage || '시청자 포인트와 모든 설정 데이터는 100% 안전하게 보존됩니다.'}
          </p>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-400 animate-pulse w-3/4 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // 방금 업데이트가 완료된 경우 축하 알림 배너
  if (update.justUpdated && !update.updateAvailable) {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-200 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              🎉 샤봇이 최신 버전 <b>v{update.justUpdated.toVersion}</b>(으)로 성공적으로 업데이트되었습니다! (모든 기존 데이터 보존 완료)
            </span>
          </div>
          <button
            onClick={() => api.dismissUpdateNotice()}
            className="text-emerald-300 hover:text-white p-1 rounded-lg transition-colors"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!update.updateAvailable || dismissedSession) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border-b border-amber-400/35 px-4 py-2.5 text-xs">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              NEW UPDATE
            </span>
            <span className="text-slate-100 font-semibold">
              새로운 샤봇 업데이트가 출시되었습니다!{' '}
              <span className="text-amber-300 font-mono font-bold">
                v{update.currentVersion} → v{update.latestVersion}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {update.changelog && update.changelog.length > 0 && (
              <button
                onClick={() => setShowNotes(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>패치노트</span>
              </button>
            )}
            <button
              onClick={handleApplyUpdate}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>원클릭 업데이트 & 재시작</span>
            </button>
            <button
              onClick={() => setDismissedSession(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              title="이번 실행 동안 숨기기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showNotes && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNotes(false)}>
          <div className="witch-card max-w-lg w-full p-6 rounded-3xl space-y-4 border border-amber-400/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>샤봇 v{update.latestVersion} 업데이트 내역</span>
              </h3>
              <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-2 text-xs text-slate-200 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 max-h-64 overflow-y-auto">
              {update.changelog.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-2">
              {update.releaseUrl ? (
                <a
                  href={update.releaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>GitHub 릴리스 페이지 열기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNotes(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    setShowNotes(false);
                    handleApplyUpdate();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>지금 업데이트</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

