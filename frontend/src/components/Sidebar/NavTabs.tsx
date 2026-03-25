const tabs = [
  { id: 'all', label: 'All' },
  { id: 'direct', label: 'DMs' },
  { id: 'group', label: 'Groups', hasBadge: true },
];

export default function NavTabs({ activeTab, onTabChange }) {
  return (
    <div className="nav-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.hasBadge ? <span className="badge" /> : null}
        </button>
      ))}
    </div>
  );
}
