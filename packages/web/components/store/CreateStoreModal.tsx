import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Modal } from "~~/components/ui/Modal";
import { apiFetch } from "~~/lib/apiFetch";

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateStoreModal({ isOpen, onClose, onCreated }: CreateStoreModalProps) {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStoreName("");
    setStoreDescription("");
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
      const response = await apiFetch("/api/stores/create", {
        method: "POST",
        body: JSON.stringify({ storeName, storeDescription }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create store");
      }

      reset();
      onClose();
      onCreated();
      navigate({ to: "/store/$storeSlug", params: { storeSlug: result.store.store_slug } });
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
          <span className="text-sm font-medium text-base-content/70">Description (optional)</span>
          <textarea
            value={storeDescription}
            onChange={e => setStoreDescription(e.target.value)}
            className="textarea textarea-bordered min-h-20"
            placeholder="What this store sells. You add catalog items and stock on the store page."
          />
        </label>

        <div className="rounded-xl border border-white/10 bg-base-200/50 px-4 py-3 text-sm text-base-content/65">
          Shoppers tap their chip and pay your wallet directly. You add items, prices and stock on the store page.
        </div>

        {error && (
          <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-ghost" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting || !storeName.trim()}>
          {isSubmitting ? "Creating..." : "Create Store"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
