"use client";

import { useMemo, useState } from "react";
import { Modal } from "~~/components/ui/Modal";

type ParsedItem = {
  sku: string;
  name: string;
  price: number;
  stock: number;
};

const parseInitialItems = (value: string): ParsedItem[] => {
  return value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [sku, name, price, stock] = line.split("|").map(part => part.trim());
      return {
        sku,
        name,
        price: Number(price),
        stock: Number(stock || 0),
      };
    })
    .filter(item => item.sku && item.name && !Number.isNaN(item.price) && !Number.isNaN(item.stock));
};

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminWallet: string;
  onCreated: () => void;
}

export function CreateStoreModal({ isOpen, onClose, adminWallet, onCreated }: CreateStoreModalProps) {
  const [networkName, setNetworkName] = useState("SplitHub Store Network");
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [managerWallet, setManagerWallet] = useState(adminWallet);
  const [splitPercentage, setSplitPercentage] = useState("80");
  const [initialItems, setInitialItems] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedItems = useMemo(() => parseInitialItems(initialItems), [initialItems]);

  const reset = () => {
    setStoreName("");
    setStoreDescription("");
    setManagerWallet(adminWallet);
    setSplitPercentage("80");
    setInitialItems("");
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

      for (const item of parsedItems) {
        await fetch(`/api/stores/${result.store.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: item.sku,
            name: item.name,
            price: item.price,
            currentStock: item.stock,
          }),
        });
      }

      reset();
      onCreated();
      onClose();
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
            placeholder="What this store sells and how the agent should manage it."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">Manager Wallet</span>
            <input
              value={managerWallet}
              onChange={e => setManagerWallet(e.target.value)}
              className="input input-bordered w-full"
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

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-base-content/70">Initial Items</span>
          <textarea
            value={initialItems}
            onChange={e => setInitialItems(e.target.value)}
            className="textarea textarea-bordered min-h-32 font-mono text-sm"
            placeholder={"sku|name|price|stock\nlatte|Iced Latte|4.5|12\nbeans|House Beans|16|4"}
          />
          <span className="text-xs text-base-content/50">One item per line in the format: `sku|name|price|stock`</span>
        </label>

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
