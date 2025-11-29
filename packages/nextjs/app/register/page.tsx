"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { supabase } from "~~/lib/supabase";

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        chip_address: "0xd9623A62F135d3e55D800b80e5e6739315e52Ae6", // To Do - Config with contract
      });

      if (insertError) {
        throw insertError;
      }

      // Success - redirect to dashboard
      router.push("/pay");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="max-w-md w-full px-4">
        <h1 className="text-4xl font-bold text-center mb-2">Welcome to SplitHub</h1>
        <p className="text-center text-gray-600 mb-8">Create your profile to get started</p>

        {!isConnected ? (
          <div className="bg-base-200 p-8 rounded-lg text-center">
            <p className="mb-4">Please connect your wallet to register</p>
            <p className="text-sm text-gray-500">Use the &ldquo;Connect Wallet&rdquo; button in the header</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label htmlFor="wallet" className="block text-sm font-medium mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                id="wallet"
                value={address || ""}
                disabled
                className="input input-bordered w-full bg-base-200"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                className="input input-bordered w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="input input-bordered w-full"
                required
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner"></span> : "Create Profile"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
