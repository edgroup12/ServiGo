import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock, Briefcase, ArrowRight, CheckCircle2 } from "lucide-react";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/auth/register", form);
      alert("Account Created Successfully ✅");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden selection:bg-neon-blue/30">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/20 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-purple/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="glass-premium p-8 md:p-10 shadow-glow-blue/20 w-full max-w-md relative z-10 border border-white/10 rounded-[2.5rem]">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg -rotate-3 hover:rotate-0 transition-transform duration-300">
            <User className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 font-poppins tracking-tighter">Join <span className="text-gradient">ServiGo</span></h2>
          <p className="text-white/50 font-bold uppercase tracking-widest text-[10px]">Create your premium account today</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
            <CheckCircle2 size={18} className="rotate-180" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-neon-blue transition-colors">
              <User size={18} />
            </div>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              onChange={handleChange}
              className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue outline-none transition-all text-white font-bold placeholder-white/30"
              required
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-neon-blue transition-colors">
              <Mail size={18} />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              onChange={handleChange}
              className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue outline-none transition-all text-white font-bold placeholder-white/30"
              required
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-neon-purple transition-colors">
              <Lock size={18} />
            </div>
            <input
              type="password"
              name="password"
              placeholder="Create Password"
              onChange={handleChange}
              className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-neon-purple/20 focus:border-neon-purple outline-none transition-all text-white font-bold placeholder-white/30"
              required
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-neon-blue transition-colors">
              <Briefcase size={18} />
            </div>
            <select
              name="role"
              onChange={handleChange}
              className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue outline-none transition-all text-white font-bold appearance-none cursor-pointer"
            >
              <option value="customer" className="bg-[#0f172a]">I want to hire services</option>
              <option value="worker" className="bg-[#0f172a]">I want to provide services</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-primary text-white font-black py-4 rounded-2xl shadow-glow-blue hover:opacity-90 transition-all active:scale-[0.98] uppercase tracking-widest text-sm mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Create Account'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <p className="text-center text-sm text-white/40 mt-8 font-bold uppercase tracking-widest text-[10px]">
          Already have an account? <Link to="/login" className="text-neon-blue font-black hover:underline ml-1">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
