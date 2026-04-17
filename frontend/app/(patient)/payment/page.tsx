"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Lock, ChevronLeft } from "lucide-react";

export default function PaymentPage() {
  const [card, setCard] = useState({
    name: "", number: "", expiry: "", cvv: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
        <p className="text-gray-500 mb-6">Your appointment has been confirmed.</p>
        <Link href="/appointments"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700">
          View Appointments
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <Link href="/appointments" className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 text-sm">
          <ChevronLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Payment</h2>
          <div className="ml-auto flex items-center gap-1 text-green-600 text-sm">
            <Lock size={14} /> Secure
          </div>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-indigo-700 font-medium">Demo Payment — No real charges</p>
        </div>
        <form onSubmit={handlePay} className="space-y-4">
          <input placeholder="Cardholder Name" value={card.name}
            onChange={(e) => setCard({ ...card, name: e.target.value })}
            required className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input placeholder="Card Number" value={card.number} maxLength={19}
            onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim() })}
            required className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="MM/YY" value={card.expiry} maxLength={5}
              onChange={(e) => setCard({ ...card, expiry: e.target.value })}
              required className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input placeholder="CVV" value={card.cvv} maxLength={3}
              onChange={(e) => setCard({ ...card, cvv: e.target.value })}
              required className="border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            {loading ? "Processing..." : "Pay Now"}
          </button>
        </form>
      </div>
    </div>
  );
}