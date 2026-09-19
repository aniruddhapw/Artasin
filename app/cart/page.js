import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { LazyImage } from "@/components/LazyImage";
import { Nav } from "@/components/Nav";
import { RemoveFromCartButton } from "@/components/cart/RemoveFromCartButton";
import { serializeMoney } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getTranslations } from "@/lib/i18n";
import { thumbUrl } from "@/lib/images";

export const metadata = {
  title: "Cart"
};

export default async function CartPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?redirect=/cart");
  }

  const { available, unavailable, subtotalCents } = await getCart(user.id);
  const { t } = await getTranslations();

  // Every piece ships from its own artist, so the cart is grouped the way the
  // orders will be.
  const byArtist = new Map();
  for (const item of available) {
    const artist = item.artwork.artist;
    if (!byArtist.has(artist.id)) {
      byArtist.set(artist.id, { artist, items: [] });
    }
    byArtist.get(artist.id).items.push(item);
  }
  const groups = [...byArtist.values()];

  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header">
          <h1>{t("cart.title")}</h1>
          <p>
            {!available.length
              ? t("cart.empty")
              : available.length === 1
                ? t("cart.itemCountOne")
                : t("cart.itemCount", { count: available.length })}
          </p>
        </header>

        {available.length ? (
          <section className="cart-layout">
            <div className="cart-groups">
              {groups.map((group) => (
                <article className="cart-group" key={group.artist.id}>
                  <div className="cart-group-head">
                    <Link className="text-link" href={`/artist/${group.artist.slug}`}>
                      {group.artist.displayName}
                    </Link>
                    <span className="artist-directory-count">
                      {t("cart.shipsSeparately")}
                    </span>
                  </div>
                  <div className="order-history-list">
                    {group.items.map((item) => (
                      <div className="order-history-row" key={item.id}>
                        <Link className="order-history-image" href={`/artwork/${item.artwork.slug}`}>
                          <LazyImage
                            alt={item.artwork.title}
                            src={thumbUrl(item.artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                          />
                        </Link>
                        <div className="order-history-details">
                          <Link href={`/artwork/${item.artwork.slug}`}>
                            <h3>{item.artwork.title}</h3>
                          </Link>
                          <p>
                            {t(`category.${item.artwork.category}`)} · {item.artwork.medium}
                          </p>
                        </div>
                        <div className="order-history-meta">
                          <strong>{serializeMoney(item.artwork.priceCents, item.artwork.currency).formatted}</strong>
                          <RemoveFromCartButton artworkId={item.artwork.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <aside className="cart-summary">
              <h2>{t("cart.summary")}</h2>
              <dl className="order-confirmation-detail-list">
                <div>
                  <dt>{t("cart.subtotal")}</dt>
                  <dd>{serializeMoney(subtotalCents).formatted}</dd>
                </div>
                <div>
                  <dt>{t("cart.pieces")}</dt>
                  <dd>{available.length}</dd>
                </div>
                <div>
                  <dt>{t("cart.artists")}</dt>
                  <dd>{groups.length}</dd>
                </div>
              </dl>
              <p className="field-hint">{t("cart.shippingNote")}</p>
              <Link className="button button-primary" href="/checkout?fromCart=1">
                {t("cart.checkout")}
              </Link>
              <Link className="text-link cart-continue" href="/gallery">
                {t("cart.continueShopping")}
              </Link>
            </aside>
          </section>
        ) : (
          <p className="empty-state">
            {t("cart.emptyBody")} <Link href="/gallery">{t("cart.browseGallery")}</Link>
          </p>
        )}

        {unavailable.length ? (
          <section className="more-section">
            <div className="section-heading inline-heading">
              <h2>{t("cart.noLongerAvailable")}</h2>
            </div>
            <p className="field-hint">{t("cart.soldNote")}</p>
            <div className="order-history-list">
              {unavailable.map((item) => (
                <div className="order-history-row cart-row-unavailable" key={item.id}>
                  <div className="order-history-image">
                    <LazyImage
                      alt={item.artwork.title}
                      src={thumbUrl(item.artwork.media[0]?.url) || "/artisan/artwork-placeholder.svg"}
                    />
                  </div>
                  <div className="order-history-details">
                    <h3>{item.artwork.title}</h3>
                    <p>{t(`status.${item.artwork.status}`)}</p>
                  </div>
                  <div className="order-history-meta">
                    <RemoveFromCartButton artworkId={item.artwork.id} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer variant="simple" />
    </>
  );
}
