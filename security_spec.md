# Security Specification for Sotoy Film

## 1. Data Invariants
- **User Role Modification**: Users cannot modify their own roles. Roles must only be modifiable by Admins or trusted backend operations.
- **Ownership Invariance**: Articles, Buzz posts, and Ratings are owned by their respective creators. No user can edit or delete someone else's content.
- **Veracity**: All content creations require authentication.
- **Temporal integrity**: Timestamps like `createdAt` and `updatedAt` must match `request.time`.
- **Validation**: All strings must be within strict length boundaries.

## 2. The "Dirty Dozen" Payloads
These payloads represent malicious attempts to bypass identity, integrity, and state validations.

1. **Self-Elevating Role**: A normal user tries to update their profile to have `role: "admin"`.
2. **Ghost Field Injection**: Creating a User record with a high-privilege `isAdmin: true` attribute.
3. **Spoofed Author ID on Article**: Submitting an article where the `author.id` in the body is different from the logged-in user.
4. **Spoofed Rating ID**: Submitting a rating under another user's `userId`.
5. **Rating Overwrite Attack**: Normal user attempting to delete another user's film review.
6. **Negative Votes / Fake Likes**: Directly modifying the `likes` field of a buzz post by incrementing it by 100 on the client.
7. **Junk Character ID Attack**: Injecting a extremely long string full of symbols for a `buzzId`.
8. **Malicious Buzz Post Payload**: Sending a Buzz Post with missing `content`.
9. **Bypassing Submission Status**: Submitting a Critic Submission with a pre-set status of `approved`.
10. **Malicious Film creation**: Regular user attempts to write a new film item to the `/films` collection.
11. **Impersonated Critic Submission Update**: Regular user attempts to approve their own critic submission.
12. **Malicious Article Overwrite**: Attempting to edit someone else's published article.

## 3. The Test Runner (`firestore.rules.test.ts`)
This test suite validates that all malicious payloads return `PERMISSION_DENIED`.

```typescript
// Test suite logic validating default deny rules
describe("Firestore Security Rules", () => {
  it("denies self role elevation", () => {
    // Assert write to /users/user_123 with role: admin is denied
  });
  it("denies spoofed author ID on articles", () => {
    // Assert write to /articles/art_1 with spoofed author is denied
  });
  it("denies unauthorized modification of likes", () => {
    // Assert modifying arbitrary fields in buzz posts is denied
  });
});
```
