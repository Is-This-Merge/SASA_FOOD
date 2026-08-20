import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SASA FOOD | 급식표와 식단 리뷰",
    short_name: "SASA FOOD",
    description:
      "SASA 급식표와 식단 리뷰를 확인하는 웹앱",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#111827",
    orientation: "portrait",
    lang: "ko",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
