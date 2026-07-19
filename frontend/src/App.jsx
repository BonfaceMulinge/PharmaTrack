import { useEffect, useState, useCallback } from 'react'
import MedicineManagement from './components/MedicineManagement'
import SupplierManagement from './components/SupplierManagement'
import PurchaseManagement from './components/PurchaseManagement'
import SalesPos from './components/SalesPos'
import ReportingAnalytics from './components/ReportingAnalytics'
import NotificationsForecasting from './components/NotificationsForecasting'
import { API_URL } from './api'
import './App.css'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value ?? 0)

const timeAgo = (dateString) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const emptyDashboard = {
  todayRevenue: 0,
  monthlyRevenue: 0,
  totalMedicines: 0,
  totalUnitsInStock: 0,
  lowStock: 0,
  outOfStock: 0,
  todayTransactions: 0,
  topSellingMedicines: [],
  recentActivity: [],
}

const navItems = [
  { label: 'Home', id: 'home' },
  { label: 'Dashboard', id: 'dashboard' },
  { label: 'Medicines', id: 'medicines' },
  { label: 'Suppliers', id: 'suppliers' },
  { label: 'Purchases', id: 'purchases' },
  { label: 'Sales', id: 'sales' },
  { label: 'Reports', id: 'reports' },
  { label: 'Notifications', id: 'notifications' },
]

