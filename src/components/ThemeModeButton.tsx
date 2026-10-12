interface ThemeModeButtonProps {
  isDark: boolean;
  onToggle: () => void;
}

export default function ThemeModeButton({ isDark, onToggle }: ThemeModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="theme-mode-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
