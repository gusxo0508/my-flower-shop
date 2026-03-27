// app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import DaumPostcodeEmbed from 'react-daum-postcode'; // ✨ 우편번호 API

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');       
  const [address, setAddress] = useState(''); 
  const [detailAddress, setDetailAddress] = useState(''); // 상세주소 
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false); // 주소창 모달

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error('로그인 실패: 이메일이나 비밀번호를 확인해주세요 🔒');
      setLoading(false);
    } else {
      toast.success('환영합니다!');
      setTimeout(() => { window.location.href = '/'; }, 1000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✨ 비밀번호 복잡성 검사 (8~15자리 영문, 숫자, 특수문자 조합)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*?_~]).{8,15}$/;
    if (!passwordRegex.test(password)) {
      toast.error('비밀번호는 8~15자리의 영문, 숫자, 특수문자 조합이어야 합니다.');
      return;
    }

    if (!name || !address) {
      toast.error('이름(상호명)과 주소를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    const fullAddress = detailAddress ? `${address} ${detailAddress}` : address;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name, address: fullAddress } }
    });

    if (error) {
      // Supabase 기본 이메일 중복 에러 처리
      if (error.message.includes('already registered')) {
        toast.error('이미 가입된 이메일입니다. 다른 이메일을 사용해주세요.');
      } else {
        toast.error('회원가입 실패: ' + error.message);
      }
    } else {
      toast.success('🎉 가입이 완료되었습니다! 로그인해주세요.');
      setIsLoginMode(true); 
    }
    setLoading(false);
  };

  // ✨ 우편번호 검색 완료 후 처리 함수
  const handleCompletePostcode = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';
    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }
    setAddress(fullAddress);
    setIsPostcodeOpen(false); // 모달 닫기
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-green-100 relative">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-green-800">
            {isLoginMode ? '플로리스트 로그인' : '도매 회원가입'}
          </h1>
          <p className="text-gray-500 mt-2">
            {isLoginMode ? '신선한 꽃을 만나보세요.' : '아빠의 꽃, 회원 전용 도매가로 모십니다.'}
          </p>
        </div>

        <form onSubmit={isLoginMode ? handleLogin : handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">이메일 (아이디)</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-400" placeholder="flower@example.com" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-400" placeholder={isLoginMode ? "비밀번호 입력" : "8~15자리 (영문+숫자+특수문자 조합)"} />
          </div>

          {!isLoginMode && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">성함 또는 상호명 (개인식별)</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-400" placeholder="예) 예쁜꽃방 홍길동" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">배송지 주소</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" readOnly required value={address} placeholder="주소 검색 버튼을 눌러주세요" className="w-full border border-gray-300 bg-gray-50 cursor-not-allowed rounded-lg p-3 focus:outline-none" />
                  <button type="button" onClick={() => setIsPostcodeOpen(true)} className="bg-gray-800 text-white font-bold px-4 rounded-lg whitespace-nowrap hover:bg-black">주소 검색</button>
                </div>
                <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} placeholder="나머지 상세 주소 입력 (동, 호수)" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-400" />
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 mt-6">
            {loading ? '처리 중...' : (isLoginMode ? '로그인하기' : '가입 완료하기')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-600">
            {isLoginMode ? "아직 회원이 아니신가요?" : "이미 계정이 있으신가요?"}
            <button onClick={() => { setIsLoginMode(!isLoginMode); setEmail(''); setPassword(''); }} type="button" className="ml-2 text-green-700 font-bold hover:underline focus:outline-none">
              {isLoginMode ? '회원가입하기' : '로그인하러 가기'}
            </button>
          </p>
        </div>
      </div>

      {/* ✨ 주소 검색 모달 */}
      {isPostcodeOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-2 w-full max-w-md relative shadow-2xl">
            <div className="flex justify-between items-center bg-gray-100 p-3 rounded-t-lg mb-2">
              <h3 className="font-bold text-gray-700">우편번호 검색</h3>
              <button onClick={() => setIsPostcodeOpen(false)} className="text-gray-500 hover:text-red-500 font-extrabold text-xl px-2">X</button>
            </div>
            <DaumPostcodeEmbed onComplete={handleCompletePostcode} style={{ height: '400px' }} />
          </div>
        </div>
      )}
    </div>
  );
}