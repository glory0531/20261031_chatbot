export type ThemePreset =
  | 'chzzk-emerald'
  | 'cookie-amber'
  | 'midnight-violet'
  | 'luxury-salon'
  | 'rose-blossom';

export type CurrencyType = 'points' | 'chips';

export interface ChannelStatus {
  botEnabled: boolean;
  channelId: string;
  channelName: string;
  channelImageUrl?: string;
  followerCount?: number;
  title: string;
  category: string;
  viewers: number;
  isLive?: boolean;
  openDate?: string;
  startTime: number;
  uptimeSeconds: number;
}

export interface Settings {
  prefix: string;
  botName: string;
  streamerName?: string;
  fandomName?: string;
  themePreset?: ThemePreset;
  onboardingCompleted?: boolean;
  autoUpdateOnStart?: boolean;
  autoSimulatorEnabled?: boolean;
  ttsEnabled: boolean;
  ttsVoice: string;
  pointName: string;
  chipName?: string;
  chatPoints: number;
  chatIntervalSeconds: number;
  attendPoints: number;
  attendStreakBonus: number;
  cheesePointEnabled?: boolean;
  cheesePointRatePercent?: number;
  includeMissionCheese?: boolean;
  cheeseDonateOverlay?: boolean;
  cheeseChatNotice?: boolean;
  cheeseAutoFund?: boolean;
  donateCurrency?: CurrencyType;
  platform: 'chzzk' | 'soop' | 'twitch' | 'simulator';
  chzzkChannelId: string;
  chzzkChatChannelId: string;
  chzzkClientId?: string;
  chzzkClientSecret?: string;
  chzzkAccessToken?: string;
  chzzkRefreshToken?: string;
  chzzkWriteEnabled?: boolean;
  hasClientSecret?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  suppressPointMessagesInChat?: boolean;
  sendPaidPointMessagesInChat?: boolean;
  autoMessageIntervalMin: number;
}

export interface UpdateState {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  configured: boolean;
  repo: string;
  releaseUrl: string;
  downloadUrl: string;
  publishedAt: string;
  changelog: string[];
  checking: boolean;
  updating: boolean;
  phase: 'idle' | 'checking' | 'downloading' | 'applying' | 'restarting' | 'error';
  lastCheckedAt: number;
  error: string | null;
  justUpdated?: {
    fromVersion: string;
    toVersion: string;
    changelog: string[];
    updatedAt: number;
  } | null;
}

export interface CustomCommand {
  id: string;
  name: string;
  response: string;
  permission: 'all' | 'follower' | 'sub' | 'manager' | 'streamer';
  cooldown: number;
  cost: number;
  currency?: CurrencyType;
  enabled: boolean;
  count: number;
  matchType?: 'exact' | 'contains' | 'startsWith';
  oncePerUser?: boolean;
  visibleInViewer?: boolean;
}

export interface DefaultCommandConfig {
  enabled: boolean;
  name: string;
  desc: string;
  visibleInViewer?: boolean;
}

export interface AutoMessage {
  id: string;
  text: string;
  intervalMin: number;
  lastSent: number;
  enabled: boolean;
  categoryFilter: 'all' | 'include' | 'exclude';
  categoryTarget: string;
}

export interface UserWallet {
  nickname: string;
  points: number;
  chips: number;
  attendStreak: number;
  totalAttends: number;
  lastAttend: string;
  totalCheeseDonation?: number;
  totalDonation: number;
  tickets: string[];
  role: 'streamer' | 'manager' | 'sub' | 'follower' | 'viewer';
}

export interface SongItem {
  id: string;
  title: string;
  artist: string;
  url: string;
  videoId: string;
  requester: string;
  duration: string;
  thumbnail: string;
  startedAt?: number;
}

export interface SongRequestsState {
  current: SongItem | null;
  queue: SongItem[];
  isPlaying?: boolean;
  volume?: number;
  isMuted?: boolean;
  settings: {
    enabled: boolean;
    maxQueueSize: number;
    maxPerUser: number;
    minCost: number;
    currency?: CurrencyType;
    volume: number;
  };
}

export interface GeneralRequest {
  id: string;
  title: string;
  requester: string;
  status: 'waiting' | 'in_progress' | 'done';
  createdAt: number;
}

export interface FundState {
  title: string;
  goalPoints: number;
  currentPoints: number;
  currency?: CurrencyType;
  enabled: boolean;
  recentDonors: { user: string; points: number; unit?: string; time: number }[];
}

export interface PredictionOption {
  id: string;
  title: string;
  points: number;
  votes: number;
}

export interface PredictionState {
  id: string;
  title: string;
  options: PredictionOption[];
  status: 'active' | 'closed' | 'resolved' | 'cancelled';
  winnerOptionId: string | null;
  createdAt: number;
}

export interface RouletteItem {
  id: string;
  name: string;
  chance: number;
  color: string;
}

export interface RouletteState {
  items: RouletteItem[];
  cost: number;
  currency?: CurrencyType;
  history: { user: string; prize?: string; winner?: string; time: number }[];
}



export interface ChatMessage {
  id: string;
  user: string;
  isBot?: boolean;
  message: string;
  time: string;
  timestamp: number;
  role: string;
}

export interface DonationAlert {
  id: string;
  user: string;
  amount: number;
  unit?: string;
  currency?: CurrencyType;
  currencyName?: string;
  cheeseAmount?: number;
  donationType?: string;
  message: string;
  role: string;
  timestamp: number;
}

export interface ScheduleItem {
  day: string;
  time: string;
  title: string;
  off?: boolean;
  date?: string;
  tag?: string;
  notice?: string;
}

export interface TunnelState {
  status: 'stopped' | 'starting' | 'running' | 'error';
  isRunning: boolean;
  publicUrl: string | null;
  viewerUrl: string | null;
  startedAt: number | null;
  error?: string | null;
}
