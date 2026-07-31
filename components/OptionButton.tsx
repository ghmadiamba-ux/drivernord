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
        w-full min-h-[52px] px-4 py-3 mb-2.5
        flex items-center justify-between
        text-left text-[15px] font-medium text-gray-900
        bg-white border border-gray-150 rounded-xl
        hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900
        active:bg-blue-100 active:border-blue-400 active:scale-[0.99]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1
        disabled:opacity-30 disabled:cursor-not-allowed
        transition-all duration-150
      "
    >
      <span>{label}</span>
      <svg
        className="w-4 h-4 text-gray-300 flex-shrink-0 ml-3 transition-colors group-hover:text-blue-400"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
