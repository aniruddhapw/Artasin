export const navItems = [
  { href: "/", label: "Collections", key: "collections" },
  { href: "/#artists", label: "Artists", key: "artists" },
  { href: "/requests", label: "Requests", key: "requests" },
  { href: "/gallery", label: "Exhibitions", key: "exhibitions" }
];

export const collectionCards = [
  {
    title: "Modern Minimalist",
    count: "42 Artworks",
    image: "/artisan/modern-minimalist.svg",
    href: "/gallery?category=Painting"
  },
  {
    title: "Textured Abstracts",
    count: "28 Artworks",
    image: "/artisan/textured-abstracts.svg",
    href: "/gallery?category=Sculpture"
  }
];

export const artists = [
  {
    name: "Julian Thorne",
    discipline: "Sculpture & Installation",
    image: "/artisan/artist-julian.svg"
  },
  {
    name: "Marcus Vance",
    discipline: "Digital Media",
    image: "/artisan/artist-marcus.svg"
  },
  {
    name: "Sarah Lin",
    discipline: "Oil on Canvas",
    image: "/artisan/artist-sarah.svg"
  }
];

export const mediums = [
  { label: "Paintings", category: "Painting" },
  { label: "Sculptures", category: "Sculpture" },
  { label: "Digital Art", category: "Digital Art" },
  { label: "Photography", category: "Photography" }
];

export const moreWorks = [
  {
    title: "Fading Light",
    price: "$8,200",
    image: "/artisan/fading-light.svg"
  },
  {
    title: "Suspended Motion",
    price: "$10,500",
    image: "/artisan/suspended-motion.svg"
  },
  {
    title: "Whisper",
    price: "$6,800",
    image: "/artisan/whisper.svg"
  }
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

export const pendingRequests = [
  {
    icon: "palette",
    title: "Large Canvas Commission",
    from: "E. Thorne",
    status: "New"
  },
  {
    icon: "image",
    title: "Digital Portrait Series",
    from: "M. Rossi",
    status: "Review"
  },
  {
    icon: "architecture",
    title: "Sculpture Concept",
    from: "S. Chen"
  }
];

export const activeOrders = [
  {
    id: "#8829",
    amount: "$1,200",
    status: "In Transit - Expected Tomorrow",
    active: true
  },
  {
    id: "#8827",
    amount: "$850",
    status: "Processing - Ready to Ship",
    action: "Print Label"
  },
  {
    id: "#8825",
    amount: "$3,400",
    status: "Awaiting Payment Clearing"
  }
];

export const chartBars = [
  { label: "Jan", value: "20%", tooltip: "$1.2k" },
  { label: "Feb", value: "40%", tooltip: "$3.4k" },
  { label: "Mar", value: "70%", tooltip: "$6.8k", active: true },
  { label: "Apr", value: "50%", tooltip: "$4.1k" },
  { label: "May", value: "85%", tooltip: "$8.2k" },
  { label: "Jun", value: "30%", tooltip: "$2.5k" },
  { label: "Jul", value: "60%", tooltip: "$5.5k" }
];
