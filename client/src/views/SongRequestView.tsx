import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  Trash2, 
  Plus, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Radio, 
  Repeat, 
  Headphones, 
  Cast, 
  Sliders 
} from 'lucide-react';
import { SongRequestsState } from '../types';
import { api } from '../services/api';
import { socket } from '../services/socket';

interface SongRequestViewProps {
  songRequests: SongRequestsState;
}

export const SongRequestView: React.FC<SongRequestViewProps> = ({ songRequests }) => {
  const [newSongInput, setNewSongInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(songRequests.isPlaying ?? true);
  const [volume, setVolume] = useState(songRequests.volume ?? 80);
  const [isMuted, setIsMuted] = useState(songRequests.isMuted ?? false);
  const [dashboardAudio, setDashboardAudio] = useState(false); // OBS와 중복 소리(에코) 방지를 위해 대시보드 미리보기는 기본 음소거

  const curSongIdRef = useRef<string | null>(null);
  const isSkippingRef = useRef(false);

  const cur = songRequests.current;

  useEffect(() => {
    curSongIdRef.current = cur ? cur.id : null;
  }, [cur?.id]);

  useEffect(() => {
    if (songRequests.isPlaying !== undefined) setIsPlaying(songRequests.isPlaying);
    if (songRequests.volume !== undefined) setVolume(songRequests.volume);
    if (songRequests.isMuted !== undefined) setIsMuted(songRequests.isMuted);
  }, [songRequests.isPlaying, songRequests.volume, songRequests.isMuted]);

  // 소켓 실시간 동기화
  useEffect(() => {
    socket.on('sr_control', (data: any) => {
      console.log('[Dashboard] sr_control received:', data);
      if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);
      if (data.volume !== undefined) setVolume(data.volume);
      if (data.isMuted !== undefined) setIsMuted(data.isMuted);
    });

    return () => {
      socket.off('sr_control');
    };
  }, []);

  // 곡 종료 시 다음 대기곡으로 자동 연속 이동
  const handleAutoSkip = () => {
    if (isSkippingRef.current) return;
    isSkippingRef.current = true;
    const currentId = curSongIdRef.current;
    console.log('[Dashboard SR] 곡 종료 감지! 다음 대기곡으로 자동 연속 재생...', currentId);
    api.skipSong(currentId || undefined).finally(() => {
      setTimeout(() => {
        isSkippingRef.current = false;
      }, 1500);
    });
  };

  // 유튜브 iframe 종료 감지
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;
        if ((data.event === 'onStateChange' && data.info === 0) ||
            (data.event === 'infoDelivery' && data.info && data.info.playerState === 0)) {
          handleAutoSkip();
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongInput.trim()) return;
    await api.addSong(newSongInput.trim());
    setNewSongInput('');
  };

  // OBS와 실시간 연동되는 재생 / 일시정지 토글
  const handleTogglePlay = async () => {
    const next = !isPlaying;
    setIsPlaying(next);
    await api.controlSongPlayer({ action: next ? 'play' : 'pause' });
  };

  // OBS 송출 볼륨 실시간 조절
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    api.controlSongPlayer({ action: 'volume', volume: newVol });
  };

  // OBS 송출 음소거 토글
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    api.controlSongPlayer({ action: nextMuted ? 'mute' : 'unmute', isMuted: nextMuted });
  };

  const handleSkip = async () => {
    await api.skipSong();
  };

  const handleDelete = async (id: string) => {
    await api.deleteSong(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-indigo-400" />
            재즈 & LP 주크박스 (신청곡 SR)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            시청자가 채팅으로 <b className="text-indigo-400">!sr [곡명 또는 유튜브링크]</b>를 입력하면 감미로운 유튜브 음악을 검색하여 순서대로 재생합니다.
          </p>
        </div>

        {/* 직접 신청 추가 */}
        <form onSubmit={handleAddSong} className="flex items-center gap-2">
          <input
            type="text"
            value={newSongInput}
            onChange={(e) => setNewSongInput(e.target.value)}
            placeholder="유튜브 링크 or 노래 제목 (예: 노라조 형)..."
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" /> 곡 추가
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측: 현재 재생 중인 플레이어 (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-[#151926] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5 ${
                isPlaying ? 'bg-indigo-500/20 text-indigo-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-indigo-400 animate-pulse' : 'bg-rose-400'}`}></span>
                {isPlaying ? 'Now Playing (재생 중)' : 'Paused (일시정지됨)'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 자동 연속 재생
              </span>
            </div>

            {/* 대시보드 미리보기 소리 토글 */}
            <button
              onClick={() => setDashboardAudio(prev => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1.5 ${
                dashboardAudio 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                  : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
              }`}
              title={dashboardAudio ? "대시보드 소리 끄기 (OBS 송출 전용)" : "대시보드에서도 소리 듣기 (주의: OBS와 동시 재생 시 에코가 발생할 수 있습니다)"}
            >
              <Headphones className="w-3 h-3" />
              {dashboardAudio ? '대시보드 소리 ON' : '대시보드 음소거 (OBS 송출 중)'}
            </button>
          </div>

          {cur ? (
            <div className="space-y-4">
              {/* 유튜브 임베드 플레이어 */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg border border-white/10">
                <iframe
                  key={cur.videoId + (dashboardAudio ? '-unmuted' : '-muted')}
                  src={`https://www.youtube.com/embed/${cur.videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}${dashboardAudio ? '' : '&mute=1'}`}
                  title={cur.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
                {!isPlaying && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 pointer-events-none">
                    <Pause className="w-8 h-8 text-amber-400 fill-current" />
                    <span className="text-xs font-bold text-amber-300">OBS 방송 화면 음악이 일시정지되었습니다</span>
                  </div>
                )}
              </div>

              {/* 곡 제목 및 신청자 정보 */}
              <div>
                <h3 className="text-lg font-black text-white line-clamp-1">{cur.title}</h3>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>신청자: <strong className="text-indigo-300">{cur.requester}</strong></span>
                  <a
                    href={cur.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    유튜브 열기 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* OBS 실시간 동기화 마스터 컨트롤 데크 */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                    <Cast className="w-4 h-4 text-amber-400" />
                    OBS 방송 플레이어 실시간 동기화 제어
                  </span>
                  <span className="text-[10px] text-slate-400">
                    상태: <strong className={isPlaying ? "text-emerald-400" : "text-amber-400"}>{isPlaying ? "방송 재생 중" : "일시정지됨"}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* 큰 재생 / 일시정지 버튼 */}
                  <button
                    onClick={handleTogglePlay}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                      isPlaying 
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" /> OBS 방송 음악 일시정지
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current ml-0.5" /> OBS 방송 음악 다시 재생
                      </>
                    )}
                  </button>

                  {/* 다음 곡 스킵 버튼 */}
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all active:scale-95 shadow-sm"
                    title="다음 대기곡으로 넘기기"
                  >
                    <SkipForward className="w-4 h-4 text-amber-400" /> 다음 곡 넘기기
                  </button>
                </div>

                {/* OBS 송출 볼륨 및 음소거 조절 바 */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={handleToggleMute}
                      className="p-1 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white"
                      title={isMuted ? "OBS 음소거 해제" : "OBS 송출 음소거"}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="flex-1 h-1.5 accent-amber-400 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-300 w-9 text-right">
                      {isMuted ? 'MUTE' : `${volume}%`}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                  💡 여기서 일시정지/재생/볼륨을 조절하면 <strong>OBS 방송 화면 및 오디오</strong>에 즉시 반영됩니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
              <Music className="w-12 h-12 mb-3 text-slate-700" />
              재생 중인 노래가 없습니다.<br />위 입력창이나 채팅창에 !sr 노래제목을 입력해보세요!
            </div>
          )}
        </div>

        {/* 우측: 노래 대기열 리스트 (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/70 border border-white/10 shadow-xl flex flex-col h-[480px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <h3 className="font-bold text-sm text-white">
              대기열 목록 ({songRequests.queue.length}곡)
            </h3>
            <span className="text-xs text-slate-400">최대 {songRequests.settings?.maxQueueSize || 20}곡</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {songRequests.queue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                현재 대기 중인 신청곡이 없습니다.
              </div>
            ) : (
              songRequests.queue.map((song, idx) => (
                <div
                  key={song.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3 text-xs hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {idx + 1}
                    </span>
                    <img
                      src={song.thumbnail}
                      alt=""
                      className="w-12 h-8 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{song.title}</div>
                      <div className="text-[11px] text-slate-400">신청자: {song.requester}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(song.id)}
                    className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors flex-shrink-0"
                    title="대기열에서 제거"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
