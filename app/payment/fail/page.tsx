// app/payment/fail/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function PaymentFailPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-10 px-6">
      <div className="text-center">
        <h3 className="text-xs tracking-[0.3em] text-red-500 mb-6 uppercase font-bold">Payment Cancelled</h3>
        <h1 className="text-4xl font-serif text-stone-900 tracking-wide mb-6">결제가 취소되었습니다</h1>
        <div className="h-[1px] w-12 bg-stone-300 mx-auto mb-8"></div>
        <p className="text-stone-500 font-light tracking-wider text-sm leading-loose">
          결제가 취소되었거나 오류가 발생했습니다.<br />
          장바구니로 돌아가 다시 시도해 주세요.
        </p>
      </div>
      <button
        onClick={() => router.push('/shop')}
        className="bg-stone-900 text-white px-8 py-3 text-xs tracking-widest uppercase hover:bg-stone-800 transition-all"
      >
        마켓으로 돌아가기
      </button>
    </div>
  );
}
