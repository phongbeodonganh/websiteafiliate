import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'headerOutline';
type ButtonSize = 'sm' | 'md' | 'headerNav' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border border-black bg-black text-white hover:bg-neutral-800',
  secondary: 'border border-neutral-300 bg-white text-black hover:border-black',
  ghost: 'border border-transparent bg-transparent text-current hover:bg-black/5',
  headerOutline: 'border border-white/80 bg-transparent text-white hover:border-white hover:bg-white/10',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-5 text-sm',
  headerNav: 'h-10 w-[88px] text-xs',
  icon: 'h-10 w-10',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 font-bold uppercase transition-[transform,background-color,border-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
    </button>
  );
}
