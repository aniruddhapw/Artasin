# SEO for artasin.in

How the site is set up for search, what to write next, how to measure it, and
what still has to be done by hand. The code side lives in `lib/seo.ts`,
`app/sitemap.ts`, `app/robots.ts` and each page's `metadata` /
`generateMetadata`.

## Positioning

- **Category:** ARTASIN Online Art Gallery: original art by Indian artists,
  bought straight from the artist, or commissioned.
- **Differentiator:** the 3D virtual art gallery at `/gallery/walk`.
- **Keyword hierarchy:** "online art gallery" leads (home page); "virtual art
  gallery" / "3D art gallery" go to `/gallery/walk`; commercial terms ("buy
  original paintings online", "original paintings by Indian artists") go to
  the category pages (`/gallery?category=Painting`) and artwork pages.

A note on the evidence: the starting comparison was a 3-month, worldwide
Google Trends view (online art gallery 16, virtual art museum 4, 3D art
gallery 2, virtual art gallery 1, virtual art exhibition 1). Those are
relative scores, not search volumes, and three months is a short window.
Treat the hierarchy as a starting hypothesis and check it against Search
Console queries once there are a few weeks of data.

## What is in place

| Page | Title | Notes |
|---|---|---|
| `/` | Online Art Gallery to Discover Original Indian Art \| ARTASIN | Links to every category, the 3D gallery, artists |
| `/gallery` | The Collection: Original Art by Indian Artists | Searches (`?q=`) are `noindex` |
| `/gallery?category=Painting` (each category with work for sale) | Original Paintings by Indian Artists | Indexable, in the sitemap; styles point their canonical here |
| `/gallery/walk` | Virtual Art Gallery – Explore Original Art in 3D | H1 "Step Inside Our Virtual Art Gallery" and a list of every painting, in HTML below the 3D view |
| `/gallery/walk?at=<slug>` | `<title>` by `<artist>` — 3D gallery | Canonical `/gallery/walk`; preview card shows the painting |
| `/artwork/<slug>` | `<title>` by `<artist>` – Original `<category>` | Product, BreadcrumbList; visible breadcrumbs |
| `/artist/<slug>` | `<name>` – `<discipline>`, `<location>` | Person, BreadcrumbList; unverified artists `noindex` |
| `/blog/<slug>` | `<post title>` | BlogPosting, BreadcrumbList |
| `/artists`, `/blog`, `/requests`, `/about`, `/privacy`, `/terms` | Own title and description | |
| Sign-in, sign-up, password reset, phone verification, cart, checkout, account, orders, commissions | | `noindex, follow` |

Every page gets an absolute canonical, Open Graph and X cards that match its
own title (Next.js does not carry a page's title into a parent's cards), and
the hall picture (`public/og/gallery-walk.jpg`) when it has no image of its
own. The whole site carries WebSite (with site search) and Organization (with
the social profiles) data.

Structured data only states what the page shows: real price and currency,
"in stock" or "sold out" from the listing's status, the 7-day return window
from `lib/policies.ts`, and a rating only when buyers have left reviews.
There is no Product markup on the 3D gallery; it is an ItemList of the
paintings in it.

`sitemap.xml` lists the public pages, the category pages with work for sale,
published artwork (with its first photo), verified artists and published
posts. `robots.txt` keeps crawlers out of the API, studio, admin, account,
orders, commissions and checkout. `www.artasin.in` redirects to
`artasin.in`.

## Content plan

