// app/admin/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdminStatus = async () => {
      // 1. 로그인 여부 확인
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('로그인이 필요한 메뉴입니다.');
        router.push('/login');
        return;
      }

      // 2. 관리자(admin) 등급인지 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        toast.error('관리자만 접근할 수 있는 페이지입니다 🚫');
        router.push('/'); // 일반 유저면 메인 화면으로 튕겨냄
        return;
      }

      // 통과!
      setIsAuthorized(true);
    };

    checkAdminStatus();
  }, [router]);

  // 권한을 확인하는 찰나의 순간에 보여줄 화면
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-bold text-gray-500 animate-pulse">
          권한을 확인하는 중입니다... 🔐
        </div>
      </div>
    );
  }

  // 관리자가 맞으면 원래 보려던 화면(children)을 보여줌
  return <>{children}</>;
}