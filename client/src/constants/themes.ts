import { ThemePreset } from '../types';

export interface ThemePresetMeta {
  id: ThemePreset;
  name: string;
  subtitle: string;
  badge: string;
  swatches: [string, string, string, string];
}

export const THEME_PRESETS: ThemePresetMeta[] = [
  {
    id: 'chzzk-emerald',
    name: '치지직 네온 에메랄드',
    subtitle: '모던 다크 슬레이트 & 치지직 시그니처 그린',
    badge: '기본 추천',
    swatches: ['#0B0F14', '#131A22', '#00E693', '#F8FAFC']
  },
  {
    id: 'cookie-amber',
    name: '샤봇 쿠키 골드',
    subtitle: '따뜻한 에스프레소 브라운 & 골든 앰버',
    badge: '샤봇 오리지널',
    swatches: ['#16120E', '#221B15', '#FBBF24', '#FEF3C7']
  },
  {
    id: 'midnight-violet',
    name: '미드나잇 퍼플 네온',
    subtitle: '사이버 인디고 & 비비드 바이올렛 게이밍 무드',
    badge: '게이밍',
    swatches: ['#0D0B18', '#17132A', '#C084FC', '#F5F3FF']
  },
  {
    id: 'luxury-salon',
    name: '클래식 올리브 살롱',
    subtitle: '딥 오닉스 & 뮤트 올리브 하이엔드 라운지',
    badge: '클래식',
    swatches: ['#1C1C1C', '#292829', '#7A8060', '#FFE5B4']
  },
  {
    id: 'rose-blossom',
    name: '로즈 블라썸 다크',
    subtitle: '벨벳 다크 & 소프트 로즈 핑크 하이라이트',
    badge: '감성 토크',
    swatches: ['#160D12', '#22141C', '#FB7185', '#FFF1F2']
  }
];
