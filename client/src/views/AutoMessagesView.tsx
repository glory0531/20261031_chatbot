import React, { useState } from 'react';
import { BellRing, Plus, Clock, Edit2, Trash2, ToggleLeft, ToggleRight, X, AlertCircle } from 'lucide-react';
import { AutoMessage } from '../types';
import { api } from '../services/api';

interface AutoMessagesViewProps {
  autoMessages: AutoMessage[];
}

export const AutoMessagesView: React.FC<AutoMessagesViewProps> = ({ autoMessages }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState<AutoMessage | null>(null);

  const [text, setText] = useState('');
  const [intervalMin, setIntervalMin] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'include' | 'exclude'>('all');
  const [categoryTarget, setCategoryTarget] = useState('');

  const openAddModal = () => {
    setEditingMsg(null);
    setText('');
    setIntervalMin(10);
    setCategoryFilter('all');
    setCategoryTarget('');
    setModalOpen(true);
  };

  const openEditModal = (msg: AutoMessage) => {
    setEditingMsg(msg);
    setText(msg.text);
    setIntervalMin(msg.intervalMin);
    setCategoryFilter(msg.categoryFilter || 'all');
    setCategoryTarget(msg.categoryTarget || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (editingMsg) {
      await api.updateAutoMessage(editingMsg.id, {
        text,
        intervalMin,
        categoryFilter,
        categoryTarget
      });
    } else {
      await api.createAutoMessage({
        text,
        intervalMin,
        categoryFilter,
        categoryTarget
      });
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 자동 공지를 삭제할까요?')) {
      await api.deleteAutoMessage(id);
    }
  };

  const handleToggle = async (msg: AutoMessage) => {
    await api.updateAutoMessage(msg.id, { enabled: !msg.enabled });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-400" />
            정기 자동 공지 메시지
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            설정한 시간 주기마다 방송 규칙, 디스코드, 신청곡 안내 등을 채팅창에 자동으로 발송합니다.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> 자동 메시지 추가
        </button>
      </div>

      <div className="space-y-3">
        {autoMessages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-2xl border transition-all ${
              msg.enabled
                ? 'bg-slate-900/70 border-white/10 hover:border-amber-500/30'
                : 'bg-slate-900/30 border-white/5 opacity-60'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-[11px] border border-amber-500/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {msg.intervalMin}분마다 자동 전송
                  </span>
                  {msg.categoryFilter === 'include' && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-semibold">
                      [{msg.categoryTarget}] 카테고리에서만
                    </span>
                  )}
                  {msg.categoryFilter === 'exclude' && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-semibold">
                      [{msg.categoryTarget}] 제외
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-100 whitespace-pre-wrap">
                  {msg.text}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleToggle(msg)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  {msg.enabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-600" />
                  )}
                </button>
                <button
                  onClick={() => openEditModal(msg)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                  title="수정"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white">
                {editingMsg ? '자동 메시지 수정' : '새 자동 메시지 등록'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  공지 메시지 내용
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="예: 디스코드에서 같이 놀아요! 주소: https://discord.gg/..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">전송 간격 (분)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={intervalMin}
                    onChange={(e) => setIntervalMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">카테고리 필터</label>
                  <select
                    value={categoryFilter}
                    onChange={(e: any) => setCategoryFilter(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                  >
                    <option value="all">모든 카테고리</option>
                    <option value="include">특정 카테고리만</option>
                    <option value="exclude">특정 카테고리 제외</option>
                  </select>
                </div>
              </div>

              {categoryFilter !== 'all' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">대상 카테고리명</label>
                  <input
                    type="text"
                    value={categoryTarget}
                    onChange={(e) => setCategoryTarget(e.target.value)}
                    placeholder="예: 리그 오브 레전드, talk"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
                  />
                </div>
              )}

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
                  {editingMsg ? '저장' : '추가하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
