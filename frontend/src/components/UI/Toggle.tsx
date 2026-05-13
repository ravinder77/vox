export default function Toggle({ checked, onClick }) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={checked}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
