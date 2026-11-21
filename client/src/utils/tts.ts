import { RouletteSpinSummaryItem } from '../types';

export interface KoreanAiVoicePreset {
  id: string;
  voice: 'ko-KR-SunHiNeural' | 'ko-KR-InJoonNeural' | 'ko-KR-HyunsuMultilingualNeural';
  label: string;
  defaultRate: number;
  defaultPitch: number;
}

export const KOREAN_AI_VOICES: KoreanAiVoicePreset[] = [
  {
    id: 'ko-KR-SunHiNeural',
    voice: 'ko-KR-SunHiNeural',
    label: '선희 (여성 · 자연스러운 기본)',
    defaultRate: 1.0,
    defaultPitch: 0
  },
  {
    id: 'ko-KR-SunHiNeural|calm',
    voice: 'ko-KR-SunHiNeural',
    label: '선희 (여성 · 차분하고 나긋한 톤)',
    defaultRate: 0.95,
    defaultPitch: -8
  },
  {
    id: 'ko-KR-SunHiNeural|bright',
    voice: 'ko-KR-SunHiNeural',
    label: '선희 (여성 · 밝고 경쾌한 하이톤)',
    defaultRate: 1.06,
    defaultPitch: 10
  },
  {
    id: 'ko-KR-InJoonNeural',
    voice: 'ko-KR-InJoonNeural',
    label: '인준 (남성 · 차분하고 또렷한 톤)',
    defaultRate: 1.0,
    defaultPitch: 0
  },
  {
    id: 'ko-KR-HyunsuMultilingualNeural',
    voice: 'ko-KR-HyunsuMultilingualNeural',
    label: '현수 (남성 · 따뜻하고 부드러운 AI 톤)',
    defaultRate: 1.0,
    defaultPitch: 0
  }
];

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

/** 이모지·대괄호 등 발음을 끊기게 만드는 기호를 정리하여 구어체로 다듬습니다. */
export function sanitizeTextForSpeech(raw: string): string {
  return String(raw || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 룰렛 당첨 내역을 닉네임·꽝 없이 "{{당첨내역}} N개" 형식으로 간단히 읽어줄 문장을 생성합니다.
 */
export function buildRouletteTtsText(params: {
  user?: string | null;
  winner: string;
  totalPulls?: number;
  resultsSummary?: RouletteSpinSummaryItem[];
}): string {
  const { winner, resultsSummary = [] } = params;
  const isLoss = (name: string) => name.includes('꽝') || name.includes('다음 기회');

  if (Array.isArray(resultsSummary) && resultsSummary.length > 0) {
    const validItems = resultsSummary
      .map((s) => ({
        name: sanitizeTextForSpeech(s.name || ''),
        count: Math.max(1, Number(s.count) || 1)
      }))
      .filter((s) => s.name && !isLoss(s.name));

    if (validItems.length === 0) {
      return '아쉽지만 꽝입니다.';
    }
    return validItems.map((s) => `${s.name} ${s.count}개`).join(', ');
  }

  const cleanWinner = sanitizeTextForSpeech(winner || '');
  if (!cleanWinner || isLoss(cleanWinner)) {
    return '아쉽지만 꽝입니다.';
  }
  return `${cleanWinner} 1개`;
}

/**
 * 서버의 한국어 AI 신경망 TTS(/api/tts)를 Blob으로 받아 자연스럽게 재생하고, 실패 시 브라우저 음성으로 폴백합니다.
 */
export async function speakNaturalTts(options: {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}): Promise<void> {
  const {
    text,
    voice = 'ko-KR-SunHiNeural',
    rate = 1.0,
    pitch = 0
  } = options;

  const cleanText = sanitizeTextForSpeech(text);
  if (!cleanText) return;

  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {}
    currentAudio = null;
  }
  if (currentObjectUrl) {
    try {
      URL.revokeObjectURL(currentObjectUrl);
    } catch {}
    currentObjectUrl = null;
  }

  const actualVoice = String(voice || 'ko-KR-SunHiNeural').split('|')[0];
  const apiBase = window.location.port === '24701' ? 'http://localhost:24700/api' : '/api';
  const url = `${apiBase}/tts?text=${encodeURIComponent(cleanText)}&voice=${encodeURIComponent(actualVoice)}&rate=${encodeURIComponent(String(rate))}&pitch=${encodeURIComponent(String(pitch))}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`TTS HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    currentObjectUrl = objUrl;

    const audio = new Audio(objUrl);
    currentAudio = audio;
    audio.onended = () => {
      if (currentObjectUrl === objUrl) {
        URL.revokeObjectURL(objUrl);
        currentObjectUrl = null;
      }
    };
    await audio.play();
    return;
  } catch (err) {
    console.warn('[TTS] AI 음성 생성 실패 -> 브라우저 기본 음성 폴백:', err);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = 'ko-KR';
        utter.rate = rate;
        window.speechSynthesis.speak(utter);
      } catch {}
    }
  }
}
