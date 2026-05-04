'use client';

interface OptionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function OptionButton({ label, onClick, disabled }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        w-full min-h-[56px] px-4 py-3 mb-3
        text-left text-base font-medium text-gray-800
        bg-white border border-gray-200 rounded-xl
        active:bg-blue-50 active:border-blue-400
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-colors duration-100
      "
    >
      {label}
    </button>
  );
}
