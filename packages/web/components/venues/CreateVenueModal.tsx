import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Modal } from "~~/components/ui/Modal";
import { useVenueCredits } from "~~/hooks/useVenueCredits";
import { apiFetch } from "~~/lib/apiFetch";
import { formatWalletError } from "~~/utils/errorFormatting";

interface CreateVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Sets up a venue: the owner's wallet registers it on VenueCredits (one transaction), then the server reads
 * the venue id from that transaction and saves the venue.
 */
export function CreateVenueModal({ isOpen, onClose }: CreateVenueModalProps) {
  const navigate = useNavigate();
  const { ownerWrite } = useVenueCredits();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<"idle" | "registering" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (step !== "idle") return;
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    let stage: "registering" | "saving" = "registering";
    try {
      setStep(stage);
      const txHash = await ownerWrite({ functionName: "createVenue", args: [] });
      stage = "saving";
      setStep(stage);
      const response = await apiFetch("/api/venues/create", {
        method: "POST",
        body: JSON.stringify({ name, description, txHash }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create venue");
      onClose();
      await navigate({ to: "/venues/$venueSlug", params: { venueSlug: result.venue.venue_slug } });
    } catch (err) {
      setError(err instanceof Error && stage === "saving" ? err.message : formatWalletError(err));
    } finally {
      setStep("idle");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="lg">
      <Modal.Header>Set up a venue</Modal.Header>
      <Modal.Body className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-base-content/70">Venue name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Neon Arcade"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-base-content/70">Description</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="textarea textarea-bordered min-h-24 w-full"
            placeholder="What guests can do here. You add stalls and their credit prices on the venue page."
          />
        </label>
        <p className="text-xs text-base-content/50">
          Your venue gets its own credits. Guests top up with USDC and spend the credits at your stalls with a chip tap.
          Credits only work here, and you withdraw the USDC that guests have spent. Setting up sends one transaction
          from your wallet.
        </p>
        {error && <p className="text-sm text-error">{error}</p>}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-ghost" onClick={close} disabled={step !== "idle"}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={step !== "idle" || !name.trim()}>
          {step === "registering" ? "Registering on-chain..." : step === "saving" ? "Saving..." : "Create venue"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
