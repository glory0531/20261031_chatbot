import React, { useState } from 'react';
import { ListOrdered, Plus, CheckCircle, Clock, PlayCircle, Trash2 } from 'lucide-react';
import { GeneralRequest } from '../types';
import { api } from '../services/api';

interface RequestsViewProps {
  requests: GeneralRequest[];
}

export const RequestsView: React.FC<RequestsViewProps> = ({ requests }) => {
  const [filter, setFilter] = useState<'all' | 'waiting' | 'in_progress' | 'done'>('all');
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await api.sendChat(`!신청 ${newTitle.trim()}`, 'streamer');
    setNewTitle('');
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.updateRequestStatus(id, status);
  };

  const handleDelete = async (id: string) => {
    await api.deleteRequest(id);
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-amber-400" />
            시참 & 미션 신청 대기열
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            시청자들이 !신청 명령어로 남긴 게임 시참과 미션을 순서대로 확인하고 진행 상태를 관리합니다.
          </p>
        </div>

        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="수동 신청 등록 (예: 칼바람 5인팟)"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none w-56"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" /> 등록
          </button>
        </form>
      </div>

      {/* 상태 필터 탭 */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {(['all', 'waiting', 'in_progress', 'done'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === st
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {st === 'all' ? `전체 (${requests.length})` :
             st === 'waiting' ? `대기 중 (${requests.filter(r => r.status === 'waiting').length})` :
             st === 'in_progress' ? `진행 중 (${requests.filter(r => r.status === 'in_progress').length})` :
             `완료 (${requests.filter(r => r.status === 'done').length})`}
          </button>
        ))}
      </div>

      {/* 리스트 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, idx) => (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all ${
              item.status === 'in_progress'
                ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
                : item.status === 'done'
                ? 'bg-slate-900/40 border-white/5 opacity-60'
                : 'bg-slate-900/70 border-white/10'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                item.status === 'in_progress' ? 'bg-amber-500 text-slate-950' :
                item.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-slate-800 text-slate-400'
              }`}>
                {item.status === 'in_progress' ? '지금 진행 중' :
                 item.status === 'done' ? '완료됨' : '대기 순번'}
              </span>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-slate-500 hover:text-rose-400 p-1"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <h4 className="font-extrabold text-sm text-white mb-2 line-clamp-2">
              {item.title}
            </h4>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
              <span>신청자: <strong className="text-slate-200">{item.requester}</strong></span>
              <div className="flex items-center gap-1.5">
                {item.status === 'waiting' && (
                  <button
                    onClick={() => handleStatusChange(item.id, 'in_progress')}
                    className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold"
                  >
                    진행 시작
                  </button>
                )}
                {item.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(item.id, 'done')}
                    className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold"
                  >
                    완료 처리
                  </button>
                )}
                {item.status === 'done' && (
                  <button
                    onClick={() => handleStatusChange(item.id, 'waiting')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    대기로 되돌리기
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
