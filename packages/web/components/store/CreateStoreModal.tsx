import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Modal } from "~~/components/ui/Modal";
import { apiFetch } from "~~/lib/apiFetch";
import type { Event } from "~~/lib/events.types";

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminWallet: string;
  /** The user's existing store groups; a new store can join one of them. */
  networks: Event[];
  onCreated: () => void;
}

const NEW_GROUP = "__new__";

export function CreateStoreModal({ isOpen, onClose, adminWallet, networks, onCreated }: CreateStoreModalProps) {
  const navigate = useNavigate();
  const [networkSlug, setNetworkSlug] = useState(networks[0]?.event_slug ?? NEW_GROUP);
  const [networkName, setNetworkName] = useState("My Stores");
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [managerWallet, setManagerWallet] = useState(adminWallet);
  const [splitPercentage, setSplitPercentage] = useState("80");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to the first existing store group each time the modal opens (networks load after mount).
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNetworkSlug(networks[0]?.event_slug ?? NEW_GROUP);
    }
  }, [isOpen, networks]);

  const reset = () => {
    setStoreName("");
    setStoreDescription("");
    setManagerWallet(adminWallet);
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
      const existing = networks.find(network => network.event_slug === networkSlug);
      const response = await apiFetch("/api/stores/create", {
        method: "POST",
        body: JSON.stringify({
          networkName: existing?.event_name ?? networkName,
          networkSlug: existing?.event_slug,
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

      reset();
      onClose();
      onCreated();
      navigate({
        to: "/store/$networkSlug/$storeSlug",
        params: { networkSlug: result.network.event_slug, storeSlug: result.store.stall_slug },
      });
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
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-base-content/70">Store Name</span>
          <input
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Coffee Counter"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-base-content/70">Description</span>
          <textarea
            value={storeDescription}
            onChange={e => setStoreDescription(e.target.value)}
            className="textarea textarea-bordered min-h-20"
            placeholder="What this store sells. You add catalog items and stock on the store page."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">Store group</span>
            <select
              value={networkSlug}
              onChange={e => setNetworkSlug(e.target.value)}
              className="select select-bordered w-full"
            >
              {networks.map(network => (
                <option key={network.id} value={network.event_slug}>
                  {network.event_name}
                </option>
              ))}
              <option value={NEW_GROUP}>New group…</option>
            </select>
          </label>
          {networkSlug === NEW_GROUP && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-base-content/70">Group name</span>
              <input
                value={networkName}
                onChange={e => setNetworkName(e.target.value)}
                className="input input-bordered w-full"
                placeholder="My Stores"
              />
            </label>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">Manager wallet (receives payments)</span>
            <input
              value={managerWallet}
              onChange={e => setManagerWallet(e.target.value.trim())}
              className="input input-bordered w-full font-mono text-sm"
              placeholder="0x..."
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">Manager share %</span>
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
          Shoppers pay the manager wallet directly with a chip tap. The manager share splits each sale between the
          manager and you in the store&apos;s books. Leave the wallet as yours to run the store yourself.
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
          disabled={isSubmitting || !storeName.trim() || (networkSlug === NEW_GROUP && !networkName.trim())}
        >
          {isSubmitting ? "Creating..." : "Create Store"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
