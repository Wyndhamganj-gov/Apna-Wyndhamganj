/**
 * Security Rule Verification Suite — WDM (Wyndhamganj Wale)
 * Documents the 12 adversarial "Dirty Dozen" assertions expected to return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOW';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated read on complaints',
    collectionPath: '/complaints/comp_1',
    operation: 'get',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-user PII read on users/{victimUid}',
    collectionPath: '/users/victim_uid',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow field injection (isAdmin: true) on user profile',
    collectionPath: '/users/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker_uid', name: 'Attacker', mobileNumber: '9876543210', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Invalid Indian mobile number format on user registration',
    collectionPath: '/users/u_1',
    operation: 'create',
    auth: { uid: 'u_1', email: 'u1@example.com', email_verified: true },
    payload: { uid: 'u_1', name: 'Test User', mobileNumber: '12345', area: 'Wyndhamganj Bazar' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity spoofing setting authorId to another user on complaint',
    collectionPath: '/complaints/comp_spoof',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: { id: 'comp_spoof', authorId: 'victim_uid', status: 'submitted' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Desynchronized supporterCount jump without atomic supporter doc',
    collectionPath: '/complaints/comp_1',
    operation: 'update',
    auth: { uid: 'u_2', email: 'u2@example.com', email_verified: true },
    payload: { supporterCount: 999 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Mutating terminal resolved complaint as non-admin',
    collectionPath: '/complaints/comp_resolved',
    operation: 'update',
    auth: { uid: 'author_1', email: 'author@example.com', email_verified: true },
    payload: { title: 'Tampered after resolution' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Creator self-verification bypass',
    collectionPath: '/creators/cr_1',
    operation: 'create',
    auth: { uid: 'u_1', email: 'u1@example.com', email_verified: true },
    payload: { id: 'cr_1', ownerId: 'u_1', verified: true, approvalStatus: 'approved' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Third-party read on private direct chat room message',
    collectionPath: '/chats/dm_a_b/messages/msg_1',
    operation: 'get',
    auth: { uid: 'outsider_c', email: 'c@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID poisoning with invalid characters on listings',
    collectionPath: '/listings/bad$$$id with spaces',
    operation: 'create',
    auth: { uid: 'u_1', email: 'u1@example.com', email_verified: true },
    payload: { id: 'bad$$$id with spaces', ownerId: 'u_1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Backdated client timestamp forgery on complaint create',
    collectionPath: '/complaints/comp_backdate',
    operation: 'create',
    auth: { uid: 'u_1', email: 'u1@example.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unverified email spoofing admin account',
    collectionPath: '/app_config/main',
    operation: 'update',
    auth: { uid: 'spoof_uid', email: 'paswanvive@gmail.com', email_verified: false },
    payload: { latestVersion: '9.9.9' },
    expected: 'PERMISSION_DENIED',
  },
];
