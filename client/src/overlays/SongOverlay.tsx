import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Music, 
  Disc3, 
  Sparkles, 
  Tv, 
  TvMinimal, 
  ListMusic, 
  X, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { socket } from '../services/socket';
import { api } from '../services/api';
import { SongRequestsState } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const SongOverlay: React.FC = () => {
  const [songRequests, setSongRequests] = useState<SongRequestsState | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const playerRef = useRef<any>(null);
  const curSongIdRef = useRef<string | null>(null);
  const isSkippingRef = useRef(false);

  // OBS 브라우저 소스 100% 투명 배경 적용
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.backgroundImage = 'none';
  }, []);

  // 유튜브 IFrame API 스크립트 로드
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }, []);

  // 소켓 동기화
  useEffect(() => {
    socket.on('initial_state', (data: any) => {
      if (data.songRequests) {
        setSongRequests(data.songRequests);
        if (data.songRequests.isPlaying !== undefined) setIsPlaying(data.songRequests.isPlaying);
        if (data.songRequests.volume !== undefined) setVolume(data.songRequests.volume);
        if (data.songRequests.isMuted !== undefined) setIsMuted(data.songRequests.isMuted);
      }
    });

    socket.on('sr_update', (data: SongRequestsState) => {
      setSongRequests(data);
      if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
      if (data.volume !== undefined) setVolume(data.volume);
      if (data.isMuted !== undefined) setIsMuted(data.isMuted);
    });

    // 대시보드에서 전송한 실시간 원격 제어 (재생, 일시정지, 볼륨, 음소거 동기화)
    socket.on('sr_control', (data: { action: string; isPlaying: boolean; volume?: number; isMuted?: boolean }) => {
      console.log('[SongOverlay] Remote sr_control received:', data);
      if (data.action === 'pause') {
        if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
        setIsPlaying(false);
      } else if (data.action === 'play') {
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
        setIsPlaying(true);
      } else if (data.action === 'toggle') {
        if (data.isPlaying) {
          if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
          }
          setIsPlaying(true);
        } else {
          if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
            playerRef.current.pauseVideo();
          }
          setIsPlaying(false);
        }
      }

      if (typeof data.volume === 'number') {
        setVolume(data.volume);
        if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(data.volume);
        }
      }

      if (typeof data.isMuted === 'boolean') {
        setIsMuted(data.isMuted);
        if (playerRef.current) {
          if (data.isMuted && typeof playerRef.current.mute === 'function') {
            playerRef.current.mute();
          } else if (!data.isMuted && typeof playerRef.current.unMute === 'function') {
            playerRef.current.unMute();
          }
        }
      }
    });

    return () => {
      socket.off('sr_update');
      socket.off('sr_control');
    };
  }, []);

  const cur = songRequests?.current;
  const queue = songRequests?.queue || [];

  // 현재 곡 ID 추적
  useEffect(() => {
    curSongIdRef.current = cur ? cur.id : null;
  }, [cur?.id]);

  // 한 곡 종료 시 자동으로 대기열의 다음 곡 연속 재생
  const handleAutoSkip = () => {
    if (isSkippingRef.current) return;
    isSkippingRef.current = true;
    const currentId = curSongIdRef.current;
    console.log('[SongOverlay] 곡 재생 완료! 대기열 다음 곡으로 자동 연속 재생 진행...', currentId);
    api.skipSong(currentId || undefined).finally(() => {
      setTimeout(() => {
        isSkippingRef.current = false;
      }, 1500);
    });
  };

  // 유튜브 플레이어 초기화 및 곡 변경 시 연속 재생
  useEffect(() => {
    if (!cur?.videoId) {
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        try { playerRef.current.stopVideo(); } catch (e) {}
      }
      return;
    }

    const initOrLoad = () => {
      // 기존 플레이어가 이미 있으면 비디오 ID만 교체하여 끊김 없이 연속 재생
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById(cur.videoId);
          if (typeof playerRef.current.setVolume === 'function') {
            playerRef.current.setVolume(volume);
          }
          if (isMuted && typeof playerRef.current.mute === 'function') {
            playerRef.current.mute();
          }
          setIsPlaying(true);
          return;
        } catch (e) {
          console.warn('[SongOverlay] loadVideoById error, recreating player:', e);
        }
      }

      const slot = document.getElementById('yt-overlay-player-slot');
      if (!slot) return;

      try {
        playerRef.current = new window.YT.Player('yt-overlay-player-slot', {
          height: '100%',
          width: '100%',
          videoId: cur.videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: (event: any) => {
              try {
                event.target.setVolume(volume);
                if (isMuted) event.target.mute();
                event.target.playVideo();
                setIsPlaying(true);
              } catch (e) {}
            },
            onStateChange: (event: any) => {
              // 0: ENDED (곡 종료 -> 다음 곡 자동 연속 재생!)
              if (event.data === 0) {
                handleAutoSkip();
              } else if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              }
            },
            onError: (event: any) => {
              console.warn('[SongOverlay] 재생 불가 영상 (외부 재생 제한 등), 2초 후 다음 곡으로 건너뜁니다:', event.data);
              setTimeout(() => {
                handleAutoSkip();
              }, 2500);
            }
          }
        });
      } catch (err) {
        console.error('[SongOverlay] Failed to create YT.Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initOrLoad();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        initOrLoad();
      };
    }
  }, [cur?.videoId]);

  // iframe postMessage 안전 백업 리스너
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;
        // YouTube API infoDelivery playerState: 0 (ENDED) 또는 onStateChange: 0
        if ((data.event === 'onStateChange' && data.info === 0) ||
            (data.event === 'infoDelivery' && data.info && data.info.playerState === 0)) {
          handleAutoSkip();
        } else if ((data.event === 'onStateChange' && data.info === 1) ||
                   (data.event === 'infoDelivery' && data.info && data.info.playerState === 1)) {
          setIsPlaying(true);
        } else if ((data.event === 'onStateChange' && data.info === 2) ||
                   (data.event === 'infoDelivery' && data.info && data.info.playerState === 2)) {
          setIsPlaying(false);
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 재생 / 일시정지 토글 (OBS 상호작용 창 조작 시 대시보드와 즉시 동기화)
  const togglePlay = async () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (next) {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    } else {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    }
    await api.controlSongPlayer({ action: next ? 'play' : 'pause' });
  };

  // 다음 곡 수동 스킵
  const handleSkip = async () => {
    await api.skipSong();
  };

  // 대기열 특정 곡 삭제
  const handleDeleteQueue = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteSong(id);
  };

  // 음량 변경
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newVol);
      if (newVol === 0) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    }
    api.controlSongPlayer({ action: 'volume', volume: newVol });
  };

  // 음소거 토글
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (playerRef.current) {
      if (nextMuted) {
        if (typeof playerRef.current.mute === 'function') playerRef.current.mute();
      } else {
        if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
        if (typeof playerRef.current.setVolume === 'function') playerRef.current.setVolume(volume);
      }
    }
    api.controlSongPlayer({ action: nextMuted ? 'mute' : 'unmute', isMuted: nextMuted });
  };

  // 상호작용 창에서 즉시 노래 신청 추가
  const handleAddQuickSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    await api.addSong(quickInput.trim());
    setQuickInput('');
  };

  return (
    <div 
      className="fixed bottom-6 left-6 flex flex-col pointer-events-auto select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. 유튜브 실제 재생 IFRAME (영상 모드일 때는 화면에 16:9로 표시, 아닐 때는 백그라운드 오디오 전용) */}
      {cur && (
        <div 
          className={`transition-all duration-300 overflow-hidden rounded-2xl border border-[#7A8060]/40 shadow-2xl mb-3 bg-black ${
            showVideo ? 'w-[420px] aspect-video block' : 'w-[1px] h-[1px] opacity-0 pointer-events-none absolute'
          }`}
        >
          <div id="yt-overlay-player-slot" className="w-full h-full" />
        </div>
      )}

      {/* 2. 대기열(Queue) 팝업 드로어 */}
      {showQueue && (
        <div className="w-[360px] max-h-56 mb-3 p-4 rounded-2xl bg-[#1C1C1C]/95 backdrop-blur-xl border border-[#7A8060]/40 shadow-2xl overflow-y-auto space-y-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-extrabold text-[#FFE5B4] flex items-center gap-1.5">
              <ListMusic className="w-4 h-4 text-[#7A8060]" />
              신청곡 대기열 ({queue.length}곡)
            </span>
            <button 
              onClick={() => setShowQueue(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="py-4 text-center text-slate-400 text-[11px]">
              다음 대기 중인 신청곡이 없습니다.
            </div>
          ) : (
            queue.map((s, idx) => (
              <div 
                key={s.id}
                className="p-2 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between gap-2 hover:border-[#7A8060]/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded font-bold text-[10px] bg-slate-800 text-[#7A8060] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate text-[11px]">{s.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">신청: {s.requester}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteQueue(s.id, e)}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 shrink-0"
                  title="대기열에서 제거"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. 메인 인터랙티브 컨트롤 플레이어 카드 */}
      {cur ? (
        <div className="w-[380px] p-3.5 rounded-2xl bg-[#2E2C2E]/90 backdrop-blur-xl border border-[#7A8060]/50 shadow-[0_12px_32px_rgba(0,0,0,0.7)] flex flex-col gap-2.5 transition-all">
          {/* 상단 정보: 앨범아트, 곡명, 신청자, 상태 태그 */}
          <div className="flex items-center gap-3 min-w-0">
            {/* 회전하는 LP 디스크 */}
            <div className="relative w-12 h-12 flex-shrink-0 group cursor-pointer" onClick={togglePlay}>
              <img
                src={cur.thumbnail || `https://img.youtube.com/vi/${cur.videoId}/hqdefault.jpg`}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border border-[#7A8060]/40 shadow-md"
              />
              <div 
                className={`absolute -top-1 -right-1 p-1 rounded-full bg-gradient-to-tr from-[#8E7C6F] to-[#FFE5B4] text-slate-950 shadow-md ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '6s' }}
              >
                <Disc3 className="w-3 h-3" />
              </div>
            </div>

            {/* 곡 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-extrabold text-[#7A8060] flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> 별빛 오르골 재생 중
                </span>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-black flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 자동 연속 재생
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    대기 <strong className="text-[#FFE5B4]">{queue.length}</strong>곡
                  </span>
                </div>
              </div>
              <h3 className="font-extrabold text-xs text-white truncate drop-shadow mt-0.5" title={cur.title}>
                {cur.title}
              </h3>
              <p className="text-[10px] text-[#7A8060] truncate">
                신청자: <span className="text-[#FFE5B4] font-bold">{cur.requester}</span>
              </p>
            </div>
          </div>

          {/* 하단 컨트롤러 바 (OBS 상호작용 창 및 마우스 오버 시 조작 가능) */}
          <div className="pt-2 border-t border-[#7A8060]/20 flex items-center justify-between gap-2">
            {/* 재생 / 일시정지 & 스킵 버튼 */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePlay}
                className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8E7C6F] to-[#FFE5B4] hover:from-[#7A8060] hover:to-[#fff] text-slate-950 flex items-center justify-center font-black transition-all shadow-md active:scale-95"
                title={isPlaying ? "일시정지" : "재생"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={handleSkip}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#FFE5B4] flex items-center justify-center transition-all border border-[#7A8060]/30 shadow-sm active:scale-95"
                title="다음 곡으로 스킵"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 볼륨 슬라이더 */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-white/5">
              <button 
                onClick={toggleMute}
                className="text-slate-300 hover:text-white"
                title={isMuted ? "음소거 해제" : "음소거"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#7A8060]" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-16 h-1 accent-[#7A8060] bg-slate-800 rounded-lg cursor-pointer"
                title={`음량: ${isMuted ? 0 : volume}%`}
              />
            </div>

            {/* 영상 토글 & 대기열 토글 버튼 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowVideo(prev => !prev)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                  showVideo 
                    ? 'bg-[#7A8060] text-slate-950 border-[#7A8060]' 
                    : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10'
                }`}
                title={showVideo ? "영상 화면 숨기기" : "유튜브 영상 화면 보기"}
              >
                {showVideo ? <Tv className="w-3.5 h-3.5" /> : <TvMinimal className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setShowQueue(prev => !prev)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                  showQueue 
                    ? 'bg-[#7A8060] text-slate-950 border-[#7A8060]' 
                    : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10'
                }`}
                title="신청곡 대기열 보기"
              >
                <ListMusic className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 대기 상태 카드: 현재 곡이 없을 때 미니 배지 표시 및 즉시 신청 가능 */
        <div className="w-[340px] p-3 rounded-2xl bg-[#2E2C2E]/85 backdrop-blur-md border border-[#7A8060]/35 shadow-xl flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-[#7A8060]/30 flex items-center justify-center text-[#7A8060] shrink-0">
              <Music className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate">별빛 오르골 대기 중</div>
              <div className="text-[10px] text-slate-400 truncate">채팅에 <strong className="text-[#FFE5B4]">!sr [곡명]</strong>을 입력하세요</div>
            </div>
          </div>

          <form onSubmit={handleAddQuickSong} className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="곡명 / 링크..."
              className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-white/10 text-[10px] text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="p-1 rounded-lg bg-[#7A8060] hover:bg-[#FFE5B4] text-slate-950 font-bold transition-all shadow"
              title="노래 즉시 추가"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
