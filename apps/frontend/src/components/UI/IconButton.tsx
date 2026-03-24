import type { MouseEventHandler, ReactNode } from 'react';

type IconButtonProps = {
  title: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
};

export default function IconButton({
  title,
  onClick,
  children,
  className = '',
  type = 'button',
}: IconButtonProps) {
  return (
    <button type={type} className={`icon-btn ${className}`.trim()} title={title} onClick={onClick}>
      {children}
    </button>
  );
}
