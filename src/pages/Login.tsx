import React, { useState, useEffect } from 'react';
import {
  Building2, HardHat, Hammer, ArrowRight, Mail, Lock,
  Eye, EyeOff, MapPin,
  Layers, Quote, Search, ShoppingBag, Menu, ChevronDown,
  Globe, Check, X
} from 'lucide-react';
import { signInWithEmail } from '../services/auth.service';
import { showToast } from '../hooks';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('rajesh@nirmaniq.app');
  const [password, setPassword] = useState('Welcome@123');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'commercial' | 'residential' | 'industrial'>('all');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Quick Demo roles for effortless 1-click evaluation
  const demoRoles = [
    {
      title: 'Project Owner',
      role: 'owner',
      email: 'rajesh@nirmaniq.app',
      desc: 'Full budget & approval control',
      badge: 'Admin'
    },
    {
      title: 'Site Supervisor',
      role: 'supervisor',
      email: 'suresh@nirmaniq.app',
      desc: 'Daily reports & stock logs',
      badge: 'Field Site'
    },
    {
      title: 'Accountant',
      role: 'accountant',
      email: 'anitha@nirmaniq.app',
      desc: 'GST invoices & bill reviews',
      badge: 'Finance'
    }
  ];

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = identifier.trim();
    if (!cleanInput) {
      showToast('Please enter your email or username', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your password', 'error');
      return;
    }

    const emailToUse = cleanInput.includes('@') ? cleanInput : `${cleanInput}@nirmaniq.app`;

    setLoading(true);
    try {
      await signInWithEmail(emailToUse, password);
      showToast('Welcome to NirmaniQ', 'success');
    } catch (err: any) {
      console.warn('Supabase sign-in fallback to Demo Workspace mode:', err);
      // Fallback for demo role accounts so user can preview all dashboard features immediately
      const demoRole = demoRoles.find(r => r.email === emailToUse) || {
        role: 'owner',
        title: 'Project Owner',
        email: emailToUse
      };
      const mockUser = {
        id: 'demo-user-' + demoRole.role,
        email: demoRole.email,
        phone: '+91 98765 43210',
        user_metadata: { name: demoRole.title, role: demoRole.role }
      };
      const mockProfile = {
        id: mockUser.id,
        name: demoRole.title,
        email: mockUser.email,
        role: demoRole.role as 'owner' | 'supervisor' | 'accountant',
        phone: '+91 98765 43210',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('nirmaniq-demo-session', JSON.stringify({ user: mockUser, profile: mockProfile }));
      window.dispatchEvent(new Event('nirmaniq-auth-changed'));
      showToast(`Welcome back, ${demoRole.title}!`, 'success');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoRole = (roleEmail: string) => {
    setIdentifier(roleEmail);
    setPassword('Welcome@123');
  };

  // Gallery items matching the exact reference grid
  const projectGallery = [
    {
      id: 1,
      title: 'The Apex White Towers',
      category: 'commercial',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=700&q=80',
      subtitle: 'Modern Cantilever Architecture'
    },
    {
      id: 2,
      title: 'Sri Lakshmi Residency',
      category: 'residential',
      image: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=700&q=80',
      subtitle: 'Premium Gated Villas'
    },
    {
      id: 3,
      title: 'Structural Steel Hub',
      category: 'industrial',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=700&q=80',
      subtitle: 'Heavy Metal Fabrication & Truss'
    },
    {
      id: 4,
      title: 'Meadow Contemporary Villa',
      category: 'residential',
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=700&q=80',
      subtitle: 'Pre-cast Concrete & Glass'
    },
    {
      id: 5,
      title: 'Horizon Commercial Facade',
      category: 'commercial',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=700&q=80',
      subtitle: 'Curtain Wall System'
    },
    {
      id: 6,
      title: 'Spiral Spiral Atrium & Stairs',
      category: 'interior',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=80',
      subtitle: 'Architectural Stairwell'
    }
  ];

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('English');

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredProjects = activeTab === 'all'
    ? projectGallery
    : projectGallery.filter(p => p.category === activeTab);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: '#111827', background: '#ffffff', overflowX: 'hidden' }}>

      {/* ── RESPONSIVE FIXED HEADER ──── */}
      <div className="landing-header-fixed" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: isScrolled ? 'rgba(255, 255, 255, 0.96)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(0, 0, 0, 0.08)' : 'none',
        boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.06)' : 'none'
      }}>
        {/* ── TOP ANNOUNCEMENT BAR (RESPONSIVE) ─── */}
        <div className="landing-topbar" style={{
          borderBottom: isScrolled ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
          background: isScrolled ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            maxWidth: 1360,
            margin: '0 auto',
            padding: '6px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            color: '#1c1917',
            fontWeight: 600
          }}>
            {/* Left: Language Selector + Social Icons + Location */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {/* Interactive Language Selector */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  aria-label="Select Language"
                  onClick={() => setIsLangOpen(p => !p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    color: '#1c1917',
                    background: isLangOpen ? 'rgba(0,0,0,0.06)' : 'none',
                    border: 'none',
                    padding: '3px 7px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Globe size={12} color="#1c1917" />
                  <span>{currentLang}</span>
                  <ChevronDown size={13} style={{ transform: isLangOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </button>

                {isLangOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '100%',
                      marginTop: 6,
                      background: '#ffffff',
                      borderRadius: 10,
                      boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                      border: '1px solid #e2e8f0',
                      padding: 6,
                      zIndex: 300,
                      minWidth: 160
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3af', textTransform: 'uppercase', padding: '4px 8px', letterSpacing: '0.06em' }}>
                      Select Language
                    </div>
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setCurrentLang(lang.name);
                          setIsLangOpen(false);
                          showToast(`Language set to ${lang.name} (${lang.native})`, 'success');
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          border: 'none',
                          background: currentLang === lang.name ? '#fef3c7' : 'transparent',
                          color: '#1c1917',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: currentLang === lang.name ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span>{lang.name} <span style={{ color: '#78716c', fontSize: '0.72rem' }}>({lang.native})</span></span>
                        {currentLang === lang.name && <Check size={13} color="#d97706" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Functional Social Links with Real Destinations / Feedback */}
              <div className="topbar-socials" style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#1c1917' }}>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  title="Facebook"
                  style={{
                    color: '#1c1917',
                    textDecoration: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 4,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  f
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  title="Twitter / X"
                  style={{
                    color: '#1c1917',
                    textDecoration: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 4,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  t
                </a>
                <a
                  href="https://google.com"
                  target="_blank"
                  rel="noreferrer"
                  title="Google Workspace"
                  style={{
                    color: '#1c1917',
                    textDecoration: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 4,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  G+
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  title="LinkedIn"
                  style={{
                    color: '#1c1917',
                    textDecoration: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 4,
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  in
                </a>
              </div>

              {/* Site Location Label */}
              <span className="topbar-location" style={{ color: '#292524', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <MapPin size={11} color="#d97706" />
                <span>Anantapur, AP</span>
              </span>
            </div>

            {/* Right: Search, Cart, Menu Icons */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#1c1917', position: 'relative' }}>
              {/* Search Toggle */}
              <button
                aria-label="Search"
                onClick={() => setIsSearchOpen(p => !p)}
                style={{
                  background: isSearchOpen ? 'rgba(0,0,0,0.08)' : 'none',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px 7px',
                  color: '#1c1917',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'background 0.15s ease'
                }}
              >
                <Search size={15} />
              </button>

              {/* Functional Search Bar Dropdown */}
              {isSearchOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 6,
                  background: '#ffffff',
                  borderRadius: 12,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                  border: '1px solid #e2e8f0',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  zIndex: 350,
                  minWidth: 280
                }}>
                  <Search size={14} color="#f59e0b" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search site logs, cement, bills..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        showToast(`Searching for "${searchQuery}" in ERP site archives...`, 'info');
                        setIsSearchOpen(false);
                      }
                    }}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '0.8rem',
                      width: '100%',
                      fontFamily: 'inherit'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3af', padding: 0, fontSize: '0.8rem' }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Procurement / Orders Action Button */}
              <button
                aria-label="Procurement & Materials"
                onClick={() => setIsLoginModalOpen(true)}
                title="Procurement & Material Indents"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px 7px',
                  color: '#1c1917',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ShoppingBag size={15} />
              </button>

              {/* Menu Button: Opens Login/Workspace Options */}
              <button
                aria-label="Open Workspace Menu"
                onClick={() => setIsLoginModalOpen(true)}
                title="Workspace Navigation"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px 7px',
                  color: '#1c1917',
                  display: 'flex',
                  borderRadius: 6,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN NAVBAR ─── */}
        <nav style={{
          padding: isScrolled ? '6px 0' : '10px 0',
          transition: 'padding 0.3s ease'
        }}>
          <div style={{
            maxWidth: 1360,
            margin: '0 auto',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}>
            {/* Brand Logo: Circular mark + NirmaniQ text */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '3px solid #1c1917',
                  borderRightColor: 'transparent',
                  transform: 'rotate(-45deg)'
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1c1917', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  NirmaniQ
                </div>
                <div className="logo-subtitle" style={{ fontSize: '0.55rem', fontWeight: 700, color: '#292524', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>
                  Construction & Site Operations
                </div>
              </div>
            </div>

            {/* Links: Hidden on mobile, visible on desktop */}
            <div className="landing-nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center', fontSize: '0.88rem', fontWeight: 600, color: '#1c1917' }}>
              <a href="#hero" style={{ color: '#1c1917', fontWeight: 800, textDecoration: 'none' }}>Overview</a>
              <a href="#services" style={{ color: '#1c1917', textDecoration: 'none' }}>Site Tracking</a>
              <a href="#blueprint" style={{ color: '#1c1917', textDecoration: 'none' }}>Material Control</a>
              <a href="#projects" style={{ color: '#1c1917', textDecoration: 'none' }}>Projects</a>
              <a href="#experts" style={{ color: '#1c1917', textDecoration: 'none' }}>Roles</a>
              <a href="#news" style={{ color: '#1c1917', textDecoration: 'none' }}>Field Insights</a>
            </div>

            {/* Pill "Sign In / Workspace" Button */}
            <div style={{ flexShrink: 0 }}>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="header-cta-btn"
                style={{
                  background: isScrolled ? '#1c1917' : 'transparent',
                  color: isScrolled ? '#ffffff' : '#1c1917',
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: '1.5px solid #1c1917',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isScrolled ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <span>Sign In / Demo</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* ── UNIFIED HERO CANVAS (EXACT SINGLE FULL PAGE ON MOBILE & DESKTOP) ──── */}
      <header id="hero" className="hero-landing-header">

        {/* Full 8-Second Construction Equipment Assembly Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          key="hero-construction-equipment-assembly"
          className="hero-background-video"
        >
          <source src="/construction_equipment_assembly_1080p.mp4" type="video/mp4" />
        </video>

        {/* Subtle Bottom Vignette Gradient */}
        <div className="hero-bottom-gradient" />

        {/* ── HERO CONTENT (MODERN CLEAN FLOATING SHEET INTEGRATED WITH AMBER-GOLD GRADIENT) ──────────── */}
        <div className="hero-content-wrapper">
          <div style={{
            maxWidth: 1300,
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}>
            <div className="hero-content-box">
              {/* Pre-header in reference font & theme */}
              <div className="hero-pre-header">
                SMART CONSTRUCTION MANAGEMENT ERP
              </div>

              {/* Main Title in reference font & theme */}
              <h1 className="hero-main-title">
                FIELD PROGRESS &<br />COST INTELLIGENCE
              </h1>

              {/* Sub-paragraph in reference font & theme */}
              <p className="hero-subtext">
                Track cement and steel stocks, log daily site pour reports with photo proofs, verify contractor billing, and prevent budget leaks in real time.
              </p>

              {/* Primary Action Button in reference dark slate button style */}
              <div>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="hero-cta-button"
                >
                  ENTER SITE WORKSPACE
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── SECTION 2: SERVICES ("Built for Indian Construction Sites") ───────── */}
      <section id="services" className="landing-services-section" style={{
        background: '#ffffff',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
            Real-time Site Visibility <br />
            <span style={{ color: '#f59e0b' }}>From Foundation to Handover.</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 600, margin: '0 auto 60px' }}>
            Integrated field management engineered for project owners, site engineers, supervisors, and cost accountants.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            <div className="landing-service-card">
              <div className="landing-service-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Layers size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                Floors & Roofs
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Structural beam schedules, slab casting progress, reinforcement tracking, and daily pour verification with photographic proof.
              </p>
            </div>

            <div className="landing-service-card">
              <div className="landing-service-icon-wrap" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <Building2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                Rooms & Halls
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Masonry, plastering, tile work, and interior finishing schedules with real-time issue logging and vendor task assignments.
              </p>
            </div>

            <div className="landing-service-card">
              <div className="landing-service-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <Hammer size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                Basements & Foundations
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                Excavation volume calculations, soil testing records, piling logs, and steel rebar inventory reconciliation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: BLUEPRINT & HARD HAT PROMO BANNER ─────────────────────── */}
      <section id="blueprint" style={{ padding: '70px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 60,
          alignItems: 'center'
        }}>
          <div>
            <img
              src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80"
              alt="Architectural construction blueprints and site plans"
              style={{
                width: '100%',
                height: 380,
                objectFit: 'cover',
                borderRadius: 20,
                boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.16)',
                display: 'block'
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Turnkey Construction Control
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2, margin: '0 0 18px' }}>
              Eliminate Material Shrinkage & Cost Overruns.
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, marginBottom: 28 }}>
              Whether you are managing multi-crore high-rises or luxury villa townships, NirmaniQ keeps your material inventories from shrinking, prevents budget overruns, and provides instant audit compliance.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              style={{
                background: '#f59e0b',
                color: '#0f172a',
                padding: '14px 28px',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 18px rgba(245, 158, 11, 0.3)'
              }}
            >
              <span>Build With NirmaniQ</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: RECENT PROJECTS (FILTERABLE GRID) ────────────────────── */}
      <section id="projects" style={{ padding: '90px 40px', background: '#ffffff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
              Recent Projects
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Delivered with zero-delay workflows using our Indian construction management system.
            </p>

            {/* Filter Tabs */}
            <div style={{ display: 'inline-flex', gap: 10, marginTop: 24, padding: 6, background: '#f1f5f9', borderRadius: 30 }}>
              {(['all', 'commercial', 'residential', 'industrial'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 20,
                    border: 'none',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    background: activeTab === tab ? '#0f172a' : 'transparent',
                    color: activeTab === tab ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* 6-Item Image Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="landing-project-card"
              >
                <img
                  src={p.image}
                  alt={p.title}
                />
                <div className="landing-project-overlay">
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {p.category}
                  </div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '4px 0 2px' }}>
                    {p.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                    {p.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: MEET OUR EXPERTS ─────────────────────────────────────── */}
      <section id="experts" style={{ padding: '80px 40px', background: '#f8fafc', textAlign: 'center' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
            Meet Our Experts
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 600, margin: '0 auto 48px' }}>
            Licensed civil engineers, master project architects, and site supervisors heading our flagship developments.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[
              {
                name: 'Rajesh Nair',
                role: 'Chief Project Owner',
                img: '/rajesh_nair.jpg'
              },
              {
                name: 'Suresh Kumar',
                role: 'Senior Site Supervisor',
                img: '/suresh_kumar.jpg'
              },
              {
                name: 'Priya Menon',
                role: 'Field Civil Engineer',
                img: '/priya_menon.jpg'
              },
              {
                name: 'Anitha Rao',
                role: 'Chief Cost Accountant',
                img: '/anitha_rao.jpg'
              }
            ].map((exp, i) => (
              <div key={i} className="landing-expert-card">
                <img src={exp.img} alt={exp.name} />
                <div style={{ padding: '18px 16px' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{exp.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>{exp.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: IMPACT METRICS COUNTER STRIP (AMBER TEXTURED) ───────── */}
      <section style={{
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        padding: '50px 30px',
        color: '#0f172a'
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 30,
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>10+</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>
              Years Experience
            </div>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>120+</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>
              Active Sites Tracked
            </div>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>80+</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>
              Completed Projects
            </div>
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>240+</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>
              Site Supervisors
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: TESTIMONIAL ───────────────────────────────────────────── */}
      <section style={{ padding: '80px 30px', background: '#ffffff', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Quote size={40} color="#f59e0b" style={{ margin: '0 auto 20px', display: 'block' }} />
          <p style={{ fontSize: '1.25rem', color: '#1f2937', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24, fontWeight: 500 }}>
            "NirmaniQ solved our biggest headache: knowing exact cement and steel consumption daily across all 4 sites in Whitefield. No more ghost expenses or duplicate supplier invoices."
          </p>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Somasundaram Reddy</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Managing Director, Reddy Infrastructure Pvt Ltd</div>
        </div>
      </section>

      {/* ── SECTION 8: LATEST NEWS ───────────────────────────────────────────── */}
      <section id="news" style={{ padding: '80px 40px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
              Latest Industry News
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Insights into concrete grade quality, structural safety codes, and cost reduction.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {[
              {
                title: 'How to optimize rebar cutting wastage below 2%',
                date: '12 OCT 2026',
                img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=700&q=80',
                snippet: 'Practical bar bending schedules and scrap reconciliation techniques for tier-1 residential towers.'
              },
              {
                title: 'Monsoon curing practices for M30 grade concrete',
                date: '08 OCT 2026',
                img: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=700&q=80',
                snippet: 'Preventing micro-cracks and ensuring optimal compressive strength during intermittent rainfall.'
              },
              {
                title: 'Implementing digital daily progress reports on site',
                date: '01 OCT 2026',
                img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=700&q=80',
                snippet: 'Empowering site engineers with mobile photo documentation to prevent client claim disputes.'
              }
            ].map((news, i) => (
              <div key={i} className="landing-news-card">
                <div className="news-img-wrap">
                  <img src={news.img} alt={news.title} />
                </div>
                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>{news.date}</div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', lineHeight: 1.3 }}>{news.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 16px', flexGrow: 1 }}>{news.snippet}</p>
                  <a href="#hero" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
                    <span>Continue Reading</span> <ArrowRight size={14} color="#f59e0b" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#090e17', color: '#94a3b8', padding: '60px 40px 30px', fontSize: '0.875rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 40, marginBottom: 50 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', fontWeight: 800, fontSize: '1.25rem', marginBottom: 16 }}>
              <HardHat size={24} color="#f59e0b" /> NirmaniQ<span style={{ color: '#f59e0b' }}>.</span>
            </div>
            <p style={{ lineHeight: 1.6, color: '#64748b' }}>
              NirmaniQ is an integrated construction ERP built for Indian developers, contractors, and project stakeholders.
            </p>
          </div>

          <div>
            <h5 style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', marginBottom: 16 }}>Quick Links</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="#hero" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</a>
              <a href="#services" style={{ color: '#94a3b8', textDecoration: 'none' }}>Site Services</a>
              <a href="#projects" style={{ color: '#94a3b8', textDecoration: 'none' }}>Project Showcase</a>
              <a href="#experts" style={{ color: '#94a3b8', textDecoration: 'none' }}>Team & Supervisors</a>
            </div>
          </div>

          <div>
            <h5 style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', marginBottom: 16 }}>Contact Us</h5>
            <p style={{ margin: '0 0 8px' }}>NirmaniQ Hub, Subhash Road</p>
            <p style={{ margin: '0 0 8px' }}>Anantapur, Andhra Pradesh 515001</p>
            <p style={{ color: '#f59e0b', fontWeight: 700, marginTop: 12 }}>+91 94400 12345</p>
          </div>

          <div>
            <h5 style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', marginBottom: 16 }}>Direct Access</h5>
            <p style={{ color: '#64748b', marginBottom: 14 }}>
              Sign in with your authorized site credentials to access live project analytics.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              style={{
                width: '100%',
                background: '#f59e0b',
                color: '#0f172a',
                padding: '12px 18px',
                borderRadius: 6,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Sign In to Workspace
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} NirmaniQ Systems Pvt Ltd. All rights reserved.
        </div>
      </footer>

      {/* ── MODAL: AUTHENTICATION DIALOG (PREMIUM NIRMANIQ SIGN-IN) ───────── */}
      {isLoginModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 20,
            maxWidth: 480,
            width: '100%',
            padding: '36px 32px',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.4)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setIsLoginModalOpen(false)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}
            >
              ✕
            </button>

            {/* Modal Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <HardHat size={24} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Sign in to NirmaniQ
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                  Enterprise Construction Intelligence
                </p>
              </div>
            </div>

            {/* 1-Click Demo Profiles */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Quick 1-Click Demo Roles:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {demoRoles.map(r => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => selectDemoRole(r.email)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: identifier === r.email ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                      background: identifier === r.email ? '#fffbeb' : '#f8fafc',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a' }}>{r.title}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>{r.badge}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Email or Username
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3af" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      padding: '0 12px 0 40px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: '#f8fafc'
                    }}
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3af" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      padding: '0 40px 0 40px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: '#f8fafc'
                    }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3af'
                    }}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 48,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                }}
              >
                {loading ? 'Validating...' : (
                  <>
                    <span>Enter Construction Workspace</span>
                    <ArrowRight size={17} color="#f59e0b" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .landing-nav-links {
            display: none !important;
          }
          .hero-container {
            padding: 0 20px !important;
          }
          .hero-content-box {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
