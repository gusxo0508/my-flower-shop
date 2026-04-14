// app/payment/success/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [buyerName, setBuyerName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const pgToken = searchParams.get('pg_token');
    const tid = sessionStorage.getItem('kakao_tid');

    if (!pgToken || !tid) {
      setErrorMessage('결제 정보가 유효하지 않습니다.');
      setStatus('error');
      return;
    }

    const approve = async () => {
      try {
        const res = await fetch('/api/payment/kakao/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tid, pg_token: pgToken }),
        });
        const json = await res.json();

        if (json.success) {
          sessionStorage.removeItem('kakao_tid');
          setBuyerName(json.buyerName);
          setStatus('success');
        } else {
          setErrorMessage(json.message || '결제 승인에 실패했습니다.');
          setStatus('error');
        }
      } catch {
        setErrorMessage('오류가 발생했습니다. 고객센터로 문의해 주세요.');
        setStatus('error');
      }
    };

    approve();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <p className="text-stone-400 text-xs tracking-widest animate-pulse">PROCESSING PAYMENT...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-8 px-6">
        <div className="text-center">
          <h3 className="text-xs tracking-[0.3em] text-red-500 mb-4 uppercase font-bold">Error</h3>
          <p className="text-stone-700 font-light text-sm tracking-wider">{errorMessage}</p>
        </div>
        <button
          onClick={() => router.push('/shop')}
          className="border border-stone-900 text-stone-900 px-8 py-3 text-xs tracking-widest uppercase hover:bg-stone-900 hover:text-white transition-all"
        >
          마켓으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-10 px-6">
      <div className="text-center">
        <h3 className="text-xs tracking-[0.3em] text-amber-700 mb-6 uppercase font-bold">Payment Complete</h3>
        <h1 className="text-4xl font-serif text-stone-900 tracking-wide mb-6">결제가 완료되었습니다</h1>
        <div className="h-[1px] w-12 bg-stone-300 mx-auto mb-8"></div>
        <p className="text-stone-500 font-light tracking-wider text-sm leading-loose">
          {buyerName}님의 주문이 성공적으로 접수되었습니다.<br />
          배송이 시작되면 별도로 안내드리겠습니다.
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => router.push('/mypage')}
          className="bg-stone-900 text-white px-8 py-3 text-xs tracking-widest uppercase hover:bg-stone-800 transition-all"
        >
          주문 내역 확인
        </button>
        <button
          onClick={() => router.push('/shop')}
          className="border border-stone-300 text-stone-600 px-8 py-3 text-xs tracking-widest uppercase hover:bg-stone-100 transition-all"
        >
          계속 쇼핑
        </button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
          <p className="text-stone-400 text-xs tracking-widest animate-pulse">LOADING...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
