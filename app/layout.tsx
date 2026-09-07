import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사업계획서 자동작성 | 정부지원사업 AI 작성 도우미",
  description:
    "공고문을 업로드하면 평가기준에 맞는 사업계획서 초안을 자동으로 생성합니다. 예비창업패키지, 초기창업패키지, TIPS 등 지원.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
