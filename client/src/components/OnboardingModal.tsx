import React, { useState } from 'react';
import { Sparkles, Radio, Palette, UserCheck, Check, ChevronRight, ChevronLeft, Search, Loader2 } from 'lucide-react';
import { Settings, ThemePreset } from '../types';
import { THEME_PRESETS } from '../constants/themes';
import { api } from '../services/api';

interface OnboardingModalProps {
  isOpen: boolean;
  settings: Settings;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, settings, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channelInput, setChannelInput] = useState(settings.chzzkChannelId || '');
  const [streamerName, setStreamerName] = useState(
    settings.streamerName && settings.streamerName !== '스트리머' ? settings.streamerName : ''
  );
  const [botName, setBotName] = useState(settings.botName ?? '샤봇');
  const [fandomName, setFandomName] = useState(settings.fandomName || '시청자');
  const [pointName, setPointName] = useState(settings.pointName || 'P');
  const [themePreset, setThemePreset] = useState<ThemePreset>(settings.themePreset || 'chzzk-emerald');

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{
    channelId: string;
    channelName: string;
    channelImageUrl: string;
    followerCount: number;
  } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handlePreviewTheme = (preset: ThemePreset) => {
    setThemePreset(preset);
    document.documentElement.dataset.theme = preset;
  };

  const handleLookupChannel = async () => {
    if (!channelInput.trim()) {
      setLookupError('치지직 채널 주소(URL) 또는 32자리 UID를 입력해주세요.');
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await api.lookupChzzkChannel(channelInput.trim());
      if (res.success && res.data) {
        setLookupInfo(res.data);
        setChannelInput(res.data.channelId);
        if (!streamerName) {
          setStreamerName(res.data.channelName);
        }
      } else {
        setLookupError(res.message || '채널 정보를 찾을 수 없습니다.');
      }
    } catch (err: any) {
      setLookupError(err.message || '채널 조회 중 오류가 발생했습니다.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleFinish = async (skipChannel = false) => {
    setSaving(true);
    try {
      const finalChannelId = skipChannel ? '' : (lookupInfo?.channelId || channelInput.trim());
      const finalStreamer = streamerName.trim() || lookupInfo?.channelName || '스트리머';

      await api.updateSettings({
        streamerName: finalStreamer,
        botName: typeof botName === 'string' ? botName.trim() : '',
        fandomName: fandomName.trim() || '시청자',
        pointName: pointName.trim() || 'P',
        themePreset,
        chzzkChannelId: finalChannelId,
        onboardingCompleted: true
      });

      if (finalChannelId) {
        await api.connectChzzk(finalChannelId);
      }

      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="witch-card max-w-xl w-full rounded-3xl p-6 sm:p-8 border border-amber-400/35 shadow-2xl space-y-6">
        {/* 상단 헤더 & 진행 단계 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl">
              🐻
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>오픈 샤봇 1분 초기 세팅</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">
                모든 설정은 언제든 [환경설정] 탭에서 자유롭게 다시 변경할 수 있어요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-2 rounded-full transition-all ${
                  step === n ? 'w-7 bg-amber-400' : step > n ? 'w-2.5 bg-amber-400/60' : 'w-2.5 bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: 치지직 채널 연결 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
                <Radio className="w-4 h-4" />
                <span>1단계. 내 치지직 방송 채널 연결하기</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                본인의 치지직 채널 주소(예: <code className="text-amber-300">https://chzzk.naver.com/xxxx...</code>)를 그대로 붙여넣거나 32자리 채널 UID를 입력해주세요.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder="치지직 채널 주소 또는 32자리 UID 붙여넣기"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleLookupChannel}
                  disabled={lookupLoading}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>채널 확인</span>
                </button>
              </div>

              {lookupError && (
                <p className="text-xs text-rose-400 font-semibold">{lookupError}</p>
              )}

              {lookupInfo && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  {lookupInfo.channelImageUrl ? (
                    <img src={lookupInfo.channelImageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">🐻</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-white truncate">{lookupInfo.channelName}</div>
                    <div className="text-[11px] text-emerald-300">
                      팔로워 {lookupInfo.followerCount.toLocaleString()}명 · 채널 확인 완료!
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                아직 채널 연결 없이 먼저 둘러볼래요 (건너뛰기)
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>다음 단계</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: 호칭 커스터마이징 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
                <UserCheck className="w-4 h-4" />
                <span>2단계. 내 방송 맞춤 호칭 & 단위 설정</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">스트리머 이름 (닉네임)</label>
                  <input
                    type="text"
                    value={streamerName}
                    onChange={(e) => setStreamerName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">챗봇 이름</label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="기본값: 샤봇"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">시청자 / 팬덤 애칭</label>
                  <input
                    type="text"
                    value={fandomName}
                    onChange={(e) => setFandomName(e.target.value)}
                    placeholder="기본값: 시청자 (예: 팬딩이, 단골)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">포인트 화폐 단위</label>
                  <input
                    type="text"
                    value={pointName}
                    onChange={(e) => setPointName(e.target.value)}
                    placeholder="기본값: P (예: 쿠키, 골드, 칩)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>테마 선택하기</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: 컬러 테마 프리셋 선택 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
                <Palette className="w-4 h-4" />
                <span>3단계. 대시보드 & 시청자 페이지 테마 선택 (실시간 미리보기)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {THEME_PRESETS.map((t) => {
                  const selected = themePreset === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePreviewTheme(t.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        selected
                          ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-white">{t.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold">
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2.5">{t.subtitle}</p>
                      <div className="flex items-center gap-1.5">
                        {t.swatches.map((hex, i) => (
                          <span
                            key={i}
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

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleFinish(false)}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>샤봇 시작하기!</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

