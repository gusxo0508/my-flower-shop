// app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import DaumPostcodeEmbed from 'react-daum-postcode';

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');       
  const [address, setAddress] = useState(''); 
  const [detailAddress, setDetailAddress] = useState(''); 
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error('이메일이나 비밀번호를 확인해주세요.');
      setLoading(false);
    } else {
      toast.success('환영합니다.');
      setTimeout(() => { window.location.href = '/'; }, 1000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*?_~]).{8,15}$/;
    if (!passwordRegex.test(password)) {
      toast.error('비밀번호는 8~15자리의 영문, 숫자, 특수문자 조합이어야 합니다.');
      return;
    }
    if (!name || !address) {
      toast.error('모든 항목을 입력해주세요.');
      return;
    }
    setLoading(true);
    const fullAddress = detailAddress ? `${address} ${detailAddress}` : address;
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { name: name, address: fullAddress } }
    });

    if (error) {
      if (error.message.includes('already registered')) toast.error('이미 가입된 이메일입니다.');
      else toast.error('회원가입 실패: ' + error.message);
    } else {
      toast.success('가입이 완료되었습니다. 로그인해주세요.');
      setIsLoginMode(true); 
    }
    setLoading(false);
  };

  const handleCompletePostcode = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';
    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }
    setAddress(fullAddress);
    setIsPostcodeOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 pt-24">
      
      <div className="w-full max-w-md bg-white p-10 md:p-14 shadow-2xl shadow-stone-200/50 border border-stone-100">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-serif text-stone-900 tracking-widest uppercase mb-3">
            {isLoginMode ? 'Login' : 'Create Account'}
          </h1>
          <div className="h-[1px] w-8 bg-amber-700 mx-auto"></div>
        </div>

        <form onSubmit={isLoginMode ? handleLogin : handleSignUp} className="space-y-8">
          <div>
            <label className="block text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-2">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border-b border-stone-300 bg-transparent py-2 text-stone-900 font-light focus:outline-none focus:border-stone-900 transition-colors" placeholder="flower@example.com" />
          </div>
          
          <div>
            <label className="block text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-2">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-b border-stone-300 bg-transparent py-2 text-stone-900 font-light focus:outline-none focus:border-stone-900 transition-colors" placeholder={isLoginMode ? "" : "8~15자리 영문, 숫자, 특수문자"} />
          </div>

          {!isLoginMode && (
            <div className="animate-fade-in space-y-8 pt-4">
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-2">Company / Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border-b border-stone-300 bg-transparent py-2 text-stone-900 font-light focus:outline-none focus:border-stone-900 transition-colors" placeholder="상호명 또는 성함" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] text-stone-400 uppercase mb-2">Address</label>
                <div className="flex gap-4 mb-4">
                  <input type="text" readOnly required value={address} placeholder="주소 검색" className="w-full border-b border-stone-300 bg-stone-50 py-2 px-3 text-stone-600 font-light focus:outline-none cursor-not-allowed text-sm" />
                  <button type="button" onClick={() => setIsPostcodeOpen(true)} className="border border-stone-800 text-stone-800 text-[10px] font-bold tracking-widest px-4 py-2 hover:bg-stone-800 hover:text-white transition-colors uppercase whitespace-nowrap">Search</button>
                </div>
                <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} placeholder="상세 주소" className="w-full border-b border-stone-300 bg-transparent py-2 text-stone-900 font-light focus:outline-none focus:border-stone-900 transition-colors" />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-stone-900 text-white text-xs tracking-[0.2em] font-light py-4 hover:bg-stone-800 transition-colors disabled:bg-stone-300 mt-10 uppercase">
            {loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button onClick={() => { setIsLoginMode(!isLoginMode); setEmail(''); setPassword(''); }} type="button" className="text-[10px] tracking-widest text-stone-500 hover:text-stone-900 uppercase transition-colors border-b border-transparent hover:border-stone-900 pb-1">
            {isLoginMode ? 'Create new account' : 'Back to login'}
          </button>
        </div>
      </div>

      {isPostcodeOpen && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-stone-200">
              <h3 className="font-serif text-stone-900 tracking-widest">ADDRESS SEARCH</h3>
              <button onClick={() => setIsPostcodeOpen(false)} className="text-stone-400 hover:text-stone-900 text-xl font-light">✕</button>
            </div>
            <DaumPostcodeEmbed onComplete={handleCompletePostcode} style={{ height: '400px' }} />
          </div>
        </div>
      )}
    </div>
  );
}