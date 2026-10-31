import React, { useState } from 'react';
import { Layers, Copy, Check, ExternalLink, X, Monitor, Info } from 'lucide-react';

interface OverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OverlayModal: React.FC<OverlayModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = window.location.origin;

  const overlays = [
    {
      key: 'avatar',
      name: '채팅 인터랙션 도트 아바타 오버레이',
      url: `${origin}/overlay/avatar`,
      resolution: '1920 x 1080 (화면 하단 투명)',
      desc: '시청자가 채팅을 치면 귀여운 도트 아바타들이 화면 바닥을 아장아장 걸어다니며 말풍선을 띄우고 점프합니다.'
    },
    {
      key: 'alert',
      name: '포인트 후원 알림 (TTS)',
      url: `${origin}/overlay/alert`,
      resolution: '1920 x 1080 (중앙 투명)',
      desc: '!도네 후원 발생 시 팝업 애니메이션, 색종이 폭죽, 한국어 TTS 음성이 재생됩니다.'
    },
    {
      key: 'sr',
      name: '노래 신청 플레이어 (OBS 직접 컨트롤 가능)',
      url: `${origin}/overlay/sr`,
      resolution: '460 x 180 (위젯형) / 640 x 360 (영상 표시형)',
      desc: '유튜브 음원/영상이 직접 재생되는 플레이어입니다. OBS 소스 우클릭 › [상호작용]을 누르면 일시정지, 다음곡 스킵, 볼륨 조절, 대기열 확인/삭제, 영상 토글을 OBS 창 안에서 바로 제어할 수 있습니다.'
    },
    {
      key: 'goal',
      name: '포인트 모금 진행률 바',
      url: `${origin}/overlay/goal`,
      resolution: '360 x 100 (우상단 추천)',
      desc: '!모금으로 모인 포인트의 목표 달성률을 실시간 게이지 막대로 보여줍니다.'
    },
    {
      key: 'roulette',
      name: '룰렛 게임 위젯',
      url: `${origin}/overlay/roulette`,
      resolution: '500 x 500 (화면 중앙)',
      desc: '룰렛을 돌릴 때 방송 화면에 돌아가는 룰렛 판과 당첨 결과를 띄웁니다.'
    }
  ];

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">
              OBS Studio 브라우저 소스 오버레이 URL
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OBS 연동 안내 박스 */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong>OBS 사용 방법:</strong> OBS Studio 소스 목록에서 <b>[+] 버튼 › [브라우저]</b>를 추가하고 URL을 붙여넣으세요. 배경은 100% 투명 처리됩니다.
            <br />
            <span className="text-amber-300 font-bold">💡 화면이 이전 모습 그대로라면?</span> OBS 브라우저 소스 속성 창 맨 아래의 <b>[현재 페이지의 캐시를 새로고침]</b> 버튼을 누르면 즉시 새로운 이미지로 갱신됩니다!
          </div>
        </div>

        {/* 오버레이 목록 */}
        <div className="space-y-3">
          {overlays.map((ov) => (
            <div
              key={ov.key}
              className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{ov.name}</h4>
                  <span className="text-[11px] text-slate-400">권장 해상도: {ov.resolution}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={ov.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-white/5"
                    title="새 창에서 미리보기"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleCopy(ov.key, ov.url)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all shadow-md shadow-amber-500/10"
                  >
                    {copiedKey === ov.key ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> 복사 완료!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> URL 복사
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-white/5 font-mono text-[11px] text-slate-400 truncate select-all">
                {ov.url}
              </div>

              <p className="text-xs text-slate-400 leading-normal">{ov.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
