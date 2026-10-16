import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, MapPin, Receipt, Package,
  ClipboardList, AlertTriangle, FileBarChart, Users, Settings,
  Building2, Menu, Bell, LogOut, Search, CheckCircle2, Info
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../services/auth.service';
import { roleLabel } from '../utils';
import { showToast, useExpenses, useMaterials, useDailyReports, useIssues } from '../hooks';
import { OfflineBanner } from './shared';

interface NavItem {
  to: string;
  label: string;
  icon: any;
  end?: boolean;
}

const MAIN_MENU_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/sites', label: 'Sites', icon: MapPin },
  { to: '/expenses', label: 'Expenses & Billing', icon: Receipt },
  { to: '/materials', label: 'Materials', icon: Package },
  { to: '/daily-reports', label: 'Daily Reports', icon: ClipboardList },
  { to: '/issues', label: 'Issues & Delays', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
];

const SETTINGS_ITEMS: NavItem[] = [
  { to: '/team', label: 'Team & Access', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: 'alert' | 'success' | 'info';
  link: string;
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('nirmaniq-read-notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Connect to actual database records
  const { expenses } = useExpenses();
  const { materialOrders } = useMaterials();
  const { reports } = useDailyReports();
  const { issues } = useIssues();

  // Helper function to format relative timestamps
  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Derive notifications dynamically from real database entities
  const notifications: NotificationItem[] = [
    // Live Critical & High Priority Issues from DB
    ...(issues || []).slice(0, 3).map(iss => ({
      id: `issue_${iss.id}`,
      title: `${(iss.priority || 'Site').toUpperCase()} Issue: ${iss.title || 'Reported'}`,
      desc: iss.description || `Issue reported on site with status ${iss.status || 'open'}.`,
      time: getRelativeTime(iss.created_at),
      unread: !readIds.has(`issue_${iss.id}`),
      type: 'alert' as const,
      link: '/issues'
    })),

    // Live Material Deliveries & Orders from DB
    ...(materialOrders || []).slice(0, 3).map(mo => ({
      id: `mat_${mo.id}`,
      title: (mo.quantity_received || 0) > 0 ? `Material Delivery: ${mo.material_name || 'Material'}` : `Indent Placed: ${mo.material_name || 'Material'}`,
      desc: `${(mo.quantity_received || 0) > 0 ? `${mo.quantity_received} ${mo.unit || ''} received` : `${mo.quantity_ordered || 0} ${mo.unit || ''} ordered`} from ${mo.supplier || 'Vendor'}.`,
      time: getRelativeTime(mo.updated_at || mo.created_at),
      unread: !readIds.has(`mat_${mo.id}`),
      type: (mo.status === 'received' ? 'success' : 'info') as 'alert' | 'success' | 'info',
      link: '/materials'
    })),

    // Live Daily Pour / Field Reports from DB
    ...(reports || []).slice(0, 2).map(rep => ({
      id: `rep_${rep.id}`,
      title: `Daily Site Log: ${rep.work_completed ? rep.work_completed.slice(0, 30) : 'Work Recorded'}...`,
      desc: `${rep.worker_count || 0} active workers reported on site.`,
      time: getRelativeTime(rep.created_at),
      unread: !readIds.has(`rep_${rep.id}`),
      type: 'info' as const,
      link: '/daily-reports'
    })),

    // Live High-value or Pending Expenses from DB
    ...(expenses || []).filter(e => e && (e.status === 'pending_approval' || (e.amount || 0) > 50000)).slice(0, 2).map(exp => ({
      id: `exp_${exp.id}`,
      title: exp.status === 'pending_approval' ? `Approval Required: ${exp.title || 'Expense'}` : `Bill Logged: ${exp.title || 'Expense'}`,
      desc: `₹${Number(exp.amount || 0).toLocaleString('en-IN')} for ${exp.category || 'General'}.`,
      time: getRelativeTime(exp.created_at),
      unread: !readIds.has(`exp_${exp.id}`),
      type: (exp.status === 'pending_approval' ? 'alert' : 'success') as 'alert' | 'success' | 'info',
      link: '/expenses'
    }))
  ].slice(0, 8); // Top 8 live database alerts

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllNotificationsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem('nirmaniq-read-notifications', JSON.stringify([...allIds]));
    } catch {
      // ignore
    }
  };

  const markOneRead = (id: string) => {
    setReadIds(prev => {
      const updated = new Set(prev).add(id);
      try {
        localStorage.setItem('nirmaniq-read-notifications', JSON.stringify([...updated]));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleSignOut = async () => {
    try {
      setUserMenuOpen(false);
      localStorage.removeItem('nirmaniq-demo-session');
      window.dispatchEvent(new Event('nirmaniq-auth-changed'));
      await signOut();
      showToast('Signed out successfully', 'info');
      navigate('/');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error signing out', 'error');
    }
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || user?.phone || 'admin';
  const displayEmail = user?.email || user?.phone || 'admin@nirmaniq.com';
  const role = profile?.role || 'owner';
  const initials = displayName.slice(0, 2).toUpperCase();

  // Filtered nav items based on live search
  const filteredMainMenu = MAIN_MENU_ITEMS.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSettingsMenu = SETTINGS_ITEMS.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#151515',
      color: '#a1a1aa',
      padding: sidebarCollapsed ? '24px 10px' : '24px 18px',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      boxSizing: 'border-box',
      transition: 'padding 0.25s ease'
    }}>
      {/* ── Brand Header (Yellow Icon + NirmaniQ + Functional Sidebar Toggle Button) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarCollapsed ? 'center' : 'space-between',
        marginBottom: 20,
        padding: '0 4px',
        position: 'relative'
      }}>
        <div
          onClick={() => {
            if (sidebarCollapsed) setSidebarCollapsed(false);
            navigate('/');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          title={sidebarCollapsed ? "Expand sidebar" : "NirmaniQ Overview"}
        >
          {/* Yellow Hex/Circle Logo Badge */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#ffdd00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(255, 221, 0, 0.35)',
            flexShrink: 0,
            color: '#111111'
          }}>
            <Building2 size={20} strokeWidth={2.6} />
          </div>

          {!sidebarCollapsed && (
            <div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: '1.25rem',
                color: '#ffffff',
                letterSpacing: '-0.03em',
                lineHeight: 1
              }}>
                NirmaniQ
              </div>
              <div style={{
                fontSize: '0.65rem',
                color: '#ffdd00',
                fontWeight: 800,
                letterSpacing: '0.08em',
                marginTop: 2
              }}>
                CONSTRUCTION CLOUD
              </div>
            </div>
          )}
        </div>

        {/* Functional Collapse / Expand Sidebar Button */}
        <button
          onClick={() => {
            // If on mobile drawer, close drawer; if on desktop, toggle collapsed state
            if (window.innerWidth <= 900) {
              setSidebarOpen(false);
            } else {
              setSidebarCollapsed(p => !p);
            }
          }}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: sidebarCollapsed ? '#202020' : 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.2s ease',
            marginLeft: sidebarCollapsed ? 0 : 6
          }}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div style={{
            width: 15,
            height: 11,
            border: '1.5px solid #a1a1aa',
            borderRadius: 2,
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: sidebarCollapsed ? 'auto' : 3,
              right: sidebarCollapsed ? 3 : 'auto',
              width: 1.5,
              background: '#ffdd00'
            }} />
          </div>
        </button>
      </div>

      {/* ── Active Functional Search Pill with Cmd+K ── */}
      {!sidebarCollapsed ? (
        <div style={{
          position: 'relative',
          marginBottom: 20
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#202020',
            border: searchQuery ? '1px solid #ffdd00' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 24,
            padding: '8px 14px',
            gap: 8,
            transition: 'border-color 0.2s ease'
          }}>
            <Search size={15} color={searchQuery ? '#ffdd00' : '#71717a'} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search here..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#ffffff',
                fontSize: '0.825rem',
                width: '100%',
                fontFamily: 'inherit'
              }}
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.8rem',
                  display: 'flex'
                }}
              >
                ✕
              </button>
            ) : (
              <span style={{
                fontSize: '0.675rem',
                color: '#71717a',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.08)',
                padding: '2px 6px',
                borderRadius: 6,
                whiteSpace: 'nowrap'
              }}>
                ⌘K
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Collapsed Search Icon Trigger */
        <button
          onClick={() => {
            setSidebarCollapsed(false);
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#202020',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            margin: '0 auto 18px',
            padding: 0
          }}
          title="Search modules (⌘K)"
        >
          <Search size={16} />
        </button>
      )}

      {/* ── Navigation Lists (Filtered dynamically by search) ── */}
      <div
        className="no-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        {/* MAIN MENU */}
        <div>
          {!sidebarCollapsed && (
            <div style={{
              fontSize: '0.675rem',
              fontWeight: 800,
              color: '#52525b',
              letterSpacing: '0.08em',
              padding: '0 8px 8px',
              textTransform: 'uppercase'
            }}>
              MAIN MENU {filteredMainMenu.length !== MAIN_MENU_ITEMS.length && `(${filteredMainMenu.length})`}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {filteredMainMenu.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `axiom-nav-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  padding: sidebarCollapsed ? '10px 0' : '10px 16px'
                }}
              >
                <item.icon size={18} className="axiom-icon" strokeWidth={2.2} />
                {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              </NavLink>
            ))}
            {filteredMainMenu.length === 0 && !sidebarCollapsed && (
              <div style={{ fontSize: '0.78rem', color: '#71717a', padding: '8px 12px' }}>
                No modules match "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* SETTINGS */}
        <div>
          {!sidebarCollapsed && (
            <div style={{
              fontSize: '0.675rem',
              fontWeight: 800,
              color: '#52525b',
              letterSpacing: '0.08em',
              padding: '0 8px 8px',
              textTransform: 'uppercase'
            }}>
              SETTINGS
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {filteredSettingsMenu.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `axiom-nav-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  padding: sidebarCollapsed ? '10px 0' : '10px 16px'
                }}
              >
                <item.icon size={18} className="axiom-icon" strokeWidth={2.2} />
                {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="axiom-layout-root"
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#111111',
        padding: '12px',
        boxSizing: 'border-box',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}
    >
      {/* ── Left Sidebar (Desktop with Smooth Collapse/Expand) ── */}
      <aside style={{
        width: sidebarCollapsed ? 70 : 250,
        flexShrink: 0,
        background: '#151515',
        borderRadius: '28px 0 0 28px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        zIndex: 30,
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }} className="hidden-mobile">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 280,
            maxWidth: '85vw',
            background: '#151515',
            zIndex: 1,
            boxShadow: '16px 0 40px rgba(0,0,0,0.6)'
          }}>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Main Canvas ── */}
      <div
        className="axiom-main-canvas"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '28px',
          overflow: 'hidden',
          minWidth: 0,
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)'
        }}
      >
        <OfflineBanner />

        {/* ── Canvas Top Header ── */}
        <header
          className="axiom-top-header"
          style={{
            padding: '24px 36px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 16
          }}
        >
          {/* Welcome Text + Mobile Menu Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {/* Mobile Hamburger button */}
            <button
              className="show-mobile"
              style={{
                display: 'none',
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#f4f4f5',
                border: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
              id="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} color="#111111" />
            </button>

            <div style={{ minWidth: 0 }}>
              <h1
                className="axiom-welcome-title"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: '#111111',
                  margin: 0,
                  letterSpacing: '-0.03em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Welcome back, {displayName}!
              </h1>
              <p
                className="axiom-welcome-sub"
                style={{
                  margin: '4px 0 0',
                  fontSize: '0.85rem',
                  color: '#71717a',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Real-time construction operations & financial tracking · Anantapur
              </p>
            </div>
          </div>

          {/* Right Header Controls (Interactive Notification Bell Circle + Profile Avatar) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'relative' }}>
            {/* Notification Bell Circle with Active Modal / Panel */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setNotificationsOpen(p => !p);
                  setUserMenuOpen(false);
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: notificationsOpen ? '#111111' : '#f4f4f5',
                  color: notificationsOpen ? '#ffffff' : '#111111',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} strokeWidth={2.2} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 8,
                    right: 9,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '1.5px solid #ffffff'
                  }} />
                )}
              </button>

              {/* Functional Notification Dropdown Panel */}
              {notificationsOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 10,
                  width: 320,
                  maxWidth: '85vw',
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'slideUp 0.18s ease'
                }}>
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #f4f4f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111111' }}>
                      Notifications
                      {unreadCount > 0 && (
                        <span style={{
                          marginLeft: 8,
                          padding: '2px 7px',
                          borderRadius: 999,
                          background: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '0.68rem',
                          fontWeight: 800
                        }}>
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f59e0b',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '30px 20px', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
                        <CheckCircle2 size={24} color="#16a34a" style={{ margin: '0 auto 8px', display: 'block' }} />
                        No unread site alerts. Everything is on schedule!
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markOneRead(n.id);
                            setNotificationsOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #fafafa',
                            background: n.unread ? '#fffbeb' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <div style={{ marginTop: 2, flexShrink: 0 }}>
                            {n.type === 'alert' && <AlertTriangle size={16} color="#dc2626" />}
                            {n.type === 'success' && <CheckCircle2 size={16} color="#16a34a" />}
                            {n.type === 'info' && <Info size={16} color="#0284c7" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#111111' }}>
                                {n.title}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                                {n.time}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: 2, lineHeight: 1.3 }}>
                              {n.desc}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid #f4f4f5',
                    textAlign: 'center',
                    background: '#f8fafc'
                  }}>
                    <button
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate('/daily-reports');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#111111',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      View all site activity →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar + Actual User Info */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => {
                  setUserMenuOpen(p => !p);
                  setNotificationsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #111111 0%, #27272a 100%)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  border: '2px solid #ffdd00'
                }}>
                  <span style={{ color: '#ffdd00', fontWeight: 800, fontSize: '0.85rem' }}>
                    {initials}
                  </span>
                </div>

                <div style={{ textAlign: 'left' }} className="hidden-mobile">
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#111111',
                    lineHeight: 1.2
                  }}>
                    {displayName}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#71717a',
                    lineHeight: 1.2
                  }}>
                    {displayEmail}
                  </div>
                </div>
              </div>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 10,
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #f4f4f5',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.14)',
                  zIndex: 100,
                  minWidth: 220,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #f4f4f5' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#111111' }}>{displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#71717a' }}>{displayEmail}</div>
                    <span style={{
                      marginTop: 6,
                      display: 'inline-block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: '#ffdd00',
                      color: '#111111'
                    }}>
                      {roleLabel(role)}
                    </span>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        color: '#ef4444',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        borderRadius: 10,
                        width: '100%',
                        cursor: 'pointer',
                        padding: '10px 12px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left'
                      }}
                      onClick={handleSignOut}
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Viewport ── */}
        <main
          className="axiom-page-main"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 36px 36px',
            background: '#ffffff'
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* ── Exact Axiom theme sidebar link ── */
        .axiom-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: 24px;
          font-size: 0.86rem;
          font-weight: 500;
          color: #a1a1aa;
          text-decoration: none;
          transition: all 0.18s ease;
        }
        .axiom-nav-item:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }
        .axiom-nav-item.active {
          background: #ffdd00 !important;
          color: #111111 !important;
          font-weight: 800 !important;
          box-shadow: 0 4px 14px rgba(255, 221, 0, 0.35);
        }
        .axiom-nav-item.active .axiom-icon {
          color: #111111 !important;
        }
        .axiom-icon {
          color: #a1a1aa;
        }

        @media (max-width: 900px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          #mobile-menu-btn { display: flex !important; }

          .axiom-layout-root {
            padding: 0 !important;
            height: 100dvh !important;
          }
          .axiom-main-canvas {
            border-radius: 0 !important;
            box-shadow: none !important;
            height: 100dvh !important;
          }
          .axiom-top-header {
            padding: 14px 16px 12px !important;
            border-bottom: 1px solid #f4f4f5;
          }
          .axiom-welcome-title {
            font-size: 1.15rem !important;
          }
          .axiom-welcome-sub {
            display: none !important;
          }
          .axiom-page-main {
            padding: 14px 16px 28px !important;
          }
        }
        @media (min-width: 901px) {
          .show-mobile { display: none !important; }
          #mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
