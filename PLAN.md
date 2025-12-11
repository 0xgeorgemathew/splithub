Plan: Single-Tap POS Terminal for Credit Operations
Problem Statement
Current flow requires two NFC taps for every credit operation:
TAP 1: Sign dummy message → extract chip address → lookup wallet owner → fetch nonce
TAP 2: Sign real transaction with correct owner address and nonce
This creates friction for a public POS terminal experience.
Root Cause
The signed message requires the owner's wallet address, but the chip doesn't know it:
// Current - requires owner address upfront
struct CreditPurchase {
address buyer; // ← Must know this before signing
uint256 usdcAmount;
uint256 nonce;
uint256 deadline;
}
Solution: Chip-Centric Signatures + Signature-Based Replay Protection
Two changes:
Remove owner address from signed message (contract looks it up)
Replace nonce with signature hash tracking (eliminates need to know chip address beforehand)
// New - no owner address, no nonce
struct CreditPurchase {
uint256 usdcAmount;
uint256 deadline;
}
Why remove nonce?
Nonce requires knowing chip address BEFORE signing
Public POS terminal doesn't know chip address until user taps
Chicken-and-egg: need chip to fetch nonce, need nonce to create valid signature
Single-tap flow:
User enters amount on POS terminal
Terminal creates message: { usdcAmount, deadline }
User taps chip → signs message → returns signature + chip address
Terminal submits to relayer
Contract: recovers chip → looks up owner → checks signature not used → executes
Security maintained:
Replay protection via signature hash tracking (usedSignatures[sigHash] = true)
Deadline expiry prevents indefinite signature validity
Chip ownership verified in contract via registry lookup
Relayer cannot forge signatures
Files to Modify

1. Contract: packages/foundry/contracts/CreditToken.sol
   Replace structs (remove address and nonce fields):
   struct CreditPurchase {
   uint256 usdcAmount;
   uint256 deadline;
   }

struct CreditSpend {
uint256 amount;
uint256 activityId;
uint256 deadline;
}
Update typehashes:
bytes32 public constant CREDIT_PURCHASE_TYPEHASH =
keccak256("CreditPurchase(uint256 usdcAmount,uint256 deadline)");

bytes32 public constant CREDIT_SPEND_TYPEHASH =
keccak256("CreditSpend(uint256 amount,uint256 activityId,uint256 deadline)");
Replace nonce mapping with signature tracking:
// Remove: mapping(address user => uint256 nonce) public nonces;
// Add:
mapping(bytes32 => bool) public usedSignatures;

error SignatureAlreadyUsed();
Update purchaseCredits:
function purchaseCredits(CreditPurchase calldata purchase, bytes calldata signature) external {
// 1. Check deadline
if (block.timestamp > purchase.deadline) revert ExpiredSignature();

    // 2. Check signature not already used (replay protection)
    bytes32 sigHash = keccak256(signature);
    if (usedSignatures[sigHash]) revert SignatureAlreadyUsed();
    usedSignatures[sigHash] = true;

    // 3. Recover chip address from signature
    bytes32 structHash = keccak256(
        abi.encode(CREDIT_PURCHASE_TYPEHASH, purchase.usdcAmount, purchase.deadline)
    );
    bytes32 digest = _hashTypedDataV4(structHash);
    address chip = digest.recover(signature);

    // 4. Look up owner from registry
    address owner = registry.ownerOf(chip);
    if (owner == address(0)) revert UnauthorizedSigner();

    // 5. Transfer USDC from owner, mint credits to owner
    usdc.safeTransferFrom(owner, address(this), purchase.usdcAmount);
    uint256 creditAmount = (purchase.usdcAmount * CREDIT_RATE * 1e18) / 1e6;
    _mint(owner, creditAmount);

    emit CreditsPurchased(owner, purchase.usdcAmount, creditAmount, chip);

}
Update spendCredits:
function spendCredits(CreditSpend calldata spend, bytes calldata signature) external {
// 1. Check deadline
if (block.timestamp > spend.deadline) revert ExpiredSignature();

    // 2. Check signature not already used (replay protection)
    bytes32 sigHash = keccak256(signature);
    if (usedSignatures[sigHash]) revert SignatureAlreadyUsed();
    usedSignatures[sigHash] = true;

    // 3. Recover chip address from signature
    bytes32 structHash = keccak256(
        abi.encode(CREDIT_SPEND_TYPEHASH, spend.amount, spend.activityId, spend.deadline)
    );
    bytes32 digest = _hashTypedDataV4(structHash);
    address chip = digest.recover(signature);

    // 4. Look up owner from registry
    address owner = registry.ownerOf(chip);
    if (owner == address(0)) revert UnauthorizedSigner();

    // 5. Burn credits from owner
    if (balanceOf(owner) < spend.amount) revert InsufficientBalance();
    _burn(owner, spend.amount);

    emit CreditsSpent(owner, spend.amount, spend.activityId, chip);

}
Update helper functions (remove nonce-related):
// Remove getNonce() - no longer needed

function getPurchaseDigest(CreditPurchase calldata purchase) external view returns (bytes32) {
bytes32 structHash = keccak256(
abi.encode(CREDIT_PURCHASE_TYPEHASH, purchase.usdcAmount, purchase.deadline)
);
return \_hashTypedDataV4(structHash);
}

function getSpendDigest(CreditSpend calldata spend) external view returns (bytes32) {
bytes32 structHash = keccak256(
abi.encode(CREDIT_SPEND_TYPEHASH, spend.amount, spend.activityId, spend.deadline)
);
return \_hashTypedDataV4(structHash);
}

// Helper to check if a signature has been used
function isSignatureUsed(bytes calldata signature) external view returns (bool) {
return usedSignatures[keccak256(signature)];
} 2. API Routes
packages/nextjs/app/api/relay/credit-purchase/route.ts
Update request body: { purchase: { usdcAmount, deadline }, signature }
Remove buyer field handling
Contract call unchanged
packages/nextjs/app/api/relay/credit-spend/route.ts
Update request body: { spend: { amount, activityId, deadline }, signature }
Remove spender field handling 3. Frontend Hooks
packages/nextjs/hooks/credits/useCreditPurchase.ts
Remove TAP 1 entirely (dummy signature for chip detection)
Remove owner/nonce lookup between taps
Single tap signs { usdcAmount, deadline }
Flow: select amount → tap → submit → done
packages/nextjs/hooks/credits/useCreditSpend.ts
Same simplification
Single tap signs { amount, activityId, deadline } 4. EIP-712 Types Update
Update typed data definitions in hooks:
// Before
const types = {
CreditPurchase: [
{ name: 'buyer', type: 'address' },
{ name: 'usdcAmount', type: 'uint256' },
{ name: 'nonce', type: 'uint256' },
{ name: 'deadline', type: 'uint256' },
],
};

// After
const types = {
CreditPurchase: [
{ name: 'usdcAmount', type: 'uint256' },
{ name: 'deadline', type: 'uint256' },
],
};
Gas Considerations
Signature tracking vs nonces:
Nonce: ~5,000 gas (SSTORE from non-zero to non-zero)
Signature hash: ~20,000 gas first time (SSTORE from zero to non-zero)
Trade-off accepted: Higher gas cost per transaction in exchange for single-tap UX.
Implementation Steps
Update CreditToken.sol - new structs, signature tracking, updated functions
Update API routes - remove buyer/spender from request bodies
Simplify frontend hooks - single tap flow, no nonce fetching
