import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Navbar from './dashboard/Navbar';

const PaymentStatus = () => {
  const { status } = useParams();
  const navigate = useNavigate();

  const getStatusContent = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className="w-24 h-24 text-neon-green mb-6" />,
          title: "Payment Successful!",
          message: "Thank you! Your payment has been processed successfully. Your service booking is confirmed.",
          color: "bg-neon-green/20 border-neon-green/50",
          buttonClass: "bg-neon-green hover:bg-neon-green/80 text-black font-bold"
        };
      case 'fail':
        return {
          icon: <XCircle className="w-24 h-24 text-red-500 mb-6" />,
          title: "Payment Failed",
          message: "Unfortunately, your transaction could not be completed. Please try again with a different payment method.",
          color: "bg-red-500/20 border-red-500/50",
          buttonClass: "bg-red-500 hover:bg-red-600 text-white font-bold"
        };
      case 'cancel':
        return {
          icon: <AlertTriangle className="w-24 h-24 text-yellow-500 mb-6" />,
          title: "Payment Cancelled",
          message: "You have cancelled the payment process. Your booking remains unpaid.",
          color: "bg-yellow-500/20 border-yellow-500/50",
          buttonClass: "bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
        };
      default:
        return {
          icon: <AlertTriangle className="w-24 h-24 text-white/50 mb-6" />,
          title: "Unknown Status",
          message: "We could not verify your payment status.",
          color: "bg-white/10 border-white/20",
          buttonClass: "bg-white/20 hover:bg-white/30 text-white font-bold"
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="min-h-screen bg-[var(--bg-color)] relative flex flex-col transition-colors duration-500">
      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <div className={`glass-premium p-10 max-w-md w-full text-center rounded-[2.5rem] border ${content.color} animate-in zoom-in-95 duration-500`}>
          <div className="flex justify-center">
            {content.icon}
          </div>
          <h1 className="text-3xl font-black text-[var(--text-main)] font-poppins mb-4 tracking-tighter">{content.title}</h1>
          <p className="text-[var(--text-secondary)] mb-8 font-medium leading-relaxed">{content.message}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/customer-dashboard')}
              className={`px-8 py-4 rounded-2xl transition-all shadow-lg active:scale-95 ${content.buttonClass}`}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
