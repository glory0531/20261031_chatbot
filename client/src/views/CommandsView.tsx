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
  Check,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { CustomCommand, Settings } from '../types';
import { api } from '../services/api';

interface CommandsViewProps {
  commands: CustomCommand[];
  prefix: string;
  settings?: Settings;
}

export const CommandsView: React.FC<CommandsViewProps> = ({ commands, prefix, settings }) => {
  const pUnit = settings?.pointName || 'P';
  const cUnit = settings?.chipName || '칩';
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCmd, setEditingCmd] = useState<CustomCommand | null>(null);

  // 모달 폼 상태
  const [name, setName] = useState('');
  const [response, setResponse] = useState('');
  const [permission, setPermission] = useState<CustomCommand['permission']>('all');
  const [cooldown, setCooldown] = useState(5);
  const [cost, setCost] = useState(0);
  const [currency, setCurrency] = useState<'chips' | 'points'>('chips');
  const [matchType, setMatchType] = useState<'exact' | 'contains' | 'startsWith'>('exact');
  const [oncePerUser, setOncePerUser] = useState(false);
  const [visibleInViewer, setVisibleInViewer] = useState(true);

  const variables = [
    { tag: '{user}', desc: '명령어 호출자' },
    { tag: '{target}', desc: '호출 대상(@멘션)' },
    { tag: '{points}', desc: '보유 유료 포인트' },
    { tag: '{chips}', desc: '보유 활동 칩' },
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
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !response.trim()) return;

    if (editingCmd) {
      await api.updateCommand(editingCmd.id, {
        name,
        response,
        permission,
        cooldown,
        cost,
        currency,
        matchType,
        oncePerUser,
        visibleInViewer
      });
    } else {
      await api.createCommand({
        name,
        response,
        permission,
        cooldown,
        cost,
        currency,
        matchType,
        oncePerUser,
        visibleInViewer
      });
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

  const insertVariable = (tag: string) => {
    setResponse(prev => prev + ' ' + tag);
  };

  const filtered = commands.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.response.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 상단 컨트롤 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            커스텀 명령어 관리
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            방송 소통과 편의를 위한 나만의 맞춤 명령어와 키워드 자동 반응을 생성하고 관리합니다. 접두사: <b className="text-amber-400">{prefix}</b>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="명령어 검색..."
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 w-48"
            />
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> 명령어 추가
          </button>
        </div>
      </div>

      {/* 명령어 카드 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((cmd) => (
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
                  ) : (
                    `${prefix}${cmd.name}`
                  )}
                </span>
                {cmd.matchType === 'contains' && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 whitespace-nowrap">
                    채팅 단어 자동 감지
                  </span>
                )}
                {cmd.oncePerUser && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap">
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
                {/* 시청자 페이지 공개/숨김 토글 버튼 */}
                <button
                  type="button"
                  onClick={() => handleToggleViewer(cmd)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border shrink-0 whitespace-nowrap ${
                    cmd.visibleInViewer !== false
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/35 hover:bg-sky-500/25 shadow-sm shadow-sky-500/10'
                      : 'bg-slate-800/80 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  title={cmd.visibleInViewer !== false ? '시청자 페이지(/view)에 표시 중 (클릭 시 숨김)' : '시청자 페이지에서 숨김 처리됨 (클릭 시 공개)'}
                >
                  {cmd.visibleInViewer !== false ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="whitespace-nowrap">시청자 공개</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="whitespace-nowrap">시청자 숨김</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleToggle(cmd)}
                  className="p-1 text-slate-400 hover:text-white transition-colors shrink-0"
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
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                  title="수정"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cmd.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
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
      </div>

      {/* 명령어 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white">
                {editingCmd ? '명령어 수정' : '새 커스텀 명령어 등록'}
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
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all ${
                      matchType === 'exact'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-mono text-amber-400">!명령어 (접두사 필수)</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">예: !디코, !일정 등 명령어 호출</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('contains')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all ${
                      matchType === 'contains'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-mono text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> 키워드 포함 감지
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">예: "서하, 오랜만이에요" 처럼 단어 감지</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {matchType === 'contains' ? '감지할 단어 (키워드)' : '명령어 이름 (접두사 제외)'}
                </label>
                <div className="flex items-center gap-2">
                  {matchType !== 'contains' && (
                    <span className="px-3 py-2 rounded-xl bg-slate-800 text-amber-400 font-mono font-bold text-sm border border-white/10">
                      {prefix}
                    </span>
                  )}
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={matchType === 'contains' ? '예: 서하, 서바, 방가' : '예: 디코, 규칙, 유튜브'}
                    required
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    봇 응답 문구
                  </label>
                  <span className="text-[10px] text-slate-500">변수 태그 클릭 시 자동 삽입</span>
                </div>
                {/* 변수 칩 버튼들 */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {variables.map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/20 transition-colors"
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="예: {user}님 어서오세요! 디스코드 주소는 https://discord.gg/... 입니다."
                  rows={4}
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
                    체크 해제 시 봇은 정상 작동하지만, 시청자용 웹페이지의 챗봇 명령어 목록에는 숨겨집니다. (이스터에그 등)
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
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  {editingCmd ? '변경사항 저장' : '명령어 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
