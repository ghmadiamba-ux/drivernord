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
          w-full min-h-[56px] px-4 py-3
          text-base text-gray-900 bg-white
          border border-gray-200 rounded-xl
          focus:outline-none focus:border-blue-400
          disabled:opacity-40
          placeholder:text-gray-400
        "
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="
          w-full min-h-[56px] px-4 py-3
          text-base font-semibold text-white
          bg-blue-500 rounded-xl
          active:bg-blue-600
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors duration-100
        "
      >
        {submitLabel}
      </button>
      {skipLabel && onSkip && (
        <button
          onClick={onSkip}
          disabled={disabled}
          className="
            w-full min-h-[44px] px-4 py-2
            text-sm text-gray-400
            active:text-gray-600
            disabled:opacity-40
            transition-colors duration-100
          "
        >
          {skipLabel}
        </button>
      )}
    </div>
  );
}
