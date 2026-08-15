import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ children, user, setCurrentUser, theme, toggleTheme, onSearch, searchPlaceholder }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: 'var(--bg-radial)', backgroundColor: 'var(--bg-color)' }}>
      {/* Ultra-Premium Smooth Glowing Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] blur-[120px] rounded-full animate-blob"
          style={{ background: theme === 'dark' ? 'rgba(147,51,234,0.15)' : 'rgba(124,58,237,0.06)' }}></div>
        <div className="absolute top-[10%] -right-[10%] w-[60%] h-[60%] blur-[120px] rounded-full animate-blob animation-delay-2000"
          style={{ background: theme === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.05)' }}></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] blur-[120px] rounded-full animate-blob animation-delay-4000"
          style={{ background: theme === 'dark' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.05)' }}></div>
      </div>

      <Sidebar
        user={user}
        setCurrentUser={setCurrentUser}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        theme={theme}
      />

      <div className="flex flex-col min-h-screen transition-all duration-500 relative z-10">
        <Navbar
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onSearch={onSearch}
          searchPlaceholder={searchPlaceholder}
        />

        <main className="flex-grow min-w-0 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 lg:p-12 mt-2 sm:mt-4">
          {children}
        </main>

        <footer className="p-5 sm:p-10 border-t border-[var(--glass-border)] text-center">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
            © 2026 ServiGo Premium Dashboard • Designed for Excellence
          </p>
        </footer>
      </div>

      {/* Overlay for mobile/collapsible sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close navigation menu"
          onKeyDown={(event) => event.key === 'Escape' && setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default DashboardLayout;
