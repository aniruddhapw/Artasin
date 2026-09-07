export const navItems = [
  { href: "/", label: "Collections", key: "collections" },
  { href: "/artists", label: "Artists", key: "artists" },
  { href: "/requests", label: "Requests", key: "requests" },
  { href: "/gallery", label: "Exhibitions", key: "exhibitions" }
];

export const collectionCards = [
  {
    title: "Modern Minimalist",
    count: "42 Artworks",
    image: "/artisan/modern-minimalist.jpg",
    href: "/gallery?category=Painting"
  },
  {
    title: "Textured Abstracts",
    count: "28 Artworks",
    image: "/artisan/textured-abstracts.jpg",
    href: "/gallery?category=Sculpture"
  }
];

export const mediums = [
  { label: "Paintings", category: "Painting" },
  { label: "Sculptures", category: "Sculpture" },
  { label: "Digital Art", category: "Digital Art" },
  { label: "Photography", category: "Photography" }
];

export const processSteps = [
  {
    title: "Submit Request",
    body:
      "Provide details about your desired piece, including medium, size, and budget. Upload reference images to guide the artist's understanding."
  },
  {
    title: "Artist Review",
    body:
      "Selected artists will review your brief to ensure it aligns with their style and current availability. We typically respond within 3-5 business days."
  },
  {
    title: "Concept & Quote",
    body:
      "Upon acceptance, you will receive a preliminary concept sketch and a formal quote detailing the final price and estimated timeline."
  },
  {
    title: "Creation & Delivery",
    body:
      "Once approved, the artist begins work. You will receive progress updates before the final piece is securely shipped and delivered to your space."
  }
];
