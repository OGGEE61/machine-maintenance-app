'use client';

interface FilterPillsProps<T extends string> {
  label: string;
  options: Array<{ id: T; label: string; count: number }>;
  value: T;
  onChange: (value: T) => void;
}

export default function FilterPills<T extends string>({ label, options, value, onChange }: FilterPillsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${value === option.id ? 'bg-[#282828] text-white' : 'bg-[#f3f2f2] text-[#6b6969] hover:bg-[#e8e8e8]'}`}
        >
          {option.label} <span className="opacity-70">{option.count}</span>
        </button>
      ))}
    </div>
  );
}
