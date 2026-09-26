export default function manifest() {
  return {
    name: "ARTASIN | Original Art & Custom Commissions",
    short_name: "ARTASIN",
    description:
      "Shop original paintings, sculpture, and photography from independent artists, or commission a custom piece made for your space.",
    start_url: "/",
    display: "standalone",
    background_color: "#edd8b8",
    theme_color: "#122239",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
