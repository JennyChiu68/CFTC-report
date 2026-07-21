import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CFTC COT持仓分析",
  description:
    "CFTC 官方持仓数据移动端分析工具，公开查看持仓与历史趋势，专业版提供深度解读。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "CFTC COT持仓分析",
    description: "CFTC 官方持仓数据移动端分析工具",
    images: [{ url: "/cftc-social-preview.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CFTC COT持仓分析",
    images: ["/cftc-social-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "self.__VINEXT_RSC_CHUNKS__=self.__VINEXT_RSC_CHUNKS__||[];",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
