// app/admin/notices/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast'; // ✨ 토스트 추가

export default function AdminNotices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    const { data } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setNotices(data);
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast.error('제목과 내용을 모두 입력해주세요 ✏️');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('notices')
      .insert([{ title, content }]);

    if (error) {
      toast.error('공지사항 등록 실패: ' + error.message);
    } else {
      toast.success('✅ 공지사항이 성공적으로 등록되었습니다!');
      setTitle('');
      setContent('');
      fetchNotices();
    }
    setLoading(false);
  };

  const handleDeleteNotice = async (id: string) => {
    // 삭제 전 확인은 브라우저 기본 confirm이 안전하므로 그대로 둡니다.
    if (!window.confirm('정말 이 공지사항을 삭제하시겠습니까?')) return;
    
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (!error) {
      toast.success('삭제되었습니다 🗑️');
      fetchNotices();
    } else {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <main className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b border-gray-200 pb-4">📢 공지사항 관리</h1>
        
        <form onSubmit={handlePostNotice} className="bg-green-50 p-6 rounded-xl border border-green-200 mb-10">
          <h2 className="text-lg font-bold text-green-800 mb-4">새 공지사항 작성</h2>
          <div className="mb-4">
            <input 
              type="text" 
              placeholder="제목 (예: 3월 28일 출하 일정 안내)" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 font-bold focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="mb-4">
            <textarea 
              placeholder="내용을 입력하세요. (예: 내일 비 예보로 인해 작업이 지연될 수 있습니다.)" 
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="text-right">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-green-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? '등록 중...' : '플로리스트들에게 공지 띄우기'}
            </button>
          </div>
        </form>

        <h2 className="text-xl font-bold text-gray-800 mb-4">등록된 공지사항 목록</h2>
        <div className="space-y-4">
          {notices.length === 0 ? (
            <div className="text-center text-gray-500 py-10 border border-dashed rounded-lg">등록된 공지사항이 없습니다.</div>
          ) : (
            notices.map(notice => (
              <div key={notice.id} className="border border-gray-200 p-5 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{notice.title}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
                    <button onClick={() => handleDeleteNotice(notice.id)} className="text-red-500 text-sm font-bold hover:underline">삭제</button>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}