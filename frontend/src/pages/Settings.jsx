import { useState, lazy, Suspense, memo } from 'react';
import { PageLoader } from '../components/Layout';

const BrandingSettings = lazy(() => import('../components/BrandingSettings'));
const ProfileSettings = lazy(() => import('../components/ProfileSettings'));

const tabs = [
  { key: 'branding', label: 'Branding', roles: ['ADMIN', 'PHARMACIST'] },
  { key: 'profile', label: 'My Profile', roles: ['ADMIN', 'PHARMACIST', 'CASHIER'] },
];

function Settings({ user, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState('branding');

  const visibleTabs = tabs.filter((t) => t.roles.includes(user?.role));

  return (
    <div className="settings-page">
      <div className="topbar">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="settings-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`settings-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-content">
        <Suspense fallback={<PageLoader />}>
          {activeTab === 'branding' && <BrandingSettings user={user} onUserUpdate={onUserUpdate} />}
          {activeTab === 'profile' && <ProfileSettings user={user} onUserUpdate={onUserUpdate} />}
        </Suspense>
      </div>
    </div>
  );
}

export default memo(Settings);
