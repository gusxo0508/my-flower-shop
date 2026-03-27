// app/admin/notices/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

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
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('notices').insert([{ title, content }]);

    if (error) {
      toast.error('등록 실패: ' + error.message);
    } else {
      toast.success('공지사항이 등록되었습니다.');
      setTitle('');
      setContent('');
      fetchNotices();
    }
    setLoading(false);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (!error) {
      toast.success('삭제되었습니다.');
      fetchNotices();
    } else {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 px-6 md:px-10">
      <main className="max-w-4xl mx-auto">
        
        <header className="mb-16 border-b border-stone-200 pb-8 text-center">
          <h3 className="text-[10px] tracking-[0.3em] text-amber-700 mb-4 uppercase font-bold">Admin Console</h3>
          <h1 className="text-3xl font-serif text-stone-900 tracking-wide">공지사항 관리</h1>
        </header>
        
        {/* ✨ 고급스러운 작성 에디터 폼 */}
        <form onSubmit={handlePostNotice} className="bg-white p-10 md:p-14 border border-stone-200 shadow-xl shadow-stone-200/20 mb-20">
          <h2 className="text-[10px] font-bold text-stone-400 tracking-[0.2em] uppercase mb-10 border-b border-stone-100 pb-4">Create New Notice</h2>
          
          <div className="mb-8">
            <input 
              type="text" 
              placeholder="제목 (Title)" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent border-b border-stone-300 py-4 text-xl font-light text-stone-900 focus:outline-none focus:border-stone-900 transition-colors"
            />
          </div>
          
          <div className="mb-10">
            <textarea 
              placeholder="본문 내용을 입력하세요. (Content)" 
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent border-b border-stone-300 py-4 text-base font-light text-stone-700 focus:outline-none focus:border-stone-900 transition-colors resize-none leading-loose"
            />
          </div>
          
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-stone-900 text-white text-[10px] tracking-[0.2em] px-12 py-4 uppercase hover:bg-stone-800 transition-colors disabled:bg-stone-300 shadow-md"
            >
              {loading ? 'Processing...' : 'Post Notice'}
            </button>
          </div>
        </form>

        {/* ✨ 미니멀한 등록된 공지사항 리스트 */}
        <div>
          <h2 className="text-[10px] font-bold text-stone-400 tracking-[0.2em] uppercase mb-6">Published Notices</h2>
          
          {notices.length === 0 ? (
            <div className="text-center py-24 text-stone-400 text-xs tracking-widest border border-stone-200 bg-white">
              등록된 공지사항이 없습니다.
            </div>
          ) : (
            <div className="bg-white border-t border-b border-stone-900">
              <div className="divide-y divide-stone-100">
                {notices.map(notice => (
                  <div key={notice.id} className="p-6 md:p-8 flex flex-col md:flex-row justify-between md:items-center hover:bg-stone-50 transition-colors group">
                    <div className="mb-4 md:mb-0">
                      <h3 className="text-lg font-light text-stone-800 tracking-wide group-hover:text-amber-700 transition-colors">{notice.title}</h3>
                    </div>
                    <div className="flex items-center gap-6 md:gap-10">
                      <span className="text-[10px] tracking-widest text-stone-400 uppercase">
                        {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                      </span>
                      <button 
                        onClick={() => handleDeleteNotice(notice.id)} 
                        className="text-[10px] tracking-[0.2em] text-stone-300 hover:text-red-600 transition-colors uppercase font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}