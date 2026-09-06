export default function manifest() {
  return {
    name: "ARTISAN | Original Art & Custom Commissions",
    short_name: "ARTISAN",
    description:
      "Shop original paintings, sculpture, and photography from independent artists, or commission a custom piece made for your space.",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f9f7",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
