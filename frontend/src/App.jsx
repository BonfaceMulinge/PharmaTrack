import { useEffect, useState } from 'react'
import MedicineManagement from './components/MedicineManagement'
import SupplierManagement from './components/SupplierManagement'
import PurchaseManagement from './components/PurchaseManagement'
import SalesPos from './components/SalesPos'
import ReportingAnalytics from './components/ReportingAnalytics'
import NotificationsForecasting from './components/NotificationsForecasting'
import './App.css'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value ?? 0)

const initialDashboardData = {
  todaySales: 24580,
  monthlyRevenue: 412800,
  lowStockItems: 18,
  expiredMedicines: 7,
  totalTransactions: 128,
  topSellingMedicines: [
    { name: 'Paracetamol', qty: 24 },
    { name: 'Amoxicillin', qty: 15 },
  ],
}

const recentActivity = [
  { title: 'New purchase received', detail: 'Supplier: HealthPlus Ltd', time: '10 mins ago' },
  { title: 'Sale completed', detail: 'Receipt #1042 • 5 items', time: '22 mins ago' },
  { title: 'Inventory adjustment', detail: 'Paracetamol batch updated', time: '1 hour ago' },
]

const navItems = [
  { label: 'Home', id: 'home' },
  { label: 'Dashboard', id: 'dashboard' },
  { label: 'Medicines', id: 'medicines' },
  { label: 'Suppliers', id: 'suppliers' },
  { label: 'Purchases', id: 'purchases' },
  { label: 'Sales', id: 'sales' },
  { label: 'Reports', id: 'reports' },
  { label: 'Users', id: 'users' },
]

function App() {
  const [activeSection, setActiveSection] = useState('home')
  const [view, setView] = useState('home')
  const [dashboardData, setDashboardData] = useState(initialDashboardData)
  const [menuOpen, setMenuOpen] = useState(false)

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

  const refreshDashboardMetrics = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reports/analytics')
      if (!response.ok) throw new Error('Failed to refresh metrics')
      const analytics = await response.json()

      setDashboardData((current) => ({
        ...current,
        todaySales: analytics.revenue ?? current.todaySales,
        monthlyRevenue: analytics.revenue ?? current.monthlyRevenue,
        lowStockItems: analytics.lowStock ?? current.lowStockItems,
        expiredMedicines: analytics.expired ?? current.expiredMedicines,
      }))
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    refreshDashboardMetrics()
  }, [])

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

  const handleSaleComplete = ({ totalAmount, items }) => {
    setDashboardData((current) => {
      const nextTopSelling = [...current.topSellingMedicines]
      items.forEach((item) => {
        const existing = nextTopSelling.find((entry) => entry.name === item.name)
        if (existing) {
          existing.qty += item.quantity
        } else {
          nextTopSelling.push({ name: item.name, qty: item.quantity })
        }
      })

      return {
        ...current,
        todaySales: current.todaySales + totalAmount,
        monthlyRevenue: current.monthlyRevenue + totalAmount,
        totalTransactions: current.totalTransactions + 1,
        topSellingMedicines: nextTopSelling.sort((a, b) => b.qty - a.qty).slice(0, 3),
      }
    })

    refreshDashboardMetrics()
  }

  const stats = [
    { title: "Today's Sales", value: formatCurrency(dashboardData.todaySales), change: '+12.4%' },
    { title: 'Monthly Revenue', value: formatCurrency(dashboardData.monthlyRevenue), change: '+8.1%' },
    { title: 'Low Stock Items', value: dashboardData.lowStockItems.toString(), change: 'Needs review' },
    { title: 'Expired Medicines', value: dashboardData.expiredMedicines.toString(), change: 'Action required' },
    { title: 'Total Transactions', value: dashboardData.totalTransactions.toString(), change: 'Live count' },
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
                <strong>{formatCurrency(dashboardData.todaySales)}</strong>
                <span>Today’s Sales</span>
              </div>
              <div className="hero-metric-card">
                <strong>{dashboardData.lowStockItems}</strong>
                <span>Low Stock</span>
              </div>
              <div className="hero-metric-card">
                <strong>{dashboardData.expiredMedicines}</strong>
                <span>Expiring Soon</span>
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
                <span>{item.change}</span>
              </article>
            ))}
          </section>

          <div className="content-grid">
            <article className="panel">
              <div className="panel-header">
                <h3>Top Selling Medicines</h3>
              </div>
              <ul className="activity-list">
                {dashboardData.topSellingMedicines.map((item) => (
                  <li key={item.name}>
                    <strong>{item.name}</strong>
                    <span>{item.qty} units sold</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <div className="panel-header">
                <h3>Quick Actions</h3>
              </div>
              <button className="primary-btn" type="button" onClick={openPos} style={{ width: '100%' }}>
                Open POS
              </button>
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
          <NotificationsForecasting />
        </section>

        <section id="users" className="page-section">
          <div className="medicine-page">
            <div className="page-header">
              <div>
                <p className="eyebrow">Access Control</p>
                <h2>User Management</h2>
              </div>
            </div>

            <div className="panel">
              <h3>Active Users</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Admin User</td>
                    <td>Administrator</td>
                    <td>Active</td>
                  </tr>
                  <tr>
                    <td>Grace Wanjiku</td>
                    <td>Pharmacist</td>
                    <td>Active</td>
                  </tr>
                  <tr>
                    <td>Daniel Otieno</td>
                    <td>Store Manager</td>
                    <td>Active</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="content-grid page-section" id="performance">
          <article className="panel large-panel">
            <div className="panel-header">
              <h3>Sales Performance</h3>
              <button className="ghost-btn" type="button" onClick={() => scrollToSection('reports')}>
                View Report
              </button>
            </div>
            <div className="chart-placeholder">
              <div className="bar one" />
              <div className="bar two" />
              <div className="bar three" />
              <div className="bar four" />
              <div className="bar five" />
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>Recent Activity</h3>
            </div>
            <ul className="activity-list">
              {recentActivity.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                  <small>{item.time}</small>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
