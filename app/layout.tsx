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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchUserRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchUserRole(session.user.id);
      else setUserRole('user');
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) setUserRole(data.role);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('로그아웃 되었습니다.');
    setTimeout(() => { window.location.href = '/login'; }, 1000);
  };

  return (
    <html lang="ko" className="antialiased">
      <body className="bg-[#FAFAFA] text-stone-800 font-light selection:bg-stone-800 selection:text-stone-100">
        
        {/* ✨ 팝업(Toast)을 다크 럭셔리 톤으로 전면 수정 */}
        <Toaster 
          position="top-center" 
          toastOptions={{ 
            duration: 3000, 
            style: { 
              background: '#1c1917', // 차콜/블랙 배경
              color: '#fafafa',      // 흰색 글씨
              borderRadius: '0px',   // 완벽한 직각
              border: '1px solid #44403c', // 은은한 다크 테두리
              fontSize: '13px',
              fontWeight: '300',
              letterSpacing: '0.05em',
              padding: '16px 24px',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)'
            },
            success: {
              iconTheme: { 
                primary: '#b45309', // 골드(Amber) 색상 체크마크
                secondary: '#fff' 
              }
            },
            error: {
              iconTheme: { 
                primary: '#ef4444', 
                secondary: '#fff' 
              }
            }
          }} 
        />

        {/* ✨ 고급스러운 호텔 스타일 네비게이션 바 */}
        <nav className={`fixed w-full top-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/95 backdrop-blur-sm border-b border-stone-200 py-2' : 'bg-transparent py-4'}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="flex justify-between items-center">
              
              <div className="flex items-center gap-10">
                <Link href="/" className={`text-2xl font-serif tracking-widest ${isScrolled ? 'text-stone-900' : 'text-stone-900'} transition-colors`}>
                  FATHER'S FLOWER
                </Link>
                <div className="hidden md:flex gap-8">
                  <Link href="/shop" className={`text-sm tracking-widest hover:text-amber-700 transition-colors ${isScrolled ? 'text-stone-600' : 'text-stone-800'}`}>
                    FLOWER MARKET
                  </Link>
                  <Link href="/notices" className={`text-sm tracking-widest hover:text-amber-700 transition-colors ${isScrolled ? 'text-stone-600' : 'text-stone-800'}`}>
                    NOTICE
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {session ? (
                  <>
                    <Link href="/mypage" className={`text-xs tracking-widest hover:text-amber-700 transition-colors ${isScrolled ? 'text-stone-600' : 'text-stone-800'}`}>
                      MY PAGE
                    </Link>
                    
                    {userRole === 'admin' && (
                      <div className="hidden md:flex items-center gap-5 ml-4 pl-6 border-l border-stone-300">
                        <Link href="/admin" className="text-stone-500 hover:text-stone-900 text-xs tracking-widest">INVENTORY</Link>
                        <Link href="/orders" className="text-stone-500 hover:text-stone-900 text-xs tracking-widest">ORDERS</Link>
                        <Link href="/admin/members" className="text-stone-500 hover:text-stone-900 text-xs tracking-widest">MEMBERS</Link>
                        <Link href="/admin/notices" className="text-stone-500 hover:text-stone-900 text-xs tracking-widest">ADMIN NOTICE</Link>
                      </div>
                    )}
                    
                    <button 
                      onClick={handleLogout}
                      className="ml-2 text-xs tracking-widest text-stone-500 hover:text-stone-900 transition-all uppercase"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="border border-stone-800 text-stone-800 px-6 py-2 text-xs tracking-widest hover:bg-stone-800 hover:text-white transition-all duration-300">
                    LOGIN
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        <div className="min-h-screen">
          {children}
        </div>
        
        {/* ✨ 미니멀하고 무게감 있는 푸터 */}
        <footer className="bg-stone-900 text-stone-400 py-16 mt-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-xl font-serif text-stone-200 tracking-widest mb-2">FATHER'S FLOWER</h2>
              <p className="text-xs tracking-widest font-light">EXCLUSIVE FLORIST B2B PLATFORM</p>
            </div>
            <div className="text-xs tracking-widest font-light text-right">
              <p>© 2026 FATHER'S FLOWER. ALL RIGHTS RESERVED.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}