import { redirect } from "next/navigation";
import { BecomeArtistForm } from "@/components/account/BecomeArtistForm";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";

export const metadata = {
  title: "Account Settings"
};

const roleLabels = {
  BUYER: "Collector",
  ARTIST: "Artist",
  ADMIN: "Administrator"
};

export default async function AccountPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?redirect=/account");
  }

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Account Settings</h1>
          <p>Your sign-in details and account security.</p>
        </header>

        <section className="account-layout">
          {user.role === "BUYER" && !user.artistProfile ? (
            <BecomeArtistForm defaultName={`${user.firstName} ${user.lastName}`} />
          ) : null}
          <article className="dashboard-card">
            <h2>Your Details</h2>
            <dl className="order-confirmation-detail-list">
              <div>
                <dt>Name</dt>
                <dd>
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Account Type</dt>
                <dd>{roleLabels[user.role] || user.role}</dd>
              </div>
              <div>
                <dt>Sign-In Method</dt>
                <dd>
                  {user.googleId ? "Google" : "Email"}
                  {user.googleId && user.passwordHash ? " and email" : ""}
                </dd>
              </div>
            </dl>
          </article>

          <article className="dashboard-card">
            <h2>{user.passwordHash ? "Change Password" : "Set a Password"}</h2>
            <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
          </article>
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
