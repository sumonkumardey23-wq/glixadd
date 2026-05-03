# Security Specification - EarnRewards

## 1. Data Invariants
- A user cannot have an initial balance other than 0.
- `adsWatchedToday` cannot be increased by more than 1 in a single update.
- `balance` can only increase by exactly 0.10 BDT per ad watch.
- Only admins can approve or reject withdrawal requests.
- Users can only request withdrawals if they have at least 200 BDT and enough balance in their account.
- Users cannot change their own `isAdmin` or `isBanned` status.

## 2. Dirty Dozen Payloads (Targeting Vulnerabilities)
1. **The God Update**: User tries to set `isAdmin: true` on their own profile.
2. **The Inflation Injection**: User tries to add 1000 BDT to balance in a single update.
3. **The Multi-Device Spoof**: User tries to reset `adsWatchedToday` without a 24h gap (needs more logic).
4. **The Shadow Withdrawal**: User tries to create a withdrawal with `status: 'approved'`.
5. **The Empty Wallet Theft**: User tries to withdraw 500 BDT when they only have 10 BDT.
6. **The Negative Balance**: User tries to set balance to -100.
7. **The PII Scraper**: Anonymous user tries to list all users in the `/users` collection.
8. **The ID Poisoning**: Attacker sends a 2MB string as a `userId`.
9. **The Timestamp Time-Travel**: User tries to set `createdAt` to a date in the past.
10. **The Admin Impersonation**: User tries to read global config settings without being logged in.
11. **The Double Spend**: User tries to submit two withdrawal requests that exceed their total balance (harder to catch on client, but rules should help).
12. **The Banned Access**: A user marked `isBanned: true` tries to watch an ad and increase balance.

## 3. Test Runner (Mock Tests)
I will implement these checks in the `firestore.rules`.
