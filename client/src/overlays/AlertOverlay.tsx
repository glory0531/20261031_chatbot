import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { socket } from '../services/socket';
import { DonationAlert } from '../types';

export const AlertOverlay: React.FC = () => {
  const [currentAlert, setCurrentAlert] = useState<DonationAlert | null>(null);
  const [queue, setQueue] = useState<DonationAlert[]>([]);

  // 소켓 후원 알림 이벤트 수신
  useEffect(() => {
    socket.on('donation_alert', (data: DonationAlert) => {
      console.log('[Overlay] Donation alert received:', data);
      setQueue(prev => [...prev, data]);
    });

    return () => {
      socket.off('donation_alert');
    };
  }, []);

  // 큐 처리 로직
  useEffect(() => {
    if (!currentAlert && queue.length > 0) {
      const nextAlert = queue[0];
      setQueue(prev => prev.slice(1));
      setCurrentAlert(nextAlert);

      // 1. 황금빛 & 별빛 색종이 폭죽 효과
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#7A8060', '#8E7C6F', '#FFE5B4', '#7A8060', '#8B5A2B']
      });

      // 2. 한국어 Web Speech API TTS 낭독
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const textToSpeak = `${nextAlert.user}님이 ${nextAlert.amount}포인트 후원! ${nextAlert.message}`;
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.lang = 'ko-KR';
          utterance.rate = 1.0;
          utterance.pitch = 0.88; // 능글맞고 여유로운 아저씨, 낮은 목소리
          utterance.rate = 0.95;

          const voices = window.speechSynthesis.getVoices();
          const koVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KO'));
          if (koVoice) utterance.voice = koVoice;

          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.error('TTS error:', e);
      }

      // 3. 5.5초 후 알림 닫기
      const timer = setTimeout(() => {
        setCurrentAlert(null);
      }, 5500);

      return () => clearTimeout(timer);
    }
  }, [currentAlert, queue]);

  if (!currentAlert) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-transparent select-none pointer-events-none">
      <div className="w-full max-w-lg p-7 rounded-[32px] bg-[#1C1C1C]/95 backdrop-blur-2xl border-4 border-[#7A8060] shadow-[0_0_60px_rgba(197,164,109,0.4)] text-center space-y-4 transform animate-bounce duration-500 relative overflow-hidden">
        {/* 상단 앤틱 골드 리본 장식 */}
        <div className="absolute top-2 left-6 text-[#7A8060] text-xs">✦</div>
        <div className="absolute top-2 right-6 text-[#7A8060] text-xs">✦</div>

        {/* 초승달 & 별빛 마녀 심볼 바운스 */}
        <div className="w-22 h-22 mx-auto rounded-3xl bg-gradient-to-tr from-[#8E7C6F] via-[#7A8060] to-[#FFE5B4] border-4 border-[#FFE5B4] flex items-center justify-center text-4xl shadow-2xl shadow-[#7A8060]/30">
          🥃
        </div>

        {/* 후원자 및 금액 */}
        <div>
          <span className="text-xs font-black tracking-widest text-[#8E7C6F] uppercase">
            ✦ SPECIAL RESERVE DONATION ✦
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#FFE5B4] tracking-tight mt-1">
            <span className="text-[#7A8060] drop-shadow">{currentAlert.user}</span> 님의 특별 후원!
          </h2>
          <div className="mt-2 inline-block px-5 py-1.5 rounded-full bg-gradient-to-r from-[#8E7C6F] to-[#7A8060] text-[#1C1C1C] font-black text-xl shadow-lg">
            {currentAlert.amount.toLocaleString()} P
          </div>
        </div>

        {/* 후원 메시지 (크림 양피지 룬 양식) */}
        <div className="p-4 rounded-2xl bg-[#2E2C2E] border-2 border-[#7A8060]/50 text-[#FFE5B4] font-extrabold text-lg leading-relaxed break-words shadow-inner">
          "{currentAlert.message}"
        </div>
      </div>
    </div>
  );
};
