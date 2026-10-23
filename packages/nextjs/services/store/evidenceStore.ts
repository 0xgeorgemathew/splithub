import { env } from "cloudflare:workers";
import { stableJsonStringify } from "~~/lib/erc8004";

/**
 * Immutable ERC-8004 evidence documents in R2.
 *
 * Validation requests/responses and reputation feedback commit a keccak hash of a JSON document
 * onchain alongside its URI. The exact hashed bytes are stored here when the hash is computed, so
 * the URI keeps resolving to content that matches the committed hash even after rows change.
 */
export type EvidenceKind = "validation-request" | "validation-response" | "feedback";

const evidenceKey = (kind: EvidenceKind, id: string) => `erc8004/${kind}/${id}.json`;

export async function putEvidenceDocument(kind: EvidenceKind, id: string, document: unknown, hash: string) {
  await env.EVIDENCE.put(evidenceKey(kind, id), stableJsonStringify(document), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { hash },
  });
}

export async function getEvidenceResponse(kind: EvidenceKind, id: string | null): Promise<Response | null> {
  if (!id) return null;
  const object = await env.EVIDENCE.get(evidenceKey(kind, id));
  if (!object) return null;
  return new Response(await object.text(), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=31536000, immutable",
      ...(object.customMetadata?.hash ? { "x-content-keccak256": object.customMetadata.hash } : {}),
    },
  });
}
