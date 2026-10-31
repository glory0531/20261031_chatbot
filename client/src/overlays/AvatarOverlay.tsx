import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';

interface Avatar {
  id: string;
  name: string;
  x: number; // percentage (4 ~ 96)
  vx: number; // velocity
  isJumping: boolean;
  message?: string;
  avatarIcon: string;
}

const DEFAULT_AVATARS: Avatar[] = [
  { id: 'av-초코쿠키', name: '초코쿠키', x: 25, vx: 0.1, isJumping: false, avatarIcon: '/assets/cookie_avatar.svg' },
  { id: 'av-딸기잼쿠키', name: '딸기잼쿠키', x: 50, vx: -0.09, isJumping: false, avatarIcon: '/assets/strawberry_cookie.svg' },
  { id: 'av-버터쿠키', name: '버터쿠키', x: 75, vx: 0.11, isJumping: false, avatarIcon: '/assets/butter_cookie.svg' }
];

const ICONS = [
  '/assets/cookie_avatar.svg',
  '/assets/strawberry_cookie.svg',
  '/assets/butter_cookie.svg'
];

export const AvatarOverlay: React.FC = () => {
  const [avatars, setAvatars] = useState<Avatar[]>(DEFAULT_AVATARS);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<Record<string, any>>({});
  const lastChatMap = useRef<Map<string, number>>(new Map());

  // OBS 브라우저 소스 100% 투명 배경 적용
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    document.body.style.backgroundImage = 'none';
  }, []);

  // 채팅 수신 시 점프 트리거 및 1인 1마리 보장 로직
  const handleUserChat = (rawUsername: string, chatMsg?: string) => {
    const username = (rawUsername || '').trim();
    if (!username) return;

    // 300ms 이내 중복 이벤트 방지
    const now = Date.now();
    const lastTime = lastChatMap.current.get(username) || 0;
    if (now - lastTime < 300) return;
    lastChatMap.current.set(username, now);

    setAvatars(prev => {
      const existing = prev.find(a => a.name === username);

      if (existing) {
        return prev.map(a => a.name === username ? { ...a, isJumping: true, message: chatMsg || a.message } : a);
      } else {
        const realAvatars = prev.filter(a => !['초코쿠키', '딸기잼쿠키', '버터쿠키'].includes(a.name));
        const iconIndex = (username.charCodeAt(0) + username.length) % ICONS.length;
        const newAv: Avatar = {
          id: 'av-' + username,
          name: username,
          x: Math.random() * 80 + 10,
          vx: (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.08),
          isJumping: true,
          message: chatMsg,
          avatarIcon: ICONS[iconIndex]
        };
        // 화면에 최대 20마리 유지
        return [...realAvatars.slice(-19), newAv];
      }
    });

    // 2.5초 후 말풍선 및 점프 착지
    if (timeoutsRef.current[username]) {
      clearTimeout(timeoutsRef.current[username]);
    }
    timeoutsRef.current[username] = setTimeout(() => {
      setAvatars(prev => prev.map(a => a.name === username ? { ...a, isJumping: false, message: undefined } : a));
      delete timeoutsRef.current[username];
    }, 2500);
  };

  // 실시간 채팅 및 점프 이벤트 수신
  useEffect(() => {
    const onAvatarChat = (data: { user?: string; username?: string; message?: string }) => {
      const u = data.user || data.username || '';
      if (u) handleUserChat(u, data.message);
    };

    const onChatMessage = (data: { user?: string; message?: string }) => {
      if (data.user) handleUserChat(data.user, data.message);
    };

    const onAvatarAction = (data: { user?: string; action: string }) => {
      if (data.action === 'jump') {
        setAvatars(prev => prev.map(a => {
          if (!data.user || a.name === data.user) {
            return { ...a, isJumping: true };
          }
          return a;
        }));

        setTimeout(() => {
          setAvatars(prev => prev.map(a => ({ ...a, isJumping: false })));
        }, 800);
      }
    };

    socket.on('avatar_chat', onAvatarChat);
    socket.on('chat_message', onChatMessage);
    socket.on('avatar_action', onAvatarAction);

    return () => {
      socket.off('avatar_chat', onAvatarChat);
      socket.off('chat_message', onChatMessage);
      socket.off('avatar_action', onAvatarAction);
      Object.values(timeoutsRef.current).forEach(t => clearTimeout(t));
    };
  }, []);

  // 자연스러운 좌우 이동 물리 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setAvatars(prev => prev.map(a => {
        let nextX = a.x + a.vx;
        let nextVx = a.vx;

        // 화면 벽 충돌 시 반사
        if (nextX <= 4) {
          nextX = 4;
          nextVx = Math.abs(nextVx);
        } else if (nextX >= 96) {
          nextX = 96;
          nextVx = -Math.abs(nextVx);
        }

        // 가끔 자연스러운 방향 전환
        if (Math.random() < 0.015) {
          nextVx = -nextVx;
        }

        return {
          ...a,
          x: nextX,
          vx: nextVx
        };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleManualJump = (username: string) => {
    handleUserChat(username, '폴짝! 🐾');
  };

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 w-full h-full bg-transparent overflow-hidden pointer-events-auto select-none font-sans"
    >
      {/* 바닥 골드 라인 */}
      <div className="absolute bottom-6 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#f59e0b]/50 to-transparent"></div>

      {avatars.map((av) => (
        <div
          key={av.id}
          style={{
            left: `${av.x}%`,
            bottom: av.isJumping ? '88px' : '26px',
            transition: 'bottom 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
          }}
          onClick={() => handleManualJump(av.name)}
          className="absolute -translate-x-1/2 flex flex-col items-center cursor-pointer group"
        >
          {/* 말풍선 (채팅 입력 시) */}
          {av.message && (
            <div className="absolute -top-12 z-20 flex flex-col items-center animate-bounce">
              <div className="px-3 py-1 rounded-xl bg-white text-slate-900 font-extrabold text-[12px] shadow-2xl border-2 border-amber-400 max-w-[180px] truncate">
                {av.message}
              </div>
              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-amber-400"></div>
            </div>
          )}

          {/* 스파클 (점프 시) */}
          {av.isJumping && !av.message && (
            <div className="absolute -top-5 text-sm animate-ping">
              ✨
            </div>
          )}

          {/* 캐릭터 이미지 */}
          <div className="relative transform transition-transform group-hover:scale-120 duration-200">
            <img
              src={av.avatarIcon || '/assets/cookie_avatar.svg'}
              alt={av.name}
              style={{ transform: av.vx < 0 ? 'scaleX(-1)' : 'scaleX(1)' }}
              className="w-16 h-16 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] filter"
            />
          </div>

          {/* 닉네임 배지 */}
          <span className="mt-1 px-2.5 py-0.5 rounded-full bg-[#1C1C1C]/90 text-[#fde68a] font-black text-[11px] shadow-lg border border-[#f59e0b]/40 whitespace-nowrap">
            {av.name}
          </span>
        </div>
      ))}
    </div>
  );
};
