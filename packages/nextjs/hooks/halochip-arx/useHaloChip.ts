"use client";

import { useState } from "react";
import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";

// Utility to recursively convert BigInt values to strings for JSON serialization
const serializeBigInt = (obj: any): any => {
  if (typeof obj === "bigint") return obj.toString();
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, serializeBigInt(v)]));
};

export function useHaloChip() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getChipAddress = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result: any = await execHaloCmdWeb({ name: "get_pkeys" });
      const address = result?.etherAddresses?.["1"] || result?.etherAddress;

      if (!address) {
        throw new Error("No chip address found");
      }

      return {
        address,
        allAddresses: result?.etherAddresses ?? {},
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "NFC read failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signMessage = async ({
    message,
    digest,
    format,
  }: {
    message?: string;
    digest?: string;
    format?: "text" | "hex";
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const command: any = {
        name: "sign",
        keyNo: 1,
      };

      // Use either message (with optional format) or digest (raw hash)
      if (digest) {
        command.digest = digest;
      } else if (message) {
        command.message = message;
        if (format) {
          command.format = format;
        }
      } else {
        throw new Error("Either message or digest must be provided");
      }

      const result = await execHaloCmdWeb(command);
      return {
        address: result.etherAddress,
        signature: result.signature.ether, // Ethereum-formatted signature string
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "NFC read failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signTypedData = async ({ domain, types, primaryType, message }: any) => {
    setIsLoading(true);
    setError(null);
    try {
      // HaloTag EIP-712 structure per libhalo docs
      const typedDataPayload = {
        domain,
        types,
        primaryType,
        value: serializeBigInt(message), // libhalo uses 'value' not 'message'
      };

      console.log(
        "📝 EIP-712 Typed Data Payload:",
        JSON.stringify(typedDataPayload, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
      );

      const result = await execHaloCmdWeb({
        name: "sign",
        keyNo: 1,
        typedData: typedDataPayload,
      });

      console.log("✅ HaloTag signature result:", result);

      return {
        address: result.etherAddress,
        signature: result.signature.ether,
      };
    } catch (err) {
      console.error("❌ HaloTag signTypedData error:", err);
      const msg = err instanceof Error ? err.message : "NFC read failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signDigest = async ({ digest }: { digest: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const normalizedDigest = digest.startsWith("0x") ? digest.slice(2) : digest;
      const result: any = await execHaloCmdWeb({
        name: "sign",
        keyNo: 1,
        digest: normalizedDigest,
      });

      if (!result?.signature?.raw || !result?.etherAddress) {
        throw new Error("Invalid raw signature response from chip");
      }

      return {
        address: result.etherAddress,
        signature: result.signature.ether,
        rawSignature: {
          r: result.signature.raw.r,
          s: result.signature.raw.s,
          v: result.signature.raw.v,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "NFC read failed";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { getChipAddress, signMessage, signTypedData, signDigest, isLoading, error };
}
