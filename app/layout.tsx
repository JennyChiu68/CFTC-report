import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "金十 CFTC 持仓情报站｜公开数据免费，钻石解读进阶",
  description:
    "基于 CFTC 官方持仓报告的金十产品升级概念 Demo：免费查看真实持仓，钻石 VIP 获得分位、异动与分歧解读。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
