import { redirect } from "next/navigation";
import { BecomeArtistForm } from "@/components/account/BecomeArtistForm";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getAuthUser } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";

export const metadata = {
  title: "Account Settings"
};

const roleLabelKeys = {
  BUYER: "account.roleBuyer",
  ARTIST: "account.roleArtist",
  ADMIN: "account.roleAdmin"
};

export default async function AccountPage() {
  const user = await getAuthUser();
  const { t } = await getTranslations();
  if (!user) {
    redirect("/login?redirect=/account");
  }

  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header">
          <h1>{t("account.title")}</h1>
          <p>{t("account.subtitle")}</p>
        </header>

        <section className="account-layout">
          {user.role === "BUYER" && !user.artistProfile ? (
            <BecomeArtistForm defaultName={`${user.firstName} ${user.lastName}`} />
          ) : null}
          <article className="dashboard-card">
            <h2>{t("account.yourDetails")}</h2>
            <dl className="order-confirmation-detail-list">
              <div>
                <dt>{t("account.name")}</dt>
                <dd>
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              <div>
                <dt>{t("account.email")}</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>{t("account.accountType")}</dt>
                <dd>{roleLabelKeys[user.role] ? t(roleLabelKeys[user.role]) : user.role}</dd>
              </div>
              <div>
                <dt>{t("account.signInMethod")}</dt>
                <dd>
                  {user.googleId ? "Google" : "Email"}
                  {user.googleId && user.passwordHash ? " and email" : ""}
                </dd>
              </div>
            </dl>
          </article>

          <article className="dashboard-card">
            <h2>{user.passwordHash ? t("account.changePassword") : t("account.setAPassword")}</h2>
            <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
          </article>
        </section>
      </main>
      <Footer variant="simple" />
    </>
  );
}
