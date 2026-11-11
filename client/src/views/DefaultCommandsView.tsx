import React, { useState } from 'react';
import { 
  Sliders, 
  ToggleLeft, 
  ToggleRight, 
  Eye, 
  EyeOff, 
  Edit2, 
  ShieldCheck, 
  Coins, 
  Clock 
} from 'lucide-react';
import { DefaultCommandConfig, Settings } from '../types';
import { api } from '../services/api';
import { DefaultCommandEditModal } from '../components/DefaultCommandEditModal';

interface DefaultCommandsViewProps {
  defaultCommands: Record<string, DefaultCommandConfig>;
  prefix: string;
  settings?: Settings;
}

export const DefaultCommandsView: React.FC<DefaultCommandsViewProps> = ({ 
  defaultCommands, 
  prefix,
  settings 
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const handleToggle = async (key: string, currentVal: boolean) => {
    await api.toggleDefaultCommand(key, !currentVal);
  };

  const handleToggleViewer = async (key: string, currentVisible: boolean) => {
    const config = defaultCommands[key];
    await api.toggleDefaultCommandViewer(key, config?.enabled ?? false, !currentVisible);
  };

  const handleSaveModal = async (key: string, updates: Partial<DefaultCommandConfig>) => {
    await api.updateDefaultCommand(key, updates);
  };

  const handleResetModal = async (key: string) => {
    await api.resetDefaultCommand(key);
  };

  const commandDetails: Record<string, { syntax: string; desc: string; category: string }> = {
    uptime: { syntax: '!업타임', desc: '현재 방송을 시작한 후 경과된 시간을 시/분/초 단위로 알려줍니다.', category: '방송 정보' },
    title: { syntax: '!방제 [새제목]', desc: '채팅으로 방송 제목을 즉시 변경합니다. (매니저/스트리머 전용)', category: '방송 관리' },
    category: { syntax: '!카테고리 [새카테고리]', desc: '방송 카테고리를 즉시 변경합니다. (매니저/스트리머 전용)', category: '방송 관리' },
    attend: { syntax: '!출첵 / !출석', desc: '1일 1회 출석 체크를 수행하고 연속 출석 보너스 포인트를 지급합니다.', category: '참여 & 포인트' },
    point: { syntax: '!포인트', desc: '시청자 본인의 현재 보유 포인트와 총 출석 횟수를 조회합니다.', category: '참여 & 포인트' },
    donate: { syntax: '!도네 [포인트] [메시지]', desc: '채팅으로 포인트를 방송에 후원하고 화면에 알림과 TTS를 띄웁니다.', category: '참여 & 포인트' },
    fund: { syntax: '!모금 [포인트]', desc: '스트리머가 설정한 모금 목표에 포인트를 함께 기부합니다.', category: '참여 & 포인트' },
    vote: { syntax: '!투표 [번호] [포인트]', desc: '진행 중인 투표/예측 항목에 포인트를 배팅합니다.', category: '참여 & 포인트' },
    sr: { syntax: '!노래 / !sr [곡명 or 유튜브링크]', desc: '방송 화면 플레이어에 재생할 유튜브 노래를 신청합니다.', category: '방송 도구' },
    request: { syntax: '!신청 [내용]', desc: '시청자 참여 또는 미션 요청을 대기열에 등록합니다.', category: '방송 도구' },
    dice: { syntax: '!주사위', desc: '1~100 사이의 숫자를 무작위로 굴립니다.', category: '미니게임' },
    fishing: { syntax: '!낚시', desc: '미끼를 소모해 물고기, 장화, 황금 잉어를 낚습니다.', category: '미니게임' },
    rps: { syntax: '!가위바위보 [가위/바위/보] [배팅]', desc: '봇과 가위바위보 대결을 하여 승리 시 2배 배당을 받습니다.', category: '미니게임' },
    jump: { syntax: '!점프', desc: '방송 화면에 떠 있는 본인의 채팅 아바타를 점프시킵니다.', category: '방송 도구' },
    roulette: { syntax: '!룰렛', desc: '재화를 소모하여 행운의 룰렛을 돌립니다.', category: '미니게임' },
    ticket: { syntax: '!티켓', desc: '보유 중인 티켓 수량을 확인합니다.', category: '참여 & 포인트' }
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

  const cUnit = settings?.chipName || '칩';
  const pUnit = settings?.pointName || '포인트';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            신사들의 기본 에티켓 (기본 내장 명령어)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            샤봇에 기본 탑재된 스마트 명령어들을 ON/OFF 조율하고 호출 별칭, 답변 문구, 권한, 비용을 <b className="text-amber-300">[✏️ 편집]</b>할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(defaultCommands).map(([key, config]) => {
          const detail = commandDetails[key] || { syntax: `!${config.name}`, desc: config.desc, category: '기타' };
          const isViewerVisible = config.visibleInViewer !== false;
          const permBadge = getPermissionBadge(config.permission);
          const aliasList = Array.isArray(config.aliases) && config.aliases.length > 0 ? config.aliases : [config.name || key];
          const hasAliases = aliasList.length > 1;

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
                      {prefix}{config.name || key}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-semibold text-slate-400 border border-white/5">
                      {detail.category}
                    </span>
                    {permBadge && (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${permBadge.color}`}>
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {permBadge.label}
                      </span>
                    )}
                    {Number(config.cost) > 0 && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border bg-amber-500/10 text-amber-300 border-amber-500/20 flex items-center gap-1">
                        <Coins className="w-2.5 h-2.5" />
                        {(config.cost ?? 0).toLocaleString()}{cUnit}
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
                    {/* 편집 버튼 */}
                    <button
                      type="button"
                      onClick={() => setEditingKey(key)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border shrink-0 bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 shadow-sm"
                      title="명령어 별칭, 답변 문구, 권한, 비용 편집"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>편집</span>
                    </button>

                    {/* 시청자 페이지 공개 여부 토글 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleToggleViewer(key, isViewerVisible)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border shrink-0 whitespace-nowrap ${
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

                    {/* 봇 활성화 토글 */}
                    <button
                      onClick={() => handleToggle(key, config.enabled)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors ml-1"
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
                  {config.desc || detail.desc}
                </p>

                {hasAliases && (
                  <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-1">
                    <span className="text-slate-500">별칭:</span>
                    <span className="font-mono text-amber-300/80">
                      {aliasList.map(a => `${prefix}${a}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/5 text-[11px] font-mono text-slate-400 flex items-center justify-between mt-2">
                <span>예시: <strong className="text-amber-300">{detail.syntax}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 기본 명령어 수정 모달 */}
      <DefaultCommandEditModal
        isOpen={Boolean(editingKey)}
        cmdKey={editingKey || ''}
        config={editingKey ? defaultCommands[editingKey] || null : null}
        prefix={prefix}
        settings={settings}
        onClose={() => setEditingKey(null)}
        onSave={handleSaveModal}
        onReset={handleResetModal}
      />
    </div>
  );
};
