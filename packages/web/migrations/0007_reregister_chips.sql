-- SplitHubRegistry, SplitHubPayments and VenueCredits were redeployed: the registry now requires the owner
-- to send the registration (a chip signature alone could bind a key to someone else's wallet). Chip links and
-- token approvals on the old contracts no longer count, so every user registers their chip and approves again.
UPDATE users SET chip_address = NULL, chip_registration_status = NULL, approval_status = NULL;

-- Venues were registered on the old VenueCredits; owners register them again from the venue page.
UPDATE venues SET chain_venue_id = NULL;
