import React, { useState } from 'react';
import {
  Plus,
  Terminal,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Clock,
  Coins,
  ShieldCheck,
  X,
  UserCheck,
  Eye,
  EyeOff,
  Sliders,
  CalendarCheck
} from 'lucide-react';
import { CustomCommand, DefaultCommandConfig, Settings } from '../types';
import { api } from '../services/api';
import { DefaultCommandEditModal } from '../components/DefaultCommandEditModal';

interface CommandsViewProps {
  commands: CustomCommand[];
  defaultCommands?: Record<string, DefaultCommandConfig>;
  prefix: string;
  settings?: Settings;
}

const DEFAULT_COMMAND_META: Record<string, { desc: string; category: string }> = {
  uptime: { desc: '현재 방송을 시작한 후 경과된 시간을 시/분/초 단위로 알려줍니다.', category: '방송 정보' },
  title: { desc: '채팅으로 방송 제목을 즉시 변경합니다. (매니저/스트리머 전용)', category: '방송 관리' },
  category: { desc: '방송 카테고리를 즉시 변경합니다. (매니저/스트리머 전용)', category: '방송 관리' },
  attend: { desc: '1일 1회 출석 체크를 수행하고 연속 출석 보너스 칩을 지급합니다.', category: '참여 & 재화' },
  point: { desc: '시청자 본인의 현재 보유 칩과 총 출석 횟수를 조회합니다.', category: '참여 & 재화' },
  fund: { desc: '스트리머가 설정한 모금 목표에 칩을 함께 기부합니다.', category: '참여 & 재화' },
  vote: { desc: '진행 중인 투표/예측 항목에 칩을 배팅합니다.', category: '참여 & 재화' },
  sr: { desc: '방송 화면 플레이어에 재생할 유튜브 노래를 신청합니다.', category: '방송 도구' },
  request: { desc: '시청자 참여 또는 미션 요청을 대기열에 등록합니다.', category: '방송 도구' },
  roulette: { desc: '재화를 소모하여 행운의 룰렛을 돌립니다.', category: '컨텐츠' }
};