Write these as Journal posts (an admin's posts publish directly). They should
be genuinely useful; a post written only to hold keywords will not rank, and
reads badly to the people who do find it. Two already exist in some form, so
improve those rather than writing duplicates.

### 1. Online Art Gallery: Discover Original Art by Indian Artists (pillar page)
- **Intent:** browsing, "where can I find original Indian art online".
- **Keywords:** online art gallery; original Indian art, Indian artists online.
- **Title / H1:** "ARTASIN Online Art Gallery: Original Art by Indian Artists".
- **Outline:** what "original" means here (one of a kind, from the artist);
  the mediums and where to browse each; how the 3D gallery works; buying
  (price, delivery, returns); commissioning.
- **Links:** each category page, `/gallery/walk`, `/artists`, `/requests`.
- **Action:** browse a category.
- **Note:** much of this is what the home page says. Do it only if a longer
  guide adds something; otherwise strengthen the home page instead.

### 2. What Is a Virtual Art Gallery?
- **Intent:** informational.
- **Keywords:** virtual art gallery, 3D art gallery, virtual art exhibition.
- **Title / H1:** "What Is a Virtual Art Gallery, and How Do You Visit One?"
- **Outline:** what it is; how it differs from a photo grid; what you can do
  in ARTASIN's (walk, visit paintings, the helper, the custom-orders desk);
  phone vs computer; links to share a painting.
- **Links:** `/gallery/walk`, a couple of paintings with `?at=` links.
- **Action:** walk the gallery.

### 3. How Artists Can Showcase Their Work in a Virtual Art Gallery
- **Exists:** `/blog/artasin-3d-virtual-gallery-a-new-way-for-artists-to-showcase-art`.
  Update it rather than writing a second one.
- **Intent:** artists looking for somewhere to show and sell.
- **Keywords:** virtual gallery for artists, showcase art online, online art
  exhibition for artists.
- **Add:** how a listed painting gets hung automatically; the share link to
  your own painting in the gallery; what it costs (commission rate, from the
  terms); how to sign up.
- **Links:** `/signup?role=artist`, `/gallery/walk`, the terms.
- **Action:** create an artist account.

### 4. Virtual Art Gallery vs. Traditional Art Gallery
- **Intent:** comparison; lower priority.
- **Outline:** reach and opening hours; seeing scale and detail (3D view plus
  the full-resolution artwork page); buying and delivery; what a physical visit
  still does better. Be honest about the last point.
- **Action:** walk the gallery.

### 5. How to Buy Original Indian Paintings Online
- **Intent:** commercial, high value.
- **Keywords:** buy original Indian art online, buy paintings online,
  original paintings by Indian artists.
- **Title / H1:** "How to Buy Original Indian Paintings Online".
- **Outline:** checking originality (signed, one of a kind, certificate where
  the listing says so); reading size and medium; price and what it includes;
  delivery (14 days in India) and returns (7 days); commissioning instead.
- **Links:** `/gallery?category=Painting`, `/terms#delivery-returns`, `/requests`.
- **Action:** browse paintings.
- **Related:** `/blog/how-to-request-custom-artwork-a-guide-to-bringing-your-vision-to-life`
  covers commissioning; link to it, don't repeat it.

### 6. Discovering Contemporary Indian Artists and Their Artwork
- **Intent:** discovery.
- **Outline:** a short, factual feature on a few ARTASIN artists, written
  from their own bios and with their permission. Do not invent background,
  awards or quotes.
- **Links:** each artist's page and two or three of their works.
- **Action:** follow an artist / view their work.

**Priority:** 5, then 2, then the update to 3, then 6, then 4. Write 1 only
if the home page can't carry it.

## Measuring it

No analytics is installed (checked in October 2026). Before adding any:
Google Analytics sets cookies, which would need a consent banner (the site
currently only uses essential cookies). Vercel Web Analytics is cookieless
and can be turned on in the Vercel dashboard without one.

Worth tracking once something is in place (no personal data needed):
gallery page visits, entering the 3D view (first move), painting visits,
"View artwork" clicks from the gallery, share clicks, custom-order desk
visits and commission requests, add-to-cart and orders.

In Search Console, watch: impressions and clicks for the gallery, category and
artwork pages; queries containing "online art gallery", "virtual art
gallery", "3D", "Indian"; click-through rate on pages with impressions but
few clicks (rewrite those titles); Pages report (indexed vs excluded, and
why); sitemap status; Enhancements (Product snippets, breadcrumbs).

Expect weeks before new titles and pages show in results. Nothing here
guarantees a ranking.

## Manual steps

1. **Search Console:** add `artasin.in` as a Domain property (verify by DNS
   TXT record at the domain registrar), then submit
   `https://artasin.in/sitemap.xml`.
2. **Rich results:** test an artwork page, an artist page and a post at
   https://search.google.com/test/rich-results once this is live.
3. **Demo accounts on production:** the sitemap lists the seed artist
   `elena-rossi` (and the seed buyer and admin accounts exist). Remove or
   unpublish them, or they will be indexed as real artists.
4. **Vercel:** optionally make `artasin.in` the primary domain with `www` as
   a redirect there too (the app already redirects `www`).
5. **Bing Webmaster Tools:** import the Search Console property.

## Next 30 days

- [ ] Week 1: merge, deploy, verify Search Console, submit the sitemap, run the
      rich results test, remove the demo accounts.
- [ ] Week 1: decide on analytics (Vercel Web Analytics, or GA4 with consent).
- [ ] Week 2: publish article 5 (buying guide) and update article 3.
- [ ] Week 2: ask every artist to fill in their bio and location; thin
      profiles make thin pages.
- [ ] Week 3: publish article 2; share painting links (`?at=`) on Instagram
      and WhatsApp.
- [ ] Week 4: in Search Console, find pages with impressions and low CTR and
      rewrite their titles; check the Pages report for excluded URLs.
- [ ] Week 4: re-record the home page video with the new gallery lighting.
