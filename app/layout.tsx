import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CFTC持仓动向",
  description:
    "CFTC 官方持仓动向移动端分析工具，公开查看持仓与历史趋势，专业版提供深度解读。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "CFTC持仓动向",
    description: "CFTC 官方持仓动向移动端分析工具",
  },
  twitter: {
    card: "summary",
    title: "CFTC持仓动向",
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