export const CommandsView: React.FC<CommandsViewProps> = ({
  commands,
  defaultCommands = {},
  prefix,
  settings
}) => {
  const pUnit = settings?.pointName || 'P';
  const cUnit = settings?.chipName || '칩';
  const [search, setSearch] = useState('');

  // 커스텀 명령어 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCmd, setEditingCmd] = useState<CustomCommand | null>(null);
  const [name, setName] = useState('');
  const [response, setResponse] = useState('');
  const [permission, setPermission] = useState<CustomCommand['permission']>('all');
  const [cooldown, setCooldown] = useState(5);
  const [cost, setCost] = useState(0);
  const [currency, setCurrency] = useState<'chips' | 'points'>('chips');
  const [matchType, setMatchType] = useState<'exact' | 'contains' | 'startsWith'>('exact');
  const [oncePerUser, setOncePerUser] = useState(false);
  const [visibleInViewer, setVisibleInViewer] = useState(true);
  const [allowNoPrefix, setAllowNoPrefix] = useState(false);
  const [triggerAttend, setTriggerAttend] = useState(false);

  // 기본 내장 명령어 편집 모달 상태
  const [editingDefaultKey, setEditingDefaultKey] = useState<string | null>(null);

  const variables = [
    { tag: '{user}', desc: '명령어 호출자' },
    { tag: '{target}', desc: '호출 대상(@멘션)' },
    { tag: '{chips}', desc: '보유 활동 칩' },
    { tag: '{earned}', desc: '출석 연동 시 획득 칩' },
    { tag: '{streak}', desc: '출석 연동 시 연속 출석일' },
    { tag: '{uptime}', desc: '방송 시간' },
    { tag: '{title}', desc: '방송 제목' },
    { tag: '{random:1-100}', desc: '1~100 난수' },
    { tag: '{count}', desc: '누적 사용 횟수' }
  ];

  const openAddModal = () => {
    setEditingCmd(null);
    setName('');
    setResponse('');
    setPermission('all');
    setCooldown(5);
    setCost(0);
    setCurrency('chips');
    setMatchType('exact');
    setOncePerUser(false);
    setVisibleInViewer(true);
    setAllowNoPrefix(false);
    setTriggerAttend(false);
    setModalOpen(true);
  };

  const openEditModal = (cmd: CustomCommand) => {
    setEditingCmd(cmd);
    setName(cmd.name);
    setResponse(cmd.response);
    setPermission(cmd.permission);
    setCooldown(cmd.cooldown);
    setCost(cmd.cost);
    setCurrency(cmd.currency || 'chips');
    setMatchType(cmd.matchType || 'exact');
    setOncePerUser(cmd.oncePerUser ?? false);
    setVisibleInViewer(cmd.visibleInViewer !== false);
    setAllowNoPrefix(Boolean(cmd.allowNoPrefix));
    setTriggerAttend(Boolean(cmd.triggerAttend));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !response.trim()) return;

    const payload = {
      name,
      response,
      permission,
      cooldown,
      cost,
      currency,
      matchType,
      oncePerUser,
      visibleInViewer,
      allowNoPrefix: matchType === 'exact' ? allowNoPrefix : false,
      triggerAttend
    };

    if (editingCmd) {
      await api.updateCommand(editingCmd.id, payload);
    } else {
      await api.createCommand(payload);
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 명령어를 정말 삭제할까요?')) {
      await api.deleteCommand(id);
    }
  };

  const handleToggle = async (cmd: CustomCommand) => {
    await api.updateCommand(cmd.id, { enabled: !cmd.enabled });
  };

  const handleToggleViewer = async (cmd: CustomCommand) => {
    await api.updateCommand(cmd.id, { visibleInViewer: !(cmd.visibleInViewer !== false) });
  };

  const handleToggleDefault = async (key: string, currentVal: boolean) => {
    await api.toggleDefaultCommand(key, !currentVal);
  };

  const handleToggleDefaultViewer = async (key: string, currentVisible: boolean) => {
    const config = defaultCommands[key];
    await api.toggleDefaultCommandViewer(key, config?.enabled ?? false, !currentVisible);
  };

  const handleSaveDefaultModal = async (key: string, updates: Partial<DefaultCommandConfig>) => {
    await api.updateDefaultCommand(key, updates);
  };

  const handleResetDefaultModal = async (key: string) => {
    await api.resetDefaultCommand(key);
  };

  const insertVariable = (tag: string) => {
    setResponse(prev => prev + ' ' + tag);
  };

  const getPermissionBadge = (perm?: string) => {
    switch (perm) {
      case 'follower': return { label: '팔로워 이상', color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' };
      case 'sub': return { label: '구독자 이상', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' };
      case 'manager': return { label: '매니저 이상', color: 'text-rose-300 bg-rose-500/10 border-rose-500/20' };
      case 'streamer': return { label: '스트리머 전용', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' };
      default: return null;
    }
  };

  const q = search.trim().toLowerCase();
  const defaultEntries = Object.entries(defaultCommands);
  const filteredDefaults = defaultEntries.filter(([key, cfg]) => {
    if (!q) return true;
    const aliasesText = Array.isArray(cfg.aliases) ? cfg.aliases.join(' ') : '';
    return (
      key.toLowerCase().includes(q) ||
      (cfg.name || '').toLowerCase().includes(q) ||
      aliasesText.toLowerCase().includes(q) ||
      (cfg.desc || '').toLowerCase().includes(q)
    );
  });

  const filteredCustom = commands.filter(c =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    c.response.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      {/* 상단 컨트롤 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            명령어 관리 ({filteredCustom.length + filteredDefaults.length}개)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            채팅창에서 사용하는 모든 명령어를 한곳에서 관리합니다. 접두사(<b className="text-amber-400">{prefix}</b>) 없이 실행하거나 출석 체크와 연동할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="명령어 또는 응답 검색..."
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 w-52"
            />
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> 명령어 추가
          </button>
        </div>
      </div>

      {/* 통합 명령어 카드 그리드 (구분 없이 한 목록) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustom.map((cmd) => (
                <div
                  key={cmd.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    cmd.enabled
                      ? 'bg-slate-900/70 border-white/10 hover:border-amber-500/30'
                      : 'bg-slate-900/30 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 font-black text-sm border border-amber-500/20 font-mono flex items-center gap-1.5 shrink-0">
                        {cmd.matchType === 'contains' ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            "{cmd.name}" 포함
                          </>
                        ) : cmd.matchType === 'startsWith' ? (
                          `"${cmd.name}"로 시작`
                        ) : cmd.allowNoPrefix ? (
                          `${cmd.name}`
                        ) : (
                          `${prefix}${cmd.name}`
                        )}
                      </span>
                      {cmd.allowNoPrefix && (!cmd.matchType || cmd.matchType === 'exact') && (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 whitespace-nowrap">
                          접두사 없이 사용
                        </span>
                      )}
                      {cmd.matchType === 'contains' && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 whitespace-nowrap">
                          채팅 단어 자동 감지
                        </span>
                      )}
                      {cmd.triggerAttend && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap">
                          <CalendarCheck className="w-3 h-3" /> 출석 체크 연동
                        </span>
                      )}
                      {cmd.oncePerUser && (
                        <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-500/30 flex items-center gap-1 whitespace-nowrap">
                          <UserCheck className="w-3 h-3" /> 유저당 1회 한정
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-300 border border-white/5 whitespace-nowrap">
                        {cmd.permission === 'all' ? '전체 이용 가능' :
                         cmd.permission === 'follower' ? '팔로워 전용' :
                         cmd.permission === 'sub' ? '구독자 전용' :
                         cmd.permission === 'manager' ? '매니저 전용' : '스트리머 전용'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleViewer(cmd)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
                          cmd.visibleInViewer !== false
                            ? 'bg-sky-500/15 text-sky-300 border-sky-500/35 hover:bg-sky-500/25 shadow-sm shadow-sky-500/10'
                            : 'bg-slate-800/80 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                        title={cmd.visibleInViewer !== false ? '시청자 페이지(/view)에 표시 중 (클릭 시 숨김)' : '시청자 페이지에서 숨김 처리됨 (클릭 시 공개)'}
                      >
                        {cmd.visibleInViewer !== false ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="whitespace-nowrap">공개</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="whitespace-nowrap">숨김</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleToggle(cmd)}
                        className="p-1 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                        title={cmd.enabled ? '봇 비활성화' : '봇 활성화'}
                      >
                        {cmd.enabled ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-500" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(cmd)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer"
                        title="수정"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cmd.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 응답 문구 */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-200 font-medium mb-3 leading-relaxed whitespace-pre-wrap">
                    {cmd.response}
                  </div>

                  {/* 메타 정보 */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> 쿨타임 {cmd.cooldown}초
                      </span>
                      {cmd.cost > 0 && (
                        <span className={`flex items-center gap-1 font-semibold ${cmd.currency === 'points' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          <Coins className="w-3 h-3" /> {cmd.cost.toLocaleString()}{cmd.currency === 'points' ? pUnit : cUnit} 소모
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500">호출 {cmd.count || 0}회</span>
                  </div>
                </div>
              ))}
        {filteredDefaults.map(([key, config]) => {
              const meta = DEFAULT_COMMAND_META[key] || { desc: config.desc, category: '기타' };
              const isViewerVisible = config.visibleInViewer !== false;
              const permBadge = getPermissionBadge(config.permission);
              const aliasList = Array.isArray(config.aliases) && config.aliases.length > 0 ? config.aliases : [config.name || key];
              const hasAliases = aliasList.length > 1;
              const displayPrefix = config.allowNoPrefix ? '' : prefix;

              return (
                <div
                  key={key}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    config.enabled
                      ? 'bg-slate-900/70 border-white/10 hover:border-amber-500/30'
                      : 'bg-slate-900/30 border-white/5 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 font-bold font-mono text-xs border border-amber-500/20">
                          {displayPrefix}{config.name || key}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-semibold text-slate-400 border border-white/5">
                          {meta.category}
                        </span>
                        {config.allowNoPrefix && (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                            접두사 없이 사용
                          </span>
                        )}
                        {permBadge && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${permBadge.color}`}>
                            <ShieldCheck className="w-2.5 h-2.5" />
                            {permBadge.label}
                          </span>
                        )}
                        {Number(config.cost) > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border bg-amber-500/10 text-amber-300 border-amber-500/20 flex items-center gap-1">
                            <Coins className="w-2.5 h-2.5" />
                            {(config.cost ?? 0).toLocaleString()}{config.currency === 'points' ? pUnit : cUnit}
                          </span>
                        )}
                        {Number(config.cooldown) > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border bg-slate-800/80 text-slate-400 border-white/5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {config.cooldown}초
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingDefaultKey(key)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border shrink-0 bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 shadow-sm cursor-pointer"
                          title="명령어 별칭, 접두사 없이 사용, 답변 문구, 권한, 비용 편집"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>편집</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleDefaultViewer(key, isViewerVisible)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
                            isViewerVisible
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/35 hover:bg-sky-500/25 shadow-sm shadow-sky-500/10'
                              : 'bg-slate-800/80 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                          title={isViewerVisible ? '시청자 페이지(/view)에 표시 중 (클릭 시 숨김)' : '시청자 페이지에서 숨김 처리됨 (클릭 시 공개)'}
                        >
                          {isViewerVisible ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span className="whitespace-nowrap">공개</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="whitespace-nowrap">숨김</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleToggleDefault(key, config.enabled)}
                          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
                          title={config.enabled ? '봇 명령어 동작 활성화됨' : '봇 명령어 일시 중지'}
                        >
                          {config.enabled ? (
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-medium leading-relaxed mb-2">
                      {config.desc || meta.desc}
                    </p>

                    {hasAliases && (
                      <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-1">
                        <span className="text-slate-500">별칭:</span>
                        <span className="font-mono text-amber-300/80">
                          {aliasList.map(a => `${displayPrefix}${a}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {config.response && (
                    <div className="mt-1 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-300/90 font-mono leading-relaxed truncate">
                      💬 {config.response}
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* 커스텀 명령어 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white">
                {editingCmd ? '커스텀 명령어 수정' : '새 커스텀 명령어 등록'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  명령어 감지 방식
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchType('exact')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      matchType === 'exact'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-mono text-amber-400">단어 일치 명령어</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">예: !디코, 또는 접두사 없이 '시하'</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('contains')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      matchType === 'contains'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-mono text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> 키워드 포함 감지
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">예: "시하, 오랜만이에요" 처럼 문장 내 감지</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {matchType === 'contains' ? '감지할 단어 (키워드)' : '명령어 이름 (접두사 제외)'}
                </label>
                <div className="flex items-center gap-2">
                  {matchType !== 'contains' && !allowNoPrefix && (
                    <span className="px-3 py-2 rounded-xl bg-slate-800 text-amber-400 font-mono font-bold text-sm border border-white/10">
                      {prefix}
                    </span>
                  )}
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={matchType === 'contains' ? '예: 시하, 방가' : '예: 시하, 디코, 유튜브'}
                    required
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              {matchType === 'exact' && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      접두사({prefix}) 없이도 실행
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      켜면 시청자가 <b>{prefix}</b> 없이 <b className="text-amber-300">{name || '시하'}</b>만 입력해도 명령어가 동작합니다.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowNoPrefix}
                    onChange={(e) => setAllowNoPrefix(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 bg-slate-900 border-white/20 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    봇 응답 문구
                  </label>
                  <span className="text-[10px] text-slate-500">변수 태그 클릭 시 자동 삽입</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {variables.map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/20 transition-colors cursor-pointer"
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="예: {user}님 어서오세요! 오늘도 즐거운 방송 함께해요 ✨"
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">사용 권한</label>
                  <select
                    value={permission}
                    onChange={(e: any) => setPermission(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                  >
                    <option value="all">전체 (모두)</option>
                    <option value="follower">팔로워 이상</option>
                    <option value="sub">구독자 이상</option>
                    <option value="manager">매니저 이상</option>
                    <option value="streamer">스트리머 전용</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">쿨타임 (초)</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={cooldown}
                    onChange={(e) => setCooldown(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">소모 재화</label>
                  <select
                    value={currency}
                    onChange={(e: any) => setCurrency(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none font-bold"
                  >
                    <option value="chips">🪙 칩 ({cUnit})</option>
                    <option value="points">🧀 포인트 ({pUnit})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">소모 수량</label>
                  <input
                    type="number"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* 일일 출석 체크 연동 옵션 */}
              <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-emerald-400" />
                    실행 시 일일 출석 체크 함께 처리
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    켜면 이 명령어를 입력할 때(예: <b>시하</b>) 오늘 첫 인사라면 일일 출석 체크와 {cUnit} 지급도 자동으로 함께 처리됩니다.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={triggerAttend}
                  onChange={(e) => setTriggerAttend(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-white/20 cursor-pointer"
                />
              </div>

              {/* 유저당 1회 반응 옵션 */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    유저당 1회만 반응 (첫인사 / 1회성)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    시청자가 방송 중 처음 입력했을 때만 1회 답장하고, 이후 중복 반응하지 않습니다.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={oncePerUser}
                  onChange={(e) => setOncePerUser(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-white/20 cursor-pointer"
                />
              </div>

              {/* 시청자 페이지 공개 여부 옵션 */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-sky-400" />
                    시청자 페이지(/view) 명령어 가이드에 표시
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    체크 해제 시 봇은 정상 작동하지만, 시청자용 웹페이지의 챗봇 명령어 목록에는 숨겨집니다.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={visibleInViewer}
                  onChange={(e) => setVisibleInViewer(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400 bg-slate-900 border-white/20 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {editingCmd ? '변경사항 저장' : '명령어 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 기본 내장 명령어 편집 모달 */}
      <DefaultCommandEditModal
        isOpen={Boolean(editingDefaultKey)}
        cmdKey={editingDefaultKey || ''}
        config={editingDefaultKey ? defaultCommands[editingDefaultKey] : null}
        prefix={prefix}
        settings={settings}
        onClose={() => setEditingDefaultKey(null)}
        onSave={handleSaveDefaultModal}
        onReset={handleResetDefaultModal}
      />
    </div>
  );
};
