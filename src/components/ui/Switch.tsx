"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-[22px] shrink-0 border"
      style={{
        borderColor: "var(--color-divider)",
        background: checked ? "var(--color-accent)" : "var(--color-neutral-200)",
      }}
    >
      <span
        className="absolute top-[1px] w-[18px] h-[18px] transition-[left] duration-150"
        style={{
          left: checked ? "23px" : "1px",
          background: checked ? "var(--color-base-100)" : "var(--color-neutral-600)",
        }}
      />
    </button>
  );
}
