import React from 'react';
import { Sliders, ToggleLeft, ToggleRight, Sparkles, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { DefaultCommandConfig } from '../types';
import { api } from '../services/api';

interface DefaultCommandsViewProps {
  defaultCommands: Record<string, DefaultCommandConfig>;
  prefix: string;
}

export const DefaultCommandsView: React.FC<DefaultCommandsViewProps> = ({ defaultCommands, prefix }) => {
  const handleToggle = async (key: string, currentVal: boolean) => {
    await api.toggleDefaultCommand(key, !currentVal);
  };

  const handleToggleViewer = async (key: string, currentVisible: boolean) => {
    const config = defaultCommands[key];
    await api.toggleDefaultCommandViewer(key, config?.enabled ?? false, !currentVisible);
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
    sr: { syntax: '!sr [유튜브 링크 or 제목]', desc: '방송 화면 플레이어에 재생할 유튜브 노래를 신청합니다.', category: '방송 도구' },
    request: { syntax: '!신청 [내용]', desc: '시청자 참여 또는 미션 요청을 대기열에 등록합니다.', category: '방송 도구' },
    dice: { syntax: '!주사위', desc: '1~100 사이의 숫자를 무작위로 굴립니다.', category: '미니게임' },
    fishing: { syntax: '!낚시', desc: '미끼 포인트(20P)를 소모해 물고기, 장화, 황금 잉어를 낚습니다.', category: '미니게임' },
    rps: { syntax: '!가위바위보 [가위/바위/보] [포인트]', desc: '봇과 가위바위보 대결을 하여 승리 시 2배 배당을 받습니다.', category: '미니게임' },
    jump: { syntax: '!점프', desc: '방송 화면에 떠 있는 본인의 채팅 아바타를 점프시킵니다.', category: '방송 도구' }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          신사들의 기본 에티켓 (기본 내장 명령어)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          샤봇에 기본 탑재된 스마트 명령어들을 ON/OFF 조율하고 시청자 공개 페이지에 표시할 항목을 선택합니다. <b className="text-sky-300">[시청자 공개/숨김]</b> 버튼으로 시청자 웹페이지(/view)에 노출할 항목을 자유롭게 선택할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(defaultCommands).map(([key, config]) => {
          const detail = commandDetails[key] || { syntax: `!${config.name}`, desc: config.desc, category: '기타' };
          const isViewerVisible = config.visibleInViewer !== false;

          return (
            <div
              key={key}
              className={`p-4 rounded-2xl border transition-all ${
                config.enabled
                  ? 'bg-slate-900/70 border-white/10 hover:border-amber-500/30'
                  : 'bg-slate-900/30 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 font-bold font-mono text-xs border border-amber-500/20">
                    {prefix}{config.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] font-semibold text-slate-400 border border-white/5">
                    {detail.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
                        <span className="whitespace-nowrap">시청자 공개</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="whitespace-nowrap">시청자 숨김</span>
                      </>
                    )}
                  </button>

                  {/* 봇 활성화 토글 */}
                  <button
                    onClick={() => handleToggle(key, config.enabled)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    title={config.enabled ? '봇 명령어 동작 활성화됨' : '봇 명령어 일시 중지'}
                  >
                    {config.enabled ? (
                      <>
                        <span className="text-emerald-400">사용 중</span>
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      </>
                    ) : (
                      <>
                        <span>꺼짐</span>
                        <ToggleLeft className="w-6 h-6 text-slate-600" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-medium leading-relaxed mb-2">
                {detail.desc}
              </p>

              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/5 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>예시: <strong className="text-amber-300">{detail.syntax}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
