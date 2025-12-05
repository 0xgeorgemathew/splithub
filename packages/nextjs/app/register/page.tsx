"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import { supabase } from "~~/lib/supabase";

// Dynamically import the heavy NFC component with no SSR
const RegisterChipForm = dynamic(
  () => import("~~/components/register/RegisterChipForm").then(m => ({ default: m.RegisterChipForm })),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6 animate-pulse">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
        <p className="text-base-content/70 text-sm">Loading...</p>
      </div>
    ),
  },
);

export default function RegisterPage() {
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const [isCheckingChip, setIsCheckingChip] = useState(true);

  const embeddedWallet = user?.wallet?.address;
  const twitterHandle = user?.twitter?.username;
  const twitterName = user?.twitter?.name;

  // Check if user already has a chip registered
  useEffect(() => {
    const checkChipRegistration = async () => {
      if (!ready || !authenticated || !user) return;

      try {
        const dbUser = await supabase.from("users").select("chip_address").eq("privy_user_id", user.id).single();

        if (dbUser.data?.chip_address) {
          router.replace("/approve");
          return;
        }
      } catch (error) {
        console.error("Error checking chip registration:", error);
      } finally {
        setIsCheckingChip(false);
      }
    };

    checkChipRegistration();
  }, [ready, authenticated, user, router]);

  // If not authenticated, redirect to home
  if (ready && !authenticated) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-base-300 relative">
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 pt-4 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Premium Progress Indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-base-content">Step 1 of 3</span>
              <span className="text-xs text-base-content/50 uppercase tracking-wider">Registering chip</span>
            </div>
            <div className="relative w-full h-1.5 bg-base-200/50 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-700 ease-out"
                style={{ width: "33.33%" }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-primary/40 rounded-full animate-pulse"
                style={{ width: "33.33%" }}
              />
            </div>
          </div>

          {/* User Info - Subtle */}
          {twitterHandle && (
            <div className="text-center">
              <p className="text-xs text-base-content/50">
                Logged in as <span className="font-semibold text-base-content/70">{twitterName || twitterHandle}</span>{" "}
                <span className="text-base-content/40">@{twitterHandle}</span>
              </p>
            </div>
          )}

          {!ready || isCheckingChip ? (
            /* Initial Loading State */
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6 animate-pulse">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
              <p className="text-base-content/70 text-sm">Loading...</p>
            </div>
          ) : embeddedWallet && user ? (
            /* Main Registration Form - Lazy Loaded */
            <RegisterChipForm
              userId={user.id}
              embeddedWallet={embeddedWallet}
              twitterHandle={twitterHandle}
              twitterName={twitterName}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
