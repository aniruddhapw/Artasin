export function VerificationBanner({ verificationStatus }) {
  if (verificationStatus === "APPROVED") {
    return null;
  }

  if (verificationStatus === "REJECTED") {
    return (
      <p className="verification-banner verification-banner-rejected">
        Your studio application was not approved. Listings you create will stay in Draft and
        cannot be published. Contact support if you believe this was a mistake.
      </p>
    );
  }

  return (
    <p className="verification-banner">
      Your studio is pending admin verification. You can create and preview listings, but they
      will stay in Draft until an admin approves your profile.
    </p>
  );
}
