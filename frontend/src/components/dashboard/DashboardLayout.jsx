import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ children, user, setCurrentUser }) => {
  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-neon-blue/30 overflow-x-hidden relative">
      {/* Ultra-Premium Smooth Glowing Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] bg-purple-600/15 blur-[120px] rounded-full animate-blob"></div>
        <div className="absolute top-[10%] -right-[10%] w-[60%] h-[60%] bg-blue-600/15 blur-[120px] rounded-full animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-indigo-600/15 blur-[120px] rounded-full animate-blob animation-delay-4000"></div>
      </div>

      <Sidebar user={user} setCurrentUser={setCurrentUser} />
      
      <div className="pl-72 flex flex-col min-h-screen relative z-10">
        <Navbar user={user} />
        
        <main className="flex-grow p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        <footer className="p-10 border-t border-white/5 text-center">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
            © 2026 ServiGo Premium Dashboard • Designed for Excellence
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
