import { LanguageSwitcher } from './LanguageSwitcher';

export function Footer() {
  return (
    <footer
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 50,
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: 48,
        }}
      >
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
