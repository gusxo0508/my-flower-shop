// app/notices/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function NoticeList() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchNotices = async () => {
      const { data } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setNotices(data);
      setLoading(false);
    };
    fetchNotices();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <main className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
        <div className="bg-green-800 p-8 text-white">
          <h1 className="text-3xl font-extrabold">📢 아빠의 꽃 농장 소식</h1>
          <p className="mt-2 text-green-100">플로리스트 여러분과 소통하는 게시판입니다.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold">게시글을 불러오는 중입니다...</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 text-gray-500">등록된 공지사항이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notices.map((notice) => (
              <li 
                key={notice.id} 
                onClick={() => router.push(`/notices/${notice.id}`)} // ✨ 상세 페이지로 이동
                className="hover:bg-gray-50 cursor-pointer transition-colors p-6 flex justify-between items-center group"
              >
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                    {notice.title}
                  </h2>
                </div>
                <div className="text-sm text-gray-400 font-medium ml-4 shrink-0">
                  {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}