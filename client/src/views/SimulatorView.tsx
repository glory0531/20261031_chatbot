import React, { useState } from 'react';
import { FlaskConical, Send, Coins, CalendarCheck, Music, Dices, Sparkles, Power, CircleDollarSign, Gift } from 'lucide-react';
import { Settings } from '../types';
import { api } from '../services/api';

interface SimulatorViewProps {
  simulatorRunning?: boolean;
  settings?: Settings;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ simulatorRunning = false, settings }) => {
  const [customUser, setCustomUser] = useState('테스트시청자1');
  const [customMsg, setCustomMsg] = useState('');
  const [donateAmount, setDonateAmount] = useState(100);
  const [donateMsg, setDonateMsg] = useState('방송 너무 재밌어요 항상 응원합니다! 💖');
  const [cheeseAmount, setCheeseAmount] = useState(1000);
  const [cheeseMsg, setCheeseMsg] = useState('치즈 1,000개 후원합니다! 룰렛 돌려볼게요~');
  const [songTitle, setSongTitle] = useState('Hype Boy - NewJeans');
  const [toggling, setToggling] = useState(false);

  const pUnit = settings?.pointName || 'P';
  const cUnit = settings?.chipName || '칩';

  const handleToggleAutoSim = async () => {
    setToggling(true);
    await api.toggleAutoSimulator();
    setToggling(false);
  };

  const handleSimulateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    await api.simulateAction('chat', { username: customUser, message: customMsg });
    setCustomMsg('');
  };

  const handleQuickAction = async (action: string, options: any = {}) => {
    await api.simulateAction(action, { username: customUser, ...options });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-400" />
            방송 시뮬레이터 (사전 리허설 테스트)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            치즈 후원 유료 포인트 적립, 룰렛 돌리기, 활동 칩 출석체크, 후원 TTS 알림, 미니게임을 실제 방송 전 미리 테스트할 수 있습니다.
          </p>
        </div>

        <button
          onClick={handleToggleAutoSim}
          disabled={toggling}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
            simulatorRunning
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{simulatorRunning ? '자동 가상 채팅 가동 중 (끄기)' : '자동 가상 채팅 시뮬레이터 켜기'}</span>
        </button>
      </div>

      {/* 시뮬레이터 사용자 선택 */}
      <div className="p-4 rounded-2xl witch-card flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-slate-300">테스트 가상 닉네임:</span>
        <div className="flex flex-wrap gap-2">
          {['테스트시청자1', '테스트시청자2', '열혈구독자', '단골팬', '방송매니저'].map((name) => (
            <button
              key={name}
              onClick={() => setCustomUser(name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                customUser === name
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 빠른 원클릭 시뮬레이션 액션들 */}
        <div className="p-5 rounded-2xl witch-card space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> 재화 & 미니게임 원클릭 테스트
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickAction('attend')}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/30 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                <CalendarCheck className="w-4 h-4" /> 가상 출석체크 ({cUnit})
              </div>
              <p className="text-[11px] text-slate-400">!출첵 실행 및 활동 칩 적립</p>
            </button>

            <button
              onClick={() => handleQuickAction('chat', { message: '!포인트' })}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-1">
                <CircleDollarSign className="w-4 h-4" /> 통합 잔액 조회
              </div>
              <p className="text-[11px] text-slate-400">!포인트 (유료 포인트 & 칩 함께 출력)</p>
            </button>

            <button
              onClick={() => handleQuickAction('roulette')}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/30 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                🎰 룰렛 돌리기
              </div>
              <p className="text-[11px] text-slate-400">!룰렛 (설정된 재화 소모 후 당첨)</p>
            </button>

            <button
              onClick={() => handleQuickAction('chat', { message: '!낚시' })}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/30 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1">
                🎣 낚시 미니게임 ({cUnit})
              </div>
              <p className="text-[11px] text-slate-400">!낚시 미끼 칩 소모 및 보상 획득</p>
            </button>

            <button
              onClick={() => handleQuickAction('jump')}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/30 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1">
                🦘 아바타 점프
              </div>
              <p className="text-[11px] text-slate-400">!점프 실행 및 캐릭터 점프 모션</p>
            </button>

            <button
              onClick={() => handleQuickAction('dice')}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-blue-500/10 border border-slate-800 hover:border-blue-500/30 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-1">
                <Dices className="w-4 h-4" /> 주사위 굴리기
              </div>
              <p className="text-[11px] text-slate-400">!주사위 1~100 난수 굴리기</p>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300">노래 신청 (SR) 테스트</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
              <button
                onClick={() => handleQuickAction('sr', { message: songTitle })}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Music className="w-3.5 h-3.5" /> 신청
              </button>
            </div>
          </div>
        </div>

        {/* 우측: 치즈 후원 테스트 & 포인트 도네이션 & 임의 채팅 */}
        <div className="space-y-6">
          {/* 치즈 후원 (유료 포인트 적립) 테스트 카드 */}
          <div className="p-5 rounded-2xl witch-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" /> 치즈 후원 테스트 (유료 {pUnit} 자동 적립)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                치지직 연동 테스트
              </span>
            </div>
            <p className="text-xs text-slate-400">
              실제 치즈 후원이 발생했을 때 유료 포인트 지갑에 적립되고, 룰렛을 돌릴 수 있는지 검증합니다.
            </p>

            <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCheeseAmount(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      cheeseAmount === amt
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    🧀 {amt.toLocaleString()} 치즈
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={cheeseMsg}
                onChange={(e) => setCheeseMsg(e.target.value)}
                placeholder="치즈 후원 메시지..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />

              <button
                onClick={() => handleQuickAction('cheese', { amount: cheeseAmount, message: cheeseMsg })}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Gift className="w-4 h-4" /> [{customUser}] {cheeseAmount.toLocaleString()} 치즈 후원 발생시키기
              </button>
            </div>
          </div>

          {/* 챗봇 도네 & 임의 채팅 카드 */}
          <div className="p-5 rounded-2xl witch-card space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" /> 방송 재화 도네이션 & 임의 채팅
            </h3>

            <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex gap-2">
                {[50, 100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDonateAmount(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      donateAmount === amt
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={donateMsg}
                onChange={(e) => setDonateMsg(e.target.value)}
                placeholder="후원 메시지..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />

              <button
                onClick={() => handleQuickAction('donate', { amount: donateAmount, message: donateMsg })}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Coins className="w-4 h-4" /> [{customUser}] !도네 {donateAmount.toLocaleString()} 테스트
              </button>
            </div>

            <form onSubmit={handleSimulateChat} className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300">임의 명령어 및 채팅 발송</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="예: !모금 100, !룰렛, !가위바위보 가위 50"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> 발송
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
