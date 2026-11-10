import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Clock, 
  Coins, 
  ShieldCheck, 
  Eye, 
  Sliders,
  Check,
  AlertCircle
} from 'lucide-react';
import { DefaultCommandConfig, Settings } from '../types';

interface DefaultCommandEditModalProps {
  isOpen: boolean;
  cmdKey: string;
  config: DefaultCommandConfig | null;
  prefix: string;
  settings?: Settings;
  onClose: () => void;
  onSave: (key: string, updates: Partial<DefaultCommandConfig>) => Promise<void>;
  onReset: (key: string) => Promise<void>;
}

export const DefaultCommandEditModal: React.FC<DefaultCommandEditModalProps> = ({
  isOpen,
  cmdKey,
  config,
  prefix,
  settings,
  onClose,
  onSave,
  onReset
}) => {
  const [aliases, setAliases] = useState('');
  const [desc, setDesc] = useState('');
  const [response, setResponse] = useState('');
  const [permission, setPermission] = useState<DefaultCommandConfig['permission']>('all');
  const [cooldown, setCooldown] = useState(5);
  const [cost, setCost] = useState(0);
  const [currency, setCurrency] = useState<'chips' | 'points'>('chips');
  const [visibleInViewer, setVisibleInViewer] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      const aliasList = Array.isArray(config.aliases) && config.aliases.length > 0 
        ? config.aliases 
        : [config.name || cmdKey];
      setAliases(aliasList.join(', '));
      setDesc(config.desc || '');
      setResponse(config.response || '');
      setPermission(config.permission || 'all');
      setCooldown(config.cooldown ?? 5);
      setCost(config.cost ?? 0);
      setCurrency(config.currency || 'chips');
      setVisibleInViewer(config.visibleInViewer !== false);
      setSaveSuccess(false);
    }
  }, [config, cmdKey, isOpen]);

  if (!isOpen || !config) return null;

  const cUnit = settings?.chipName || '칩';
  const pUnit = settings?.pointName || '포인트';

  const variables = [
    { tag: '{user}', desc: '명령어 호출자' },
    { tag: '{uptime}', desc: '방송 경과 시간' },
    { tag: '{title}', desc: '현재 방송 제목' },
    { tag: '{category}', desc: '현재 카테고리' },
    { tag: '{points}', desc: '호출자 보유 유료 포인트' },
    { tag: '{chips}', desc: '호출자 보유 활동 칩' },
    { tag: '{earned}', desc: '적립/획득 수량' },
    { tag: '{streak}', desc: '연속 출석 일수' },
    { tag: '{count}', desc: '티켓/카운트 수량' },
    { tag: '{streamer}', desc: '스트리머 닉네임' },
    { tag: '{bot}', desc: '챗봇 이름' },
    { tag: '{time}', desc: '현재 시각' },
    { tag: '{random:1-100}', desc: '1~100 난수' }
  ];

  const insertVariable = (tag: string) => {
    setResponse(prev => prev + tag);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedAliases = aliases
        .split(',')
        .map(a => a.trim().replace(/^!/, ''))
        .filter(Boolean);

      const updates: Partial<DefaultCommandConfig> = {
        name: parsedAliases[0] || config.name || cmdKey,
        aliases: parsedAliases.length > 0 ? parsedAliases : [config.name || cmdKey],
        desc: desc.trim(),
        response: response.trim(),
        permission,
        cooldown: Math.max(0, Number(cooldown) || 0),
        cost: Math.max(0, Number(cost) || 0),
        currency,
        visibleInViewer
      };

      await onSave(cmdKey, updates);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      alert('명령어 설정을 저장하는 도중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`'${config.name}' 명령어를 초기 기본값으로 복구하시겠습니까?`)) {
      return;
    }
    setIsResetting(true);
    try {
      await onReset(cmdKey);
      onClose();
    } catch (err) {
      console.error(err);
      alert('기본값 복구 도중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">기본 명령어 편집</h3>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-mono text-xs font-bold border border-amber-500/20">
                  {prefix}{config.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                호출 별칭, 봇 답변 문구, 권한, 쿨다운, 소모 재화를 커스텀할 수 있습니다.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* 1. 명령어 별칭 목록 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-200">
                호출 명령어 & 별칭 (쉼표로 구분)
              </label>
              <span className="text-[11px] text-amber-400/90 font-mono">
                접두사({prefix})는 자동 적용
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 rounded-xl bg-slate-800 text-amber-400 font-mono font-bold text-sm border border-white/10">
                {prefix}
              </span>
              <input
                type="text"
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                placeholder="예: 업타임, uptime, 시간"
                required
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              쉼표(,)로 여러 별칭을 등록하면 시청자가 어떤 단어를 입력해도 동작합니다. (첫 번째 단어가 대표 이름)
            </p>
          </div>

          {/* 2. 설명 */}
          <div>
            <label className="block font-bold text-slate-200 mb-1.5">
              명령어 설명 (시청자 가이드 페이지 표시)
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="예: 현재 방송 경과 시간을 안내합니다."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* 3. 봇 답변 템플릿 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-200">
                봇 응답 문구 템플릿
              </label>
              <span className="text-[10px] text-slate-500">태그 클릭 시 자동 삽입</span>
            </div>
            
            {/* 변수 칩 버튼들 */}
            <div className="flex flex-wrap gap-1.5 mb-2 p-2 rounded-xl bg-slate-950/50 border border-white/5">
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
              placeholder="비워두시면 시스템 기본 응답 문구가 적용됩니다."
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 font-sans"
            />
          </div>

          {/* 4. 권한, 쿨다운, 재화, 비용 4개 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-200 mb-1">사용 권한</label>
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
              <label className="block font-bold text-slate-200 mb-1">쿨타임 (초)</label>
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
              <label className="block font-bold text-slate-200 mb-1">소모 재화</label>
              <select
                value={currency}
                onChange={(e: any) => setCurrency(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none font-bold"
              >
                <option value="chips">🪙 {cUnit}</option>
                <option value="points">🧀 {pUnit}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-200 mb-1">소모 수량</label>
              <input
                type="number"
                min="0"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                placeholder="0 = 무료"
              />
            </div>
          </div>

          {/* 5. 시청자 페이지 공개 여부 옵션 */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-sky-400" />
                시청자 가이드 페이지(/view)에 노출
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                체크 해제 시 봇은 정상 작동하지만 시청자용 웹 가이드에는 표시되지 않습니다.
              </div>
            </div>
            <input
              type="checkbox"
              checked={visibleInViewer}
              onChange={(e) => setVisibleInViewer(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400 bg-slate-900 border-white/20 cursor-pointer"
            />
          </div>

          {/* 푸터 액션 버튼들 */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting || isSaving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all disabled:opacity-50"
              title="이 명령어를 설치 시 기본값으로 복구합니다."
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>기본값으로 복구</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>저장 완료!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>{isSaving ? '저장 중...' : '저장하기'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

