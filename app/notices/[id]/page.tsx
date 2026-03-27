// app/notices/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react'; 
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function NoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params); 
  const noticeId = resolvedParams.id; 

  const [notice, setNotice] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchNoticeAndComments();
    checkUser();
  }, [noticeId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile);
    }
  };

  const fetchNoticeAndComments = async () => {
    const { data: noticeData } = await supabase.from('notices').select('*').eq('id', noticeId).single();
    setNotice(noticeData);

    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, profiles(name, role)') 
      .eq('notice_id', noticeId)
      .order('created_at', { ascending: true }); 
    
    if (commentsError) {
      toast.error('댓글을 불러오지 못했습니다.');
    } else if (commentsData) {
      setComments(commentsData);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('로그인 후 이용 가능합니다.');
      return;
    }
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('comments').insert([{ notice_id: noticeId, user_id: user?.id, content: newComment }]);

    if (error) {
      toast.error('댓글 등록에 실패했습니다.');
    } else {
      toast.success('등록되었습니다.');
      setNewComment('');
      fetchNoticeAndComments(); 
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      toast.success('삭제되었습니다.');
      fetchNoticeAndComments();
    }
  };

  if (!notice) return <div className="min-h-screen flex items-center justify-center text-stone-400 text-xs tracking-widest animate-pulse">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 px-6 md:px-10">
      <main className="max-w-3xl mx-auto">
        
        <button onClick={() => router.push('/notices')} className="mb-12 text-xs tracking-[0.2em] text-stone-400 hover:text-stone-900 transition-colors uppercase flex items-center gap-2">
          <span>←</span> Back to List
        </button>

        {/* 📢 본문 영역 */}
        <article className="bg-white px-8 py-16 md:px-16 md:py-20 border border-stone-200 mb-12 shadow-xl shadow-stone-200/20">
          <div className="text-center mb-16">
            <h3 className="text-[10px] tracking-[0.3em] text-amber-700 mb-6 uppercase font-bold">Notice</h3>
            <h1 className="text-3xl font-serif text-stone-900 tracking-wide mb-8 leading-snug">{notice.title}</h1>
            <div className="flex items-center justify-center gap-6 text-[10px] tracking-widest text-stone-400 uppercase">
              <span>By Father's Flower</span>
              <div className="w-1 h-1 rounded-full bg-stone-300"></div>
              <span>{new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <div className="h-[1px] w-full bg-stone-100 mt-10"></div>
          </div>
          <div className="text-base text-stone-700 font-light leading-loose whitespace-pre-wrap min-h-[200px]">
            {notice.content}
          </div>
        </article>

        {/* 💬 댓글 영역 */}
        <div className="bg-white p-8 md:p-12 border border-stone-200">
          <h2 className="font-serif text-lg text-stone-900 tracking-widest mb-8 uppercase flex items-center justify-between border-b border-stone-100 pb-4">
            Comments <span className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1">{comments.length}</span>
          </h2>
          
          <div className="space-y-6 mb-12">
            {comments.length === 0 ? (
              <p className="text-center py-16 text-stone-400 text-xs tracking-widest font-light bg-stone-50 border border-stone-100">
                NO COMMENTS YET
              </p>
            ) : (
              comments.map(comment => {
                const isAdmin = comment.profiles?.role === 'admin';
                const isMine = currentUser?.id === comment.user_id;

                return (
                  <div key={comment.id} className={`p-6 border-b border-stone-100 ${isAdmin ? 'bg-stone-50' : 'bg-white'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm tracking-wide ${isAdmin ? 'font-medium text-stone-900' : 'font-light text-stone-700'}`}>
                          {comment.profiles?.name}
                        </span>
                        {isAdmin && <span className="text-[9px] tracking-widest border border-amber-700 text-amber-700 px-1.5 py-0.5 uppercase">Admin</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-stone-400 tracking-widest">{new Date(comment.created_at).toLocaleDateString('ko-KR')}</span>
                        {isMine && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-[10px] tracking-widest text-red-400 hover:text-red-700 transition-colors uppercase">Delete</button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 font-light leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handlePostComment} className="flex flex-col gap-4">
            <textarea 
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentUser ? "소중한 의견을 남겨주세요." : "로그인 후 이용 가능합니다."}
              disabled={!currentUser}
              className="w-full border-b border-stone-300 bg-transparent py-4 text-sm font-light text-stone-800 focus:outline-none focus:border-stone-900 transition-colors disabled:cursor-not-allowed resize-none"
            />
            <div className="flex justify-end mt-4">
              <button type="submit" disabled={!currentUser || !newComment.trim()} className="bg-stone-900 text-white text-[10px] tracking-[0.2em] px-8 py-3 uppercase hover:bg-stone-800 transition-colors disabled:bg-stone-300">
                Submit
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}