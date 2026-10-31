import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Moon,
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  ExternalLink,
  Info,
  RotateCcw,
  Megaphone,
  Radio,
  Gamepad2,
  Users,
  Flame,
  Zap,
  Coffee,
  CalendarDays
} from 'lucide-react';
import { ScheduleItem } from '../types';
import { api } from '../services/api';

interface ScheduleViewProps {
  schedules: ScheduleItem[];
  weeklySchedules?: Record<string, ScheduleItem[]>;
  activeWeekKey?: string;
  status?: any;
  settings?: any;
}

export const WEEKDAYS = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
export const WEEK_SHORT = ['월', '화', '수', '목', '금', '토', '일'];

export const SCHEDULE_TAGS = [
  { id: '정기', label: '정기 방송', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { id: '게릴라', label: '게릴라', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: '시참', label: '시청자 참여', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { id: '합방', label: '합방', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { id: '휴방', label: '휴방', color: 'bg-slate-700/50 text-slate-400 border-slate-600/30' }
];

export const DEFAULT_7DAYS_TEMPLATE: ScheduleItem[] = [
  { day: '월요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' },
  { day: '화요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' },
  { day: '수요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' },
  { day: '목요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' },
  { day: '금요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' },
  { day: '토요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' },
  { day: '일요일', time: '', title: '쉬어가는 날 🌙', off: true, tag: '휴방' }
];

/** weekKey (YYYY-MM-DD)로부터 이번 주 대비 offset(-2, -1, 0, 1...) 계산 유틸 */
export function getOffsetFromKey(weekKey: string): number {
  if (!weekKey || !weekKey.includes('-')) return 0;
  const [y, m, d] = weekKey.split('-').map(Number);
  const targetMonday = new Date(y, m - 1, d);

  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

  const diffMs = targetMonday.getTime() - thisMonday.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/** 주간 날짜 계산 유틸 (offset 숫자 또는 'YYYY-MM-DD' weekKey 지원) */
export function getWeekDates(weekOffsetOrKey: number | string = 0) {
  let offset = 0;
  if (typeof weekOffsetOrKey === 'string' && weekOffsetOrKey.includes('-')) {
    offset = getOffsetFromKey(weekOffsetOrKey);
  } else if (typeof weekOffsetOrKey === 'number') {
    offset = weekOffsetOrKey;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

  const monday = new Date(thisMonday);
  monday.setDate(thisMonday.getDate() + offset * 7);

  const todayStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  const days = WEEKDAYS.map((name, i) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const m = cur.getMonth() + 1;
    const dateNum = cur.getDate();
    const dateStr = `${m}.${dateNum}`;
    const fullDateStr = `${cur.getFullYear()}.${String(m).padStart(2, '0')}.${String(dateNum).padStart(2, '0')}`;

    const isPast = fullDateStr < todayStr;
    const isToday = fullDateStr === todayStr;

    return {
      dayName: name,
      dayShort: WEEK_SHORT[i],
      dateStr,
      fullDateStr,
      isToday,
      isPast,
      rawDate: cur
    };
  });

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startMonth = monday.getMonth() + 1;
  const endMonth = sunday.getMonth() + 1;
  const rangeText = `${startMonth}.${monday.getDate()} (월) ~ ${endMonth}.${sunday.getDate()} (일)`;

  // 주차 계산
  const firstDayOfMonth = new Date(monday.getFullYear(), monday.getMonth(), 1);
  const weekNumber = Math.ceil((monday.getDate() + firstDayOfMonth.getDay() - 1) / 7);
  const weekTitle = `${monday.getFullYear()}년 ${startMonth}월 ${weekNumber}주차 일정표`;
  const weekKey = `${monday.getFullYear()}-${String(startMonth).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

  return {
    weekTitle,
    weekNumber,
    weekKey,
    rangeText,
    days,
    isCurrentWeek: offset === 0
  };
}

/** 기존 스케줄을 7일 주간 캘린더 형식으로 정규화 */
export function normalizeToSevenDays(schedules: ScheduleItem[] = []): ScheduleItem[] {
  const map: Record<string, ScheduleItem> = {};

  schedules.forEach(item => {
    if (!item || !item.day) return;
    const found = WEEKDAYS.find(w => item.day.includes(w.slice(0, 1)));
    if (found && !map[found]) {
      map[found] = { ...item, day: found };
    }
  });

  return WEEKDAYS.map((day, idx) => {
    if (map[day]) {
      const it = map[day];
      const isOff = it.off !== undefined ? it.off : it.title.includes('휴방');
      return {
        day,
        time: it.time || (isOff ? '' : '20:00'),
        title: it.title || (isOff ? '쉬어가는 날 🌙' : '방송 콘텐츠 미정'),
        off: isOff,
        tag: it.tag || (isOff ? '휴방' : '정기'),
        notice: it.notice || ''
      };
    }
    // 기본 템플릿 사용
    return { ...DEFAULT_7DAYS_TEMPLATE[idx] };
  });
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ schedules, weeklySchedules = {}, activeWeekKey = '' }) => {
  const [weekOffset, setWeekOffset] = useState(() => {
    if (activeWeekKey) {
      return getOffsetFromKey(activeWeekKey);
    }
    return 0;
  });
  const weekInfo = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const [list, setList] = useState<ScheduleItem[]>(() => {
    if (weeklySchedules && weeklySchedules[weekInfo.weekKey]) {
      return normalizeToSevenDays(weeklySchedules[weekInfo.weekKey]);
    }
    if (weekOffset === 0 && schedules && schedules.length > 0) {
      return normalizeToSevenDays(schedules);
    }
    return [...DEFAULT_7DAYS_TEMPLATE];
  });
  const [weekNotice, setWeekNotice] = useState<string>(() => {
    const foundNotice = (weeklySchedules && weeklySchedules[weekInfo.weekKey]?.find(s => s?.notice)?.notice) || schedules?.find(s => s?.notice)?.notice;
    return foundNotice || '이번 주도 즐거운 방송에서 함께 행복한 시간 보내요! ✨';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [isSyncingChzzk, setIsSyncingChzzk] = useState(false);

  // 치지직 실제 방송 기록 동기화 핸들러 (사용자 수동 클릭 시만 동작)
  const handleSyncChzzk = async () => {
    setIsSyncingChzzk(true);
    try {
      const res = await api.syncChzzkSchedules();
      if (res.success) {
        if (res.weeklySchedules && res.weeklySchedules[weekInfo.weekKey]) {
          setList(normalizeToSevenDays(res.weeklySchedules[weekInfo.weekKey]));
        } else if (res.data) {
          setList(normalizeToSevenDays(res.data));
        }
        alert(`치지직 실제 방송 기록(${res.broadcastCount || 0}건)을 일정표에 성공적으로 동기화했습니다!`);
      } else {
        alert('치지직 방송 기록 동기화 중 오류: ' + (res.error || '알 수 없는 오류'));
      }
    } catch (err: any) {
      alert('치지직 방송 기록 동기화 실패: ' + err.message);
    } finally {
      setIsSyncingChzzk(false);
    }
  };

  // 주차(weekOffset) 또는 weeklySchedules 변경 시 해당 주차 데이터 동기화
  useEffect(() => {
    if (weeklySchedules && weeklySchedules[weekInfo.weekKey]) {
      const weekData = weeklySchedules[weekInfo.weekKey];
      setList(normalizeToSevenDays(weekData));
      const foundNotice = weekData.find(s => s?.notice)?.notice;
      setWeekNotice(foundNotice || '');
    } else {
      setList([...DEFAULT_7DAYS_TEMPLATE]);
      setWeekNotice('이번 주도 즐거운 방송에서 함께 행복한 시간 보내요! ✨');
    }
  }, [weekOffset, weekInfo.weekKey, weeklySchedules]);

  // 변경 감지
  const isDirty = useMemo(() => {
    const serverItems = (weeklySchedules && weeklySchedules[weekInfo.weekKey]) || DEFAULT_7DAYS_TEMPLATE;
    const normalizedServer = JSON.stringify(normalizeToSevenDays(serverItems));
    const current = JSON.stringify(list);
    const serverNotice = serverItems?.find(s => s?.notice)?.notice || '';
    return normalizedServer !== current || (weekNotice.trim() !== serverNotice.trim());
  }, [list, weeklySchedules, weekInfo.weekKey, weekNotice]);

  // 특정 요일 수정
  const updateDay = (dayName: string, patch: Partial<ScheduleItem>) => {
    setList(prev =>
      prev.map(item => (item.day === dayName ? { ...item, ...patch } : item))
    );
  };

  // 휴방 토글
  const toggleOff = (dayName: string) => {
    setList(prev =>
      prev.map(item => {
        if (item.day === dayName) {
          const nextOff = !item.off;
          return {
            ...item,
            off: nextOff,
            tag: nextOff ? '휴방' : '정기',
            title: nextOff ? (item.title && !item.title.includes('정기') ? item.title : '쉬어가는 날 🌙') : (item.title.includes('쉬어가는 날') ? '방송 일정 계획 🌙' : item.title),
            time: nextOff ? '' : (item.time || '20:00')
          };
        }
        return item;
      })
    );
  };

  // 전체 저장
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 주간 공지를 첫 번째 항목의 notice 속성에 함께 기록하여 영구 보존
      const payload: ScheduleItem[] = list.map((item, idx) => ({
        ...item,
        title: item.title.trim(),
        notice: idx === 0 ? weekNotice.trim() : undefined,
        date: weekInfo.days[idx]?.dateStr
      }));

      await api.updateSchedules(payload, weekInfo.weekKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err: any) {
      alert('일정표 저장 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 기본 상태(전체 쉬어가는 날)로 초기화
  const handleLoadDefaultTemplate = () => {
    if (window.confirm('일정표를 기본 상태(전체 쉬어가는 날)로 초기화할까요?')) {
      setList([...DEFAULT_7DAYS_TEMPLATE]);
      setWeekNotice('이번 주도 즐거운 방송에서 함께 행복한 시간 보내요! ✨');
    }
  };

  // 모두 휴방 설정
  const handleSetAllOff = () => {
    if (window.confirm('이번 주 모든 요일을 [휴방]으로 설정할까요?')) {
      setList(prev =>
        prev.map(item => ({
          ...item,
          off: true,
          tag: '휴방',
          time: '',
          title: '쉬어가는 날 🌙'
        }))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-amber-400" />
            <span>주간 방송 일정표</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 font-bold">
              월~일 7일 캘린더 🌙
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            한 주간의 방송 계획과 휴방 일정을 시청자들에게 한눈에 안내하는 주간 일정표입니다.
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDirty && !saved && (
            <span className="text-[11px] font-bold text-amber-300 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-pulse">
              ● 저장되지 않은 변경사항
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (!isDirty && !saved)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-yellow-200 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-950" />
                <span>저장 완료!</span>
              </>
            ) : isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>캘린더 저장하기</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 캘린더 툴바 & 주간 네비게이션 */}
      <div className="witch-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 border border-amber-400/25 shadow-md">
        {/* 주차 탐색 버튼 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors"
            title="이전 주"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/20">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-white">{weekInfo.weekTitle}</span>
            <span className="text-xs text-amber-400 font-semibold">({weekInfo.rangeText})</span>
          </div>

          <button
            type="button"
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors"
            title="다음 주"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!weekInfo.isCurrentWeek && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition-colors"
            >
              이번 주로 복귀
            </button>
          )}
        </div>

        {/* 빠른 템플릿 & 치지직 연동 액션들 */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleSyncChzzk}
            disabled={isSyncingChzzk}
            className="px-3 py-1.5 rounded-xl bg-[#00ffa3]/15 hover:bg-[#00ffa3]/25 text-[#00ffa3] hover:text-[#52ffbe] text-xs font-black border border-[#00ffa3]/40 flex items-center gap-1.5 transition-all shadow-sm shadow-[#00ffa3]/10 disabled:opacity-50 cursor-pointer"
            title="치지직 실제 방송 및 다시보기 기록을 가져와 캘린더에 자동 반영합니다"
          >
            {isSyncingChzzk ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Radio className="w-3.5 h-3.5" />
            )}
            <span>치지직 방송 기록 불러오기</span>
          </button>
          <button
            type="button"
            onClick={handleLoadDefaultTemplate}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-100 text-xs font-bold border border-amber-400/30 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>기본 초기화</span>
          </button>
          <button
            type="button"
            onClick={handleSetAllOff}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-white/5 transition-all flex items-center gap-1"
          >
            <Moon className="w-3 h-3" />
            <span>모두 휴방</span>
          </button>
          <a
            href="/view"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#282d46] text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1 transition-all"
          >
            <span>시청자 화면</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 이번 주 한 줄 공지 바 */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-500/25 flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <Megaphone className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-amber-300">이번 주 방송 공지:</span>
        </div>
        <input
          type="text"
          value={weekNotice}
          onChange={(e) => setWeekNotice(e.target.value)}
          placeholder="예: 이번 주는 수요일 신작 공포게임 체험 & 금요일 시참 칼바람 합니다! 🌙"
          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      </div>

      {/* 🌟 7일 주간 캘린더 그리드 (월 ~ 일) 🌟 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {list.map((item, idx) => {
          const dateObj = weekInfo.days[idx];
          const isToday = dateObj?.isToday;
          const isWeekend = idx === 5 || idx === 6; // 토(5), 일(6)

          return (
            <div
              key={item.day}
              className={`rounded-2xl transition-all relative flex flex-col justify-between overflow-hidden border ${
                item.off
                  ? 'bg-[#10121b]/80 border-white/5 opacity-80 hover:opacity-100'
                  : isToday
                  ? 'bg-gradient-to-b from-[#1c1a2e] to-slate-950 border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-500/10'
                  : 'bg-slate-900 border-amber-400/25 hover:border-amber-400/50 shadow-md'
              }`}
            >
              {/* 상단 날짜 및 요일 헤더 */}
              <div className={`p-3 border-b flex items-center justify-between ${
                isToday
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-500/30'
                  : 'bg-slate-950/40 border-white/5'
              }`}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-base font-black ${
                      isWeekend ? (idx === 6 ? 'text-rose-400' : 'text-sky-400') : 'text-slate-100'
                    }`}>
                      {dateObj?.dayShort || item.day.slice(0, 1)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {dateObj?.dateStr || ''}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-medium">{item.day}</span>
                </div>

                {/* 오늘 원형 인디케이터 & 휴방 토글 */}
                <div className="flex items-center gap-1.5">
                  {isToday && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 ring-2 ring-amber-400/50 shadow-md shadow-amber-400/60 animate-pulse shrink-0"
                      title="오늘"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => toggleOff(item.day)}
                    title={item.off ? '방송 일정으로 변경' : '휴방으로 변경'}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      item.off
                        ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20'
                    }`}
                  >
                    {item.off ? <Moon className="w-2.5 h-2.5 text-slate-400" /> : <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse" />}
                    <span>{item.off ? '휴방' : 'ON'}</span>
                  </button>
                </div>
              </div>

              {/* 카드 본문: 방송 상태 및 내용 입력 */}
              <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                {item.off ? (
                  /* 휴방 카드 스타일 */
                  <div className="py-6 text-center space-y-2 my-auto">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-400">쉬어가는 날 🌙</div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      체력 충전 & 휴식
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleOff(item.day)}
                      className="text-[10px] text-amber-400 hover:underline pt-1"
                    >
                      + 방송 등록하기
                    </button>
                  </div>
                ) : (
                  /* 방송일 카드 스타일 */
                  <div className="space-y-2.5">
                    {/* 태그 선택기 */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {SCHEDULE_TAGS.filter(t => t.id !== '휴방').map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => updateDay(item.day, { tag: tag.id })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-all border ${
                            item.tag === tag.id
                              ? tag.color + ' ring-1 ring-amber-400/40 shadow-sm'
                              : 'bg-slate-900/60 text-slate-500 border-white/5 hover:text-slate-300'
                          }`}
                        >
                          {tag.id}
                        </button>
                      ))}
                    </div>

                    {/* 시간 입력 및 빠른 칩 */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" /> 방송 시간
                      </label>
                      <input
                        type="text"
                        value={item.time}
                        onChange={(e) => updateDay(item.day, { time: e.target.value })}
                        placeholder="예: 20:00 / 21:00 / 랜덤"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        {['20:00', '21:00', '랜덤'].map(presetTime => (
                          <button
                            key={presetTime}
                            type="button"
                            onClick={() => updateDay(item.day, { time: presetTime })}
                            className="px-1.5 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-[9px] text-amber-400 hover:text-amber-300 border border-white/5"
                          >
                            {presetTime}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 방송 콘텐츠 / 계획 */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3 text-amber-400" /> 콘텐츠 계획
                      </label>
                      <textarea
                        rows={2}
                        value={item.title}
                        onChange={(e) => updateDay(item.day, { title: e.target.value })}
                        placeholder="예: 아저씨의 야식 & 나긋나긋 소통 바 🥃"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                      />
                      {/* 빠른 키워드 */}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {['소통', '토크', '저챗', '게임'].map(kw => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              const newTitle = item.title ? `${item.title} / ${kw}` : kw;
                              updateDay(item.day, { title: newTitle });
                            }}
                            className="px-1 py-0.5 rounded bg-slate-900/60 hover:bg-slate-800 text-[9px] text-slate-400 hover:text-slate-200 border border-white/5"
                          >
                            +{kw}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 📱 시청자 화면 실시간 캘린더 미리보기 */}
      <div className="witch-card p-5 rounded-2xl space-y-4 border border-amber-400/25 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm text-white">시청자 공개 페이지 캘린더 미리보기 (/view)</h3>
          </div>
          <a
            href="/view"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1"
          >
            <span>새 창에서 열기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 시청자 캘린더 렌더링 컴포넌트 */}
        <WeeklyCalendarView
          schedules={list}
          weeklySchedules={weeklySchedules}
          activeWeekKey={weekInfo.weekKey}
          weekTitle={weekInfo.weekTitle}
          rangeText={weekInfo.rangeText}
          notice={weekNotice}
          weekDaysInfo={weekInfo.days}
          showMonthAccordion={true}
        />
      </div>
    </div>
  );
};

