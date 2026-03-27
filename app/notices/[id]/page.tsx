// app/notices/[id]/page.tsx
'use client';

// ✨ React에서 'use'를 추가로 불러옵니다.
import { useState, useEffect, use } from 'react'; 
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// ✨ params의 타입을 Promise로 감싸줍니다.
export default function NoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // ✨ React.use()를 이용해 params의 포장을 뜯고 id를 꺼냅니다!
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
    // 1. 공지사항 본문 불러오기
    const { data: noticeData } = await supabase.from('notices').select('*').eq('id', noticeId).single();
    setNotice(noticeData);

    // 2. 댓글 불러오기 (에러가 나면 화면에 띄워주도록 수정!)
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, profiles(name, role)') 
      .eq('notice_id', noticeId)
      .order('created_at', { ascending: true }); 
    
    if (commentsError) {
      console.error("댓글 로딩 에러:", commentsError);
      toast.error('댓글을 불러오지 못했습니다: ' + commentsError.message);
    } else if (commentsData) {
      setComments(commentsData);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('로그인 후 댓글을 남길 수 있습니다.');
      return;
    }
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('comments')
      .insert([{ notice_id: noticeId, user_id: user?.id, content: newComment }]);

    if (error) {
      toast.error('댓글 등록에 실패했습니다.');
    } else {
      toast.success('댓글이 등록되었습니다! 💬');
      setNewComment('');
      fetchNoticeAndComments(); 
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      toast.success('삭제되었습니다.');
      fetchNoticeAndComments();
    }
  };

  if (!notice) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-bold">로딩 중입니다...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <main className="max-w-4xl mx-auto">
        
        <button 
          onClick={() => router.push('/notices')} 
          className="mb-6 text-gray-500 font-bold hover:text-green-700 flex items-center gap-2 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"
        >
          ← 목록으로 돌아가기
        </button>

        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-md mb-8 border border-gray-200">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{notice.title}</h1>
          <div className="text-sm text-gray-500 mb-8 pb-4 border-b border-gray-100 flex items-center gap-4">
            <span>작성자: <span className="font-bold text-gray-800">아빠의 꽃</span></span>
            <span>작성일: {new Date(notice.created_at).toLocaleString('ko-KR')}</span>
          </div>
          <div className="text-lg text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[150px]">
            {notice.content}
          </div>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-md border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
            💬 소통하기 <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-sm">{comments.length}</span>
          </h2>
          
          <div className="space-y-4 mb-8">
            {comments.length === 0 ? (
              <p className="text-center py-10 text-gray-400 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">
                아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
              </p>
            ) : (
              comments.map(comment => {
                const isAdmin = comment.profiles?.role === 'admin';
                const isMine = currentUser?.id === comment.user_id;

                return (
                  <div key={comment.id} className={`p-4 rounded-xl border ${isAdmin ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isAdmin ? 'text-blue-800' : 'text-gray-800'}`}>
                          {comment.profiles?.name}
                        </span>
                        {isAdmin && <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">농장주</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                        {isMine && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-xs font-bold text-red-400 hover:text-red-600">삭제</button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handlePostComment} className="flex flex-col gap-3">
            <textarea 
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentUser ? "질문이나 응원의 댓글을 남겨주세요..." : "로그인 후 댓글을 남길 수 있습니다."}
              disabled={!currentUser}
              className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-green-400 focus:outline-none disabled:bg-gray-100 transition-shadow resize-none"
            />
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={!currentUser || !newComment.trim()}
                className="bg-green-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors shadow-sm"
              >
                댓글 쓰기
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}