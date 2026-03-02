import { useEffect } from 'react';

const ICONS = {
  success: 'fa-check-circle',
  error:   'fa-exclamation-circle',
  info:    'fa-info-circle',
};

const BG = {
  success: 'bg-emerald-600',
  error:   'bg-red-600',
  info:    'bg-blue-600',
};

/**
 * Auto-dismissing toast notification.
 * @param {{ message: string, type: 'success'|'error'|'info', onDone: () => void }} props
 */
export default function Toast({ message, type = 'info', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <div
      className={`fixed z-[9999] left-1/2 -translate-x-1/2 bottom-8
        flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl
        text-white text-sm font-semibold border border-white/10
        animate-fade-in ${BG[type]}`}
    >
      <i className={`fas ${ICONS[type]}`} />
      <span>{message}</span>
    </div>
  );
}
