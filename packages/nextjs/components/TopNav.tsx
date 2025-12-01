"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { getAddress } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { AddressQRCodeModal } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton/AddressQRCodeModal";
import { NetworkOptions } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton/NetworkOptions";
import { RevealBurnerPKModal } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton/RevealBurnerPKModal";
import { useCopyToClipboard, useOutsideClick } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getBlockExplorerAddressLink, getTargetNetworks } from "~~/utils/scaffold-eth";

const BURNER_WALLET_ID = "burnerWallet";
const allowedNetworks = getTargetNetworks();

export const TopNav = () => {
  const { targetNetwork } = useTargetNetwork();
  const { disconnect } = useDisconnect();
  const { connector } = useAccount();
  const { copyToClipboard: copyAddressToClipboard, isCopiedToClipboard: isAddressCopiedToClipboard } =
    useCopyToClipboard();
  const [selectingNetwork, setSelectingNetwork] = useState(false);
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const closeDropdown = () => {
    setSelectingNetwork(false);
    dropdownRef.current?.removeAttribute("open");
  };

  useOutsideClick(dropdownRef, closeDropdown);

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        const blockExplorerAddressLink = account
          ? getBlockExplorerAddressLink(targetNetwork, account.address)
          : undefined;

        const checkSumAddress = account ? getAddress(account.address) : undefined;

        return (
          <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl">
            <div className="bg-base-100/95 backdrop-blur-lg rounded-full shadow-lg border border-base-300/50 p-1.5 flex items-center justify-between">
              {/* Logo - Unified capsule with proportional segments */}
              <Link
                href="/"
                className="flex items-center h-11 rounded-full overflow-hidden"
                style={{
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                <span
                  className="bg-base-300 text-white h-full flex items-center font-bold text-lg tracking-tight"
                  style={{
                    padding: "0 14px 0 16px",
                    borderRight: "1px solid rgba(0,0,0,0.3)",
                  }}
                >
                  Split
                </span>
                <span
                  className="bg-primary text-primary-content h-full flex items-center font-bold text-lg tracking-tight"
                  style={{
                    padding: "0 16px 0 14px",
                  }}
                >
                  hub
                </span>
              </Link>

              {/* Wallet Section */}
              {!connected ? (
                <button
                  onClick={openConnectModal}
                  type="button"
                  className="h-11 px-5 text-sm font-bold bg-primary text-primary-content hover:bg-primary/90 rounded-full transition-all duration-200"
                  style={{
                    boxShadow: "0 2px 10px rgba(242, 169, 0, 0.35), inset 0 1px 1px rgba(255,255,255,0.2)",
                  }}
                >
                  Connect
                </button>
              ) : chain.unsupported || chain.id !== targetNetwork.id ? (
                <div className="dropdown dropdown-end">
                  <label
                    tabIndex={0}
                    className="flex items-center gap-2 px-5 py-3 cursor-pointer text-error bg-error/10 rounded-full"
                  >
                    <span className="text-sm font-medium">Wrong network</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content menu p-2 mt-2 shadow-xl bg-base-100 rounded-2xl border border-base-300 gap-1"
                  >
                    <NetworkOptions />
                    <li>
                      <button
                        className="menu-item text-error btn-sm rounded-xl flex gap-3 py-3"
                        type="button"
                        onClick={() => disconnect()}
                      >
                        <ArrowLeftOnRectangleIcon className="h-5 w-4" />
                        <span>Disconnect</span>
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="ml-auto flex items-center">
                  <details ref={dropdownRef} className="dropdown dropdown-end">
                    <summary
                      className="flex items-center gap-2.5 h-11 px-3 cursor-pointer list-none bg-base-300 rounded-full hover:bg-base-300/80 transition-colors border border-base-300/50"
                      style={{
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.03)",
                      }}
                    >
                      <BlockieAvatar address={checkSumAddress!} size={26} ensImage={account.ensAvatar} />
                      <span className="text-sm font-bold text-base-content">{checkSumAddress?.slice(-4)}</span>
                      <ChevronDownIcon className="h-4 w-4 text-base-content/50" />
                    </summary>
                    <ul className="dropdown-content menu z-50 p-2 mt-2 shadow-xl bg-base-100 rounded-2xl border border-base-300 gap-1 min-w-[200px]">
                      <NetworkOptions hidden={!selectingNetwork} />
                      <li className={selectingNetwork ? "hidden" : ""}>
                        <div
                          className="h-8 btn-sm rounded-xl flex gap-3 py-3 cursor-pointer text-base-content"
                          onClick={() => copyAddressToClipboard(checkSumAddress!)}
                        >
                          {isAddressCopiedToClipboard ? (
                            <>
                              <CheckCircleIcon className="h-5 w-4 text-success" aria-hidden="true" />
                              <span className="whitespace-nowrap">Copied!</span>
                            </>
                          ) : (
                            <>
                              <DocumentDuplicateIcon className="h-5 w-4" aria-hidden="true" />
                              <span className="whitespace-nowrap">Copy address</span>
                            </>
                          )}
                        </div>
                      </li>
                      <li className={selectingNetwork ? "hidden" : ""}>
                        <label
                          htmlFor="qrcode-modal"
                          className="h-8 btn-sm rounded-xl flex gap-3 py-3 text-base-content"
                        >
                          <QrCodeIcon className="h-5 w-4" />
                          <span className="whitespace-nowrap">View QR Code</span>
                        </label>
                      </li>
                      <li className={selectingNetwork ? "hidden" : ""}>
                        <button className="h-8 btn-sm rounded-xl flex gap-3 py-3 text-base-content" type="button">
                          <ArrowTopRightOnSquareIcon className="h-5 w-4" />
                          <a
                            target="_blank"
                            href={blockExplorerAddressLink}
                            rel="noopener noreferrer"
                            className="whitespace-nowrap"
                          >
                            View on Block Explorer
                          </a>
                        </button>
                      </li>
                      {allowedNetworks.length > 1 ? (
                        <li className={selectingNetwork ? "hidden" : ""}>
                          <button
                            className="h-8 btn-sm rounded-xl flex gap-3 py-3 text-base-content"
                            type="button"
                            onClick={() => setSelectingNetwork(true)}
                          >
                            <ArrowsRightLeftIcon className="h-5 w-4" />
                            <span>Switch Network</span>
                          </button>
                        </li>
                      ) : null}
                      {connector?.id === BURNER_WALLET_ID ? (
                        <li>
                          <label
                            htmlFor="reveal-burner-pk-modal"
                            className="h-8 btn-sm rounded-xl flex gap-3 py-3 text-error"
                          >
                            <EyeIcon className="h-5 w-4" />
                            <span>Reveal Private Key</span>
                          </label>
                        </li>
                      ) : null}
                      <li className={selectingNetwork ? "hidden" : ""}>
                        <button
                          className="menu-item text-error h-8 btn-sm rounded-xl flex gap-3 py-3"
                          type="button"
                          onClick={() => disconnect()}
                        >
                          <ArrowLeftOnRectangleIcon className="h-5 w-4" />
                          <span>Disconnect</span>
                        </button>
                      </li>
                    </ul>
                  </details>
                  <AddressQRCodeModal address={checkSumAddress!} modalId="qrcode-modal" />
                  <RevealBurnerPKModal />
                </div>
              )}
            </div>
          </nav>
        );
      }}
    </ConnectButton.Custom>
  );
};
