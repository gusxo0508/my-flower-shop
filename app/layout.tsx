// app/layout.tsx
'use client'; 

import './globals.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Toaster, toast } from 'react-hot-toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchUserRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole('user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) setUserRole(data.role);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('안전하게 로그아웃 되었습니다.');
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  };

  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900">
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontWeight: 'bold' } }} />

        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              
              {/* ✨ 왼쪽 메뉴: 누구나 볼 수 있는 공통 메뉴 */}
              <div className="flex-shrink-0 flex items-center gap-6">
                <Link href="/" className="text-xl font-extrabold text-green-800 tracking-tight">
                  🌻 아빠의 꽃
                </Link>
                <Link href="/shop" className="text-gray-600 hover:text-green-700 font-semibold">
                  꽃 구경하기
                </Link>
                {/* 👇 새롭게 추가된 '농장 소식(공지사항)' 메뉴 👇 */}
                <Link href="/notices" className="text-gray-600 hover:text-green-700 font-semibold">
                  농장 소식
                </Link>
              </div>

              {/* 오른쪽 메뉴: 로그인/로그아웃 및 권한별 메뉴 */}
              <div className="flex items-center gap-4">
                {session ? (
                  <>
                    <Link href="/mypage" className="text-gray-600 hover:text-green-700 text-sm font-semibold">
                      마이페이지
                    </Link>
                    
                    {/* 관리자 전용 메뉴 */}
                    {userRole === 'admin' && (
                      <>
                        <span className="text-gray-300">|</span>
                        <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm font-bold">
                          재고 관리
                        </Link>
                        <Link href="/orders" className="text-blue-600 hover:text-blue-800 text-sm font-bold">
                          주문 장부
                        </Link>
                        <Link href="/admin/members" className="text-blue-600 hover:text-blue-800 text-sm font-bold">
                          회원 관리
                        </Link>
                        <Link href="/admin/notices" className="text-blue-600 hover:text-blue-800 text-sm font-bold">
                          공지 관리
                        </Link>
                      </>
                    )}
                    
                    <button 
                      onClick={handleLogout}
                      className="ml-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors">
                    로그인 / 가입
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        <div className="pt-4">
          {children}
        </div>
      </body>
    </html>
  );
}