import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  isLoading?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({ length = 6, onComplete, isLoading = false }) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    const otpValue = newOtp.join('');
    if (otpValue.length === length) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain').slice(0, length);
    if (!/^\d+$/.test(pasteData)) return;

    const newOtp = [...otp];
    pasteData.split('').forEach((char, index) => {
      newOtp[index] = char;
      if (inputRefs.current[index]) {
        inputRefs.current[index]!.value = char;
      }
    });

    setOtp(newOtp);
    if (pasteData.length === length) {
      onComplete(pasteData);
    }
    
    const focusIndex = Math.min(pasteData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-4 my-6">
      {otp.map((data, index) => (
        <input
          key={index}
          type="text"
          maxLength={1}
          ref={(ref) => { inputRefs.current[index] = ref; }}
          value={data}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={isLoading}
          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold text-slate-800 bg-white border-2 border-slate-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ))}
    </div>
  );
};
