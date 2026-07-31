'use client';

import { useState } from 'react';

interface TextInputStepProps {
  inputMode: 'text' | 'tel' | 'email';
  placeholder: string;
  submitLabel: string;
  skipLabel?: string;
  onSubmit: (value: string) => void;
  onSkip?: () => void;
  disabled?: boolean;
}

export function TextInputStep({
  inputMode,
  placeholder,
  submitLabel,
  skipLabel,
  onSubmit,
  onSkip,
  disabled,
}: TextInputStepProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        type={inputMode === 'tel' ? 'tel' : inputMode === 'email' ? 'email' : 'text'}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        disabled={disabled}
        autoFocus
        autoComplete={inputMode === 'tel' ? 'tel' : inputMode === 'email' ? 'email' : 'given-name'}
        className="
          w-full min-h-[54px] px-4 py-3
          text-base text-gray-900 bg-white
          border border-gray-200 rounded-xl
          focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100
          disabled:opacity-40
          placeholder:text-gray-350
          transition-shadow duration-150
        "
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="
          w-full min-h-[54px] px-4 py-3
          text-base font-semibold text-white
          bg-blue-600 rounded-xl
          hover:bg-blue-700
          active:bg-blue-800 active:scale-[0.99]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1
          disabled:opacity-35 disabled:cursor-not-allowed
          transition-all duration-150
        "
      >
        {submitLabel}
      </button>
      {skipLabel && onSkip && (
        <button
          onClick={onSkip}
          disabled={disabled}
          className="
            w-full min-h-[40px] px-4 py-2
            text-sm text-gray-400
            hover:text-gray-600
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1
            disabled:opacity-40
            transition-colors duration-150
          "
        >
          {skipLabel}
        </button>
      )}
    </div>
  );
}
