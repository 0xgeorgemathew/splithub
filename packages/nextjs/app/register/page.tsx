"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Mail, Sparkles, User, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "~~/lib/supabase";

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required");
      return;
    }

    setLoading(true);

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("wallet_address")
        .eq("wallet_address", address.toLowerCase())
        .single();

      if (existingUser) {
        setError("This wallet is already registered");
        setLoading(false);
        return;
      }

      // Insert new user
      const { error: insertError } = await supabase.from("users").insert({
        wallet_address: address.toLowerCase(),
        name: name.trim(),
        email: email.trim(),
        chip_address: "0xd9623A62F135d3e55D800b80e5e6739315e52Ae6",
      });

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      setTimeout(() => router.push("/pay"), 1500);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div className="relative w-16 h-16">
              <Image alt="SplitHub logo" className="cursor-pointer" fill src="/logo.svg" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-3 text-slate-900 tracking-tight">Welcome to SplitHub</h1>
          <p className="text-slate-600 text-lg font-light">Create your profile to start splitting expenses</p>
        </div>

        {/* Main Card */}
        <div className="card bg-white shadow-lg border border-slate-200">
          <div className="card-body p-8">
            {!isConnected ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Wallet className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Connect Your Wallet</h3>
                <p className="text-slate-600 mb-6">
                  Please connect your wallet using the button in the header to continue
                </p>
              </div>
            ) : success ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900">Profile Created!</h3>
                <p className="text-slate-600">Redirecting to your dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                {/* Wallet Address */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-slate-600" />
                      Wallet Address
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={address || ""}
                      disabled
                      className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-700 focus:outline-none"
                    />
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                  </div>
                </div>

                {/* Name Input */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-600" />
                      Name
                    </span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Email Input */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-slate-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-600" />
                      Email
                    </span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                    required
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-red-800 text-sm">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !name.trim() || !email.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Create Profile
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
