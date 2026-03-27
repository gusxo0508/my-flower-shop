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
      const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
      if (data) setNotices(data);
      setLoading(false);
    };
    fetchNotices();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 px-6 md:px-10">
      <main className="max-w-4xl mx-auto">
        
        <header className="mb-16 text-center">
          <h3 className="text-xs tracking-[0.3em] text-amber-700 mb-4 uppercase font-bold">Information</h3>
          <h1 className="text-4xl font-serif text-stone-900 tracking-wide mb-6">농장 소식</h1>
          <div className="h-[1px] w-12 bg-stone-300 mx-auto"></div>
        </header>

        {loading ? (
          <div className="text-center py-32 text-stone-400 font-light tracking-widest text-sm animate-pulse">LOADING...</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-32 text-stone-400 font-light tracking-widest border border-stone-200 bg-white">NO NOTICES</div>
        ) : (
          <div className="bg-white border-t-2 border-b border-stone-900">
            <ul className="divide-y divide-stone-200">
              {notices.map((notice) => (
                <li 
                  key={notice.id} 
                  onClick={() => router.push(`/notices/${notice.id}`)}
                  className="px-6 py-8 hover:bg-stone-50 cursor-pointer transition-colors flex flex-col md:flex-row justify-between md:items-center group"
                >
                  <div className="flex-1 mb-2 md:mb-0">
                    <h2 className="text-lg font-light text-stone-800 group-hover:text-amber-700 transition-colors tracking-wide">
                      {notice.title}
                    </h2>
                  </div>
                  <div className="text-xs tracking-widest text-stone-400 font-light md:ml-8 shrink-0 uppercase">
                    {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}