/** 시청자 공개 페이지 및 미리보기용 공용 주간 캘린더 컴포넌트 */
interface WeeklyCalendarViewProps {
  schedules: ScheduleItem[];
  weeklySchedules?: Record<string, ScheduleItem[]>;
  activeWeekKey?: string;
  weekTitle?: string;
  rangeText?: string;
  notice?: string;
  weekDaysInfo?: ReturnType<typeof getWeekDates>['days'];
  showMonthAccordion?: boolean;
}

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  schedules,
  weeklySchedules = {},
  activeWeekKey,
  weekTitle,
  rangeText,
  notice,
  weekDaysInfo,
  showMonthAccordion = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewNavOffset, setViewNavOffset] = useState(0);

  // activeWeekKey가 주어지면 그 주차를 기본 offset으로, 없으면 현재 주(0)를 기준으로 함
  const baseOffset = useMemo(() => {
    if (activeWeekKey) {
      return getOffsetFromKey(activeWeekKey);
    }
    return 0;
  }, [activeWeekKey]);

  // 활성 주차 변경 시 네비게이션 오프셋 0으로 리셋
  useEffect(() => {
    setViewNavOffset(0);
  }, [activeWeekKey]);

  // 현재 뷰어에서 보고 있는 주 정보 (weekTitle/rangeText 등이 직접 주어진 경우는 해당 값 우선)
  const currentWeekInfo = useMemo(() => {
    return getWeekDates(baseOffset + viewNavOffset);
  }, [baseOffset, viewNavOffset]);

  const daysInfo = weekDaysInfo || currentWeekInfo.days;
  const currentTitle = weekTitle || currentWeekInfo.weekTitle;
  const currentRange = rangeText || currentWeekInfo.rangeText;

  // 주간 스케줄 아이템 결정:
  // - weekTitle이 전달된 경우(대시보드 실시간 편집 미리보기): schedules(현재 수정 중인 list)를 사용
  // - 시청자 공개 페이지(/view):
  //     1) weeklySchedules[currentWeekInfo.weekKey]가 있으면 해당 주차 데이터
  //     2) currentWeekInfo.weekKey === activeWeekKey && schedules가 있으면 schedules
  //     3) 없으면 DEFAULT_7DAYS_TEMPLATE (타 주차 내용 오염 방지)
  const normalized = useMemo(() => {
    if (weekTitle) {
      return normalizeToSevenDays(schedules);
    }
    const targetKey = currentWeekInfo.weekKey;
    if (weeklySchedules && weeklySchedules[targetKey] && weeklySchedules[targetKey].length > 0) {
      return normalizeToSevenDays(weeklySchedules[targetKey]);
    }
    if (activeWeekKey && targetKey === activeWeekKey && schedules && schedules.length > 0) {
      return normalizeToSevenDays(schedules);
    }
    return [...DEFAULT_7DAYS_TEMPLATE];
  }, [weekTitle, schedules, weeklySchedules, currentWeekInfo.weekKey, activeWeekKey]);

  const currentNotice = useMemo(() => {
    if (notice) return notice;
    const targetKey = currentWeekInfo.weekKey;
    const found = weeklySchedules?.[targetKey]?.find(s => s?.notice)?.notice;
    if (found) return found;
    return schedules?.find(s => s?.notice)?.notice || '이번 주도 즐거운 방송에서 함께 행복한 시간 보내요! ✨';
  }, [notice, currentWeekInfo.weekKey, weeklySchedules, schedules]);

  // 4주치 롤링 아코디언 데이터: [과거 2주, 이번 주, 다음 주] = [-2, -1, 0, 1] 오프셋
  // 사용자의 요청대로 빨간색 박스(10.5, 10.12, 10.19)가 초록색 위치(1~3번째)로 1칸씩 올라가고,
  // 맨 아래 4번째 파란색 박스 위치에 그 다음 주(10.26 ~ 11.1) 일정이 항상 표시되는 롤링 갱신 구조
  const [accordionNavOffset, setAccordionNavOffset] = useState(0);

  const recentFourWeeks = useMemo(() => {
    return [-2, -1, 0, 1].map(diff => {
      const targetOffset = accordionNavOffset + diff;
      const info = getWeekDates(targetOffset);
      const customItems = weeklySchedules?.[info.weekKey];
      let weekList: ScheduleItem[];
      if (customItems && customItems.length > 0) {
        weekList = normalizeToSevenDays(customItems);
      } else if (activeWeekKey === info.weekKey && schedules && schedules.length > 0) {
        weekList = normalizeToSevenDays(schedules);
      } else {
        weekList = [...DEFAULT_7DAYS_TEMPLATE];
      }
      const weekNotice = customItems?.find(s => s?.notice)?.notice ||
        (info.weekKey === currentWeekInfo.weekKey ? currentNotice : undefined);
      return {
        ...info,
        schedules: weekList,
        notice: weekNotice,
        isFuture: targetOffset > 0,
        isPast: targetOffset < 0
      };
    });
  }, [accordionNavOffset, weeklySchedules, activeWeekKey, schedules, currentWeekInfo.weekKey, currentNotice]);

  // 7일 요일 그리드 공통 렌더러
  const renderSevenDayGrid = (
    items: ScheduleItem[],
    days: ReturnType<typeof getWeekDates>['days'],
    isCurrentWeek: boolean
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
      {items.map((item, idx) => {
        const info = days[idx];
        const isToday = isCurrentWeek && info?.isToday;
        const isWeekend = idx === 5 || idx === 6;

        return (
          <div
            key={item.day}
            className={`p-3.5 rounded-2xl transition-all relative flex flex-col justify-between overflow-hidden border ${
              item.off
                ? 'witch-card border-white/5 opacity-60'
                : isToday
                ? 'witch-card-gold border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/15'
                : 'witch-card border-amber-400/30'
            }`}
          >
            {/* 요일 & 날짜 헤더 */}
            <div className="pb-2 mb-2 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-base font-black ${
                      isWeekend ? (idx === 6 ? 'text-rose-400' : 'text-sky-400') : 'text-slate-100'
                    }`}
                  >
                    {info?.dayShort || item.day.slice(0, 1)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {info?.dateStr || ''}
                  </span>
                </div>
                <span className="text-[10px] text-amber-400">{item.day}</span>
              </div>

              {/* 뱃지들 */}
              <div className="flex items-center gap-1.5">
                {isToday && (
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 ring-2 ring-amber-400/50 shadow-md shadow-amber-400/60 animate-pulse shrink-0"
                    title="오늘"
                  />
                )}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    item.off
                      ? 'bg-slate-800 text-slate-400'
                      : item.tag === '게릴라'
                      ? 'bg-amber-500/20 text-amber-300'
                      : item.tag === '시참'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {item.off ? '휴방' : item.tag || '방송'}
                </span>
              </div>
            </div>

            {/* 본문 (시간 & 내용) */}
            <div className="space-y-1.5 my-auto">
              {item.off ? (
                <div className="py-3 text-center space-y-1">
                  <Moon className="w-5 h-5 text-slate-500 mx-auto" />
                  <div className="text-xs font-bold text-slate-400">쉬어가는 날 🌙</div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-black">
                    <Clock className="w-3 h-3" />
                    <span>{item.time || '20:00'}</span>
                  </div>
                  <div className="text-xs font-extrabold text-white leading-snug line-clamp-2">
                    {item.title || '방송 일정 미정'}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3.5">
      {/* 캘린더 상단 타이틀 & 날짜 범위 & 주차 이동 버튼 & 아래방향 삼각형 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-extrabold text-white">{currentTitle}</span>
          <span className="text-xs text-amber-400 font-semibold">({currentRange})</span>

          {/* 시청자 공개 페이지 등에서 주차 이동 및 이번 주/다음 주 탭 (대시보드 실시간 미리보기가 아닐 때) */}
          {!weekTitle && (
            <div className="flex items-center gap-1.5 ml-1">
              {/* 이번 주 / 다음 주 빠른 전환 탭 */}
              <div className="flex items-center gap-1 bg-slate-950 border border-white/10 rounded-xl p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewNavOffset(0)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    viewNavOffset === 0
                      ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  이번 주
                </button>
                <button
                  type="button"
                  onClick={() => setViewNavOffset(1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    viewNavOffset === 1
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 shadow-sm shadow-emerald-400/25'
                      : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>다음 주</span>
                </button>
              </div>

              {/* 주차 이동 화살표 */}
              <div className="flex items-center gap-0.5 bg-slate-900 border border-white/10 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setViewNavOffset(prev => prev - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="이전 주 일정 보기"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewNavOffset(prev => prev + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="다음 주 일정 보기"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 🔻 최근 한 달 방송 일정표 펼치기 버튼 (사용자 요청: 빨간 선 아래방향 삼각형 버튼) */}
          {showMonthAccordion && (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-sm select-none ${
                isExpanded
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30'
                  : 'bg-slate-900 hover:bg-[#23273c] text-amber-300 hover:text-amber-100 border-amber-400/40 hover:border-amber-400'
              }`}
              title={isExpanded ? '최근 한 달 일정 접기' : '최근 한 달(4주치) 방송 일정표 펼쳐보기'}
              aria-label="최근 한 달 방송 일정표 토글"
            >
              <span className={`text-[12px] leading-none transition-transform duration-300 inline-block ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
              <span className="text-[11px] font-bold">
                {isExpanded ? '한 달 접기' : '최근 한 달'}
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold animate-pulse">
              최근 4주치 롤링 캘린더 펼침
            </span>
          )}
          <span className="text-[11px] text-amber-400">
            ✦ 주간 방송 일정표
          </span>
        </div>
      </div>

      {/* 펼쳐졌을 때: 최근 한 달(4주치) 아코디언 뷰 */}
      {isExpanded ? (
        <div className="space-y-4 pt-1">
          {/* 상단 안내 배너 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#1a1728] to-slate-950 border border-amber-400/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-100 flex items-center gap-2">
                  <span>최근 방송 캘린더 (과거 2주 + 이번 주 + 다음 주)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    롤링 갱신
                  </span>
                </div>
                <div className="text-[11px] text-amber-400 mt-0.5">
                  지난 2주간의 방송 기록부터 이번 주 라이브, 그리고 다음 주 방송 계획까지 주차별로 모아보세요.
                </div>
              </div>
            </div>

            {/* 아코디언 주차 탐색 버튼 */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setAccordionNavOffset(prev => prev - 1)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="1주 더 과거로 이동"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>이전</span>
              </button>
              {accordionNavOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setAccordionNavOffset(0)}
                  className="px-2 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 text-[11px] font-bold transition-colors cursor-pointer"
                  title="기본 롤링 주차로 복귀"
                >
                  기본 복귀
                </button>
              )}
              <button
                type="button"
                onClick={() => setAccordionNavOffset(prev => prev + 1)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="1주 더 미래로 이동"
              >
                <span>다음</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 4주치 주차별 카드 리스트 (과거 2주 -> 이번 주 -> 다음 주 신규 일정) */}
          <div className="space-y-4">
            {recentFourWeeks.map((week) => {
              const isFutureWeek = week.isFuture;
              return (
                <div
                  key={week.weekKey}
                  className={`p-4 rounded-3xl transition-all border space-y-3 ${
                    week.isCurrentWeek
                      ? 'witch-card-gold border-amber-400 ring-1 ring-amber-400/30 shadow-lg'
                      : isFutureWeek
                      ? 'witch-card border-emerald-500/40 bg-gradient-to-b from-[#141829] to-slate-900 shadow-md shadow-emerald-500/5'
                      : 'witch-card border-amber-400/20 bg-slate-900'
                  }`}
                >
                  {/* 주차 헤더 */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar
                        className={`w-4 h-4 ${
                          week.isCurrentWeek
                            ? 'text-amber-400'
                            : isFutureWeek
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={`text-sm font-black ${
                          week.isCurrentWeek
                            ? 'text-white'
                            : isFutureWeek
                            ? 'text-emerald-200'
                            : 'text-slate-200'
                        }`}
                      >
                        {week.weekTitle}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isFutureWeek ? 'text-emerald-400/80' : 'text-amber-400'
                        }`}
                      >
                        ({week.rangeText})
                      </span>
                    </div>

                    <div>
                      {week.isCurrentWeek ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                          ⭐ 이번 주 (진행 중)
                        </span>
                      ) : isFutureWeek ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                          ✨ 다음 주 (방송 예정)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-white/5 text-[10px] font-semibold">
                          지난 방송
                        </span>
                      )}
                    </div>
                  </div>

                {/* 해당 주차 공지사항 (있을 때만) */}
                {week.notice && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 shadow-sm">
                    <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <p className="text-xs text-slate-100 font-semibold truncate">
                      {week.notice}
                    </p>
                  </div>
                )}

                {/* 해당 주차 7일 그리드 */}
                {renderSevenDayGrid(week.schedules, week.days, week.isCurrentWeek)}
              </div>
            );
          })}
          </div>

          {/* 하단 닫기/접기 버튼 */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="w-full py-2.5 rounded-2xl bg-[#161827] hover:bg-[#202438] text-amber-300 hover:text-amber-100 border border-amber-400/30 text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <span>▲ 이번 주 일정만 보기 (접기)</span>
          </button>
        </div>
      ) : (
        /* 접혀있을 때: 기존처럼 이번 주 7일 캘린더 단독 표시 */
        <>
          {/* 주간 공지사항 배너 (있을 때만) */}
          {currentNotice && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#1a1728] to-slate-950 border border-amber-400/35 flex items-center gap-2.5 shadow-sm">
              <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                <Megaphone className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-slate-100 font-semibold leading-relaxed">
                {currentNotice}
              </p>
            </div>
          )}

          {/* 이번 주 7일 캘린더 그리드 */}
          {renderSevenDayGrid(normalized, daysInfo, true)}
        </>
      )}
    </div>
  );
};

/** 기존 ScheduleCard 호환용 export */
export const ScheduleCard: React.FC<{ item: ScheduleItem }> = ({ item }) => (
  <div
    className={`p-4 rounded-2xl witch-card space-y-1.5 border ${
      item.off ? 'border-white/5 opacity-50' : 'border-amber-400/20'
    }`}
  >
    <div className="flex items-center justify-between text-xs font-bold text-amber-400">
      <span>{item.day || '요일 미정'}</span>
      {item.off ? (
        <span className="px-2 py-0.5 rounded-md bg-slate-700/70 text-slate-200 text-[10px] font-black flex items-center gap-1">
          <Moon className="w-2.5 h-2.5" /> 휴방
        </span>
      ) : (
        <span>{item.time}</span>
      )}
    </div>
    <div className={`text-sm font-extrabold ${item.off ? 'text-slate-400 line-through decoration-slate-600' : 'text-white'}`}>
      {item.title || (item.off ? '쉬어가는 날 🌙' : '내용 미정')}
    </div>
  </div>
);
