# WDM — Wyndhamganj Wale Security Specification

## 1. Data Invariants
1. **Strict Authentication Gate**: Zero anonymous reads or writes across all collections. Every write requires `request.auth != null && request.auth.token.email_verified == true`.
2. **PII Isolation (`users/{userId}`)**: `mobileNumber`, `deviceInfo`, and profile data are strictly readable/writable ONLY by `request.auth.uid == userId` or verified admin. No non-admin `list` access.
3. **Anti-Self-Verification (`creators/{creatorId}`)**: Non-admin users submitting a creator profile MUST have `verified == false` and `ownerId == request.auth.uid`.
4. **Atomic Complaint Support (`complaints/{complaintId}` & `/supporters/{supporterId}`)**: Incrementing `supporterCount` by +1 requires creating `/supporters/{request.auth.uid}` in the same atomic batch (`existsAfter`), and decrementing by -1 requires deleting it (`!existsAfter`). Terminal state `status == 'resolved'` locks non-admin edits.
5. **Master Gate on Chat Messages (`chats/{roomId}/messages/{messageId}`)**: Parent room `/chats/{roomId}` must exist, and access is granted only if `room.type == 'public'` OR `request.auth.uid in room.participantIds`.
6. **Temporal Integrity**: `createdAt == request.time` on create and `updatedAt == request.time` on update, with `createdAt` immutable after creation.
7. **Resource Poisoning Protection**: Every document ID validated with `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`), every string size-bounded, every array size-bounded.
8. **Secure List Queries**: Every `allow list` rule explicitly evaluates `resource.data` (`visibility == 'public'` or participant/owner check) without `get()` calls inside list rules.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read** on `/complaints/c1` -> `PERMISSION_DENIED`
2. **PII Leak (Cross-User Read)** on `/users/victim_uid` by `attacker_uid` -> `PERMISSION_DENIED`
3. **Shadow Field Injection** on `/users/attacker_uid` adding `isAdmin: true` -> `PERMISSION_DENIED`
4. **Invalid Mobile Number Format** on `/users/u1` with `mobileNumber: "12345"` -> `PERMISSION_DENIED`
5. **Identity Spoofing on Complaint Create** setting `authorId: "other_user"` -> `PERMISSION_DENIED`
6. **Desynchronized Upvote Inflation** updating `complaints/c1` `supporterCount: 999` without atomic supporter subdoc -> `PERMISSION_DENIED`
7. **Terminal State Mutation** updating a `status: "resolved"` complaint as non-admin -> `PERMISSION_DENIED`
8. **Creator Self-Verification** creating `/creators/cr1` with `verified: true` as non-admin -> `PERMISSION_DENIED`
9. **Private Direct Chat Eavesdropping** reading `/chats/dm_a_b/messages/m1` as third user `c` -> `PERMISSION_DENIED`
10. **ID Poisoning** creating `/listings/` with 200-char ID containing `$` and spaces -> `PERMISSION_DENIED`
11. **Backdated Timestamp Forgery** creating `/complaints/c2` with client-supplied past timestamp instead of `request.time` -> `PERMISSION_DENIED`
12. **Unverified Admin Email Spoof** attempting admin write with `email_verified: false` -> `PERMISSION_DENIED`