function App() {
  const [activeSection, setActiveSection] = useState('home')
  const [view, setView] = useState('home')
  const [dashboardData, setDashboardData] = useState(emptyDashboard)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  const refreshDashboard = useCallback(async () => {
    try {
      const [analyticsRes, notificationsRes] = await Promise.all([
        fetch(`${API_URL}/reports/analytics`),
        fetch(`${API_URL}/notifications`),
      ])

      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json()
        setDashboardData({
          todayRevenue: analytics.todayRevenue ?? 0,
          monthlyRevenue: analytics.monthlyRevenue ?? 0,
          totalMedicines: analytics.medicines ?? 0,
          totalUnitsInStock: analytics.totalUnitsInStock ?? 0,
          lowStock: analytics.lowStock ?? 0,
          outOfStock: analytics.outOfStock ?? 0,
          todayTransactions: analytics.todayTransactions ?? 0,
          topSellingMedicines: analytics.topSellingMedicines ?? [],
          recentActivity: analytics.recentActivity ?? [],
        })
      }

      if (notificationsRes.ok) {
        const data = await notificationsRes.json()
        setNotifications(data.filter((n) => n.type === 'LOW_STOCK').slice(0, 5))
      }
    } catch (error) {
      console.error('[Dashboard] Refresh failed:', error)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [analyticsRes, notificationsRes] = await Promise.all([
          fetch(`${API_URL}/reports/analytics`),
          fetch(`${API_URL}/notifications`),
        ])
        if (cancelled) return

        if (analyticsRes.ok) {
          const analytics = await analyticsRes.json()
          setDashboardData({
            todayRevenue: analytics.todayRevenue ?? 0,
            monthlyRevenue: analytics.monthlyRevenue ?? 0,
            totalMedicines: analytics.medicines ?? 0,
            totalUnitsInStock: analytics.totalUnitsInStock ?? 0,
            lowStock: analytics.lowStock ?? 0,
            outOfStock: analytics.outOfStock ?? 0,
            todayTransactions: analytics.todayTransactions ?? 0,
            topSellingMedicines: analytics.topSellingMedicines ?? [],
            recentActivity: analytics.recentActivity ?? [],
          })
        }

        if (notificationsRes.ok) {
          const data = await notificationsRes.json()
          setNotifications(data.filter((n) => n.type === 'LOW_STOCK').slice(0, 5))
        }
      } catch (error) {
        console.error('[Dashboard] Initial load failed:', error)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (view !== 'dashboard') return

    const sections = Array.from(document.querySelectorAll('.page-section'))
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visibleEntry) {
          setActiveSection(visibleEntry.target.id)
        }
      },
      { threshold: [0.3, 0.6], rootMargin: '-20% 0px -40% 0px' }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [view])

  const handleNavClick = (event, sectionId) => {
    event.preventDefault()
    setView('dashboard')
    setActiveSection(sectionId)
    setMenuOpen(false)

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const scrollToSection = (sectionId) => {
    setView('dashboard')
    setMenuOpen(false)
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const openPos = () => {
    setView('pos')
    setActiveSection('sales')
  }

  const handleSaleComplete = () => {
    refreshDashboard()
  }

  const stats = [
    { title: "Today's Sales", value: formatCurrency(dashboardData.todayRevenue) },
    { title: 'Monthly Revenue', value: formatCurrency(dashboardData.monthlyRevenue) },
    { title: 'Total Medicines', value: String(dashboardData.totalMedicines) },
    { title: 'Units in Stock', value: String(dashboardData.totalUnitsInStock) },
    { title: 'Low Stock Items', value: String(dashboardData.lowStock) },
    { title: 'Out of Stock', value: String(dashboardData.outOfStock) },
  ]

  if (view === 'pos') {
    return (
      <div className="dashboard-shell">
        <header className="top-nav">
          <div className="brand">
            <div className="brand-badge">PT</div>
            <div>
              <h2>PharmaTrack</h2>
              <p>Pharmacy Control</p>
            </div>
          </div>
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)}>
            ☰
          </button>
        </header>
        <SalesPos onSaleComplete={handleSaleComplete} onBackToDashboard={() => setView('dashboard')} />
      </div>
    )
  }

  return (
    <div className="dashboard-shell">
      <header className="top-nav">
        <div className="brand">
          <div className="brand-badge">PT</div>
          <div>
            <h2>PharmaTrack</h2>
            <p>Pharmacy Control</p>
          </div>
        </div>

        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)}>
          ☰
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <a
              key={item.id}
              className={activeSection === item.id ? 'active' : ''}
              href={`#${item.id}`}
              onClick={(event) => handleNavClick(event, item.id)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operations Overview</p>
            <h1>Admin Dashboard</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" type="button" onClick={() => window.print()}>
              Export
            </button>
            <button className="primary-btn" type="button" onClick={openPos}>
              + New Sale
            </button>
          </div>
        </header>

        <section id="home" className="page-section hero-section">
          <div className="hero-card">
            <div>
              <p className="eyebrow">Pharmacy Management System</p>
              <h2>Welcome to PharmaTrack</h2>
              <p>Streamline dispensing, stock control, supplier orders, and sales insights from one professional platform.</p>
              <div className="hero-actions">
                <button className="primary-btn" type="button" onClick={openPos}>New Sale</button>
                <button className="ghost-btn" type="button" onClick={() => scrollToSection('medicines')}>Add Medicine</button>
                <button className="ghost-btn" type="button" onClick={() => scrollToSection('reports')}>View Reports</button>
              </div>
            </div>
            <div className="hero-metrics">
              <div className="hero-metric-card">
                <strong>{formatCurrency(dashboardData.todayRevenue)}</strong>
                <span>Today's Sales</span>
              </div>
              <div className="hero-metric-card">
                <strong>{dashboardData.lowStock}</strong>
                <span>Low Stock</span>
              </div>
              <div className="hero-metric-card">
                <strong>{dashboardData.todayTransactions}</strong>
                <span>Today's Transactions</span>
              </div>
            </div>
          </div>
        </section>

        <section id="dashboard" className="page-section">
          <section className="stats-grid">
            {stats.map((item) => (
              <article key={item.title} className="stat-card">
                <p>{item.title}</p>
                <h3>{item.value}</h3>
              </article>
            ))}
          </section>

          <div className="content-grid">
            <article className="panel">
              <div className="panel-header">
                <h3>Top Selling Medicines</h3>
              </div>
              <ul className="activity-list">
                {dashboardData.topSellingMedicines.length > 0 ? (
                  dashboardData.topSellingMedicines.map((item) => (
                    <li key={item.name}>
                      <strong>{item.name}</strong>
                      <span>{item.qty} units sold</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>No sales recorded this month yet.</span>
                  </li>
                )}
              </ul>
            </article>
            <article className="panel">
              <div className="panel-header">
                <h3>Inventory Alerts</h3>
              </div>
              <ul className="activity-list">
                {notifications.length > 0 ? notifications.map((notification) => (
                  <li key={notification.id}>
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <small>{timeAgo(notification.createdAt)}</small>
                  </li>
                )) : (
                  <li>
                    <strong>No active stock alerts</strong>
                    <span>All inventory is above the configured thresholds.</span>
                  </li>
                )}
              </ul>
            </article>
          </div>
        </section>

        <section id="medicines" className="page-section">
          <MedicineManagement />
        </section>

        <section id="suppliers" className="page-section">
          <SupplierManagement />
        </section>

        <section id="purchases" className="page-section">
          <PurchaseManagement />
        </section>

        <section id="sales" className="page-section">
          <SalesPos onSaleComplete={handleSaleComplete} onBackToDashboard={() => setView('dashboard')} />
        </section>

        <section id="reports" className="page-section">
          <ReportingAnalytics />
        </section>

        <section id="notifications" className="page-section">
          <NotificationsForecasting />
        </section>
      </main>
    </div>
  )
}

export default App
