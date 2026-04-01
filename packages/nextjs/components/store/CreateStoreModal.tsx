"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "~~/components/ui/Modal";
import { DEMO_OPERATOR_WALLET } from "~~/services/store/shared";

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminWallet: string;
  onCreated: () => void;
}

export function CreateStoreModal({ isOpen, onClose, adminWallet, onCreated }: CreateStoreModalProps) {
  const router = useRouter();
  const [networkName, setNetworkName] = useState("SplitHub Store Network");
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [managerWallet, setManagerWallet] = useState(DEMO_OPERATOR_WALLET);
  const [splitPercentage, setSplitPercentage] = useState("80");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStoreName("");
    setStoreDescription("");
    setManagerWallet(DEMO_OPERATOR_WALLET);
    setSplitPercentage("80");
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/stores/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminWallet,
          networkName,
          networkSlug: networkName,
          storeName,
          storeSlug: storeName,
          storeDescription,
          managerWallet,
          splitPercentage: Number(splitPercentage),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create store");
      }

      const storePath = `/store/${result.network.event_slug}/${result.store.stall_slug}`;

      reset();
      onClose();
      onCreated();
      router.push(storePath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create store");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <Modal.Header>Create Store</Modal.Header>
      <Modal.Body className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">Network Name</span>
            <input
              value={networkName}
              onChange={e => setNetworkName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Retail network"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">Store Name</span>
            <input
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Coffee Counter"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-base-content/70">Description</span>
          <textarea
            value={storeDescription}
            onChange={e => setStoreDescription(e.target.value)}
            className="textarea textarea-bordered min-h-24"
            placeholder="What this store sells and how the agent should manage it. You can add catalog items on the next screen."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">Manager Wallet</span>
            <input
              value={managerWallet}
              onChange={e => setManagerWallet(e.target.value)}
              className="input input-bordered w-full"
              readOnly
              placeholder="0x..."
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">Manager Split %</span>
            <input
              value={splitPercentage}
              onChange={e => setSplitPercentage(e.target.value)}
              className="input input-bordered w-full"
              type="number"
              min="0"
              max="100"
            />
          </label>
        </div>

        <div className="rounded-xl border border-white/10 bg-base-200/50 px-4 py-3 text-sm text-base-content/65">
          Create the store shell here, then add catalog items inside the store page using the manager controls. That
          keeps store setup and inventory management in one place.
        </div>

        {error && (
          <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-ghost" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting || !storeName || !networkName}
        >
          {isSubmitting ? "Creating..." : "Create Store"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
