interface LotusOrnamentProps {
  align?: 'center' | 'left';
  className?: string;
}

export function LotusOrnament({ align = 'center', className = '' }: LotusOrnamentProps) {
  return (
    <div className={`orn ${align} ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 34 20">
        <g fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M17 1.5C14 5 14 10 17 15C20 10 20 5 17 1.5Z" />
          <path d="M17 15C12.5 14 9.5 10.5 9 6.5C13 7.5 16 10.5 17 15Z" />
          <path d="M17 15C21.5 14 24.5 10.5 25 6.5C21 7.5 18 10.5 17 15Z" />
          <path d="M17 15C11 16 5 14.5 1.5 11M17 15C23 16 29 14.5 32.5 11" />
          <path d="M8 18.5H26" />
        </g>
      </svg>
    </div>
  );
}
