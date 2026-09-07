import Link from "next/link";
import { ArrowRight, FileText, Zap, BarChart3, CheckCircle, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* 네비게이션 */}
      <nav className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-600">📋 플랜매직</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Beta</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/upload" className="text-sm text-gray-600 hover:text-gray-900">
              시작하기
            </Link>
            <Link
              href="/upload"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              무료로 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* 히어로 */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm text-blue-700">
            <Zap className="h-3.5 w-3.5" />
            AI 기반 자동 작성
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            정부지원사업 공고문 넣으면
            <br />
            <span className="text-blue-600">사업계획서가 나옵니다</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            평가기준에 맞춰 자동 생성 · 배점별 자가진단 리포트 · HWP/DOCX 출력
            <br />
            예비창업패키지 · 초기창업패키지 · 창업도약패키지 · TIPS 지원
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/upload"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg hover:bg-blue-700"
            >
              공고문 업로드하고 시작하기
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-sm text-gray-500">베타 기간 무료</span>
          </div>
        </div>
      </section>

      {/* 작동 방식 */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-gray-900">
            3단계로 사업계획서 완성
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: <FileText className="h-6 w-6 text-blue-600" />,
                title: "공고문 업로드",
                desc: "PDF 공고문을 올리면 평가기준, 배점, 필수 항목을 자동 추출합니다.",
              },
              {
                step: "02",
                icon: <Clock className="h-6 w-6 text-blue-600" />,
                title: "15가지 질문 답변",
                desc: "팀, 제품, 시장, 재무에 대한 질문에 답변하면 AI가 내용을 학습합니다.",
              },
              {
                step: "03",
                icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
                title: "초안 + 진단 리포트",
                desc: "평가기준에 맞는 초안과 항목별 예상 점수 및 개선 피드백을 제공합니다.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    {item.icon}
                  </div>
                  <span className="text-sm font-bold text-blue-600">STEP {item.step}</span>
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 지원 사업 목록 */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
            지원 가능한 사업 유형
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "예비창업패키지",
              "초기창업패키지",
              "창업도약패키지",
              "TIPS (민간투자주도형)",
              "소상공인 스마트화 지원",
              "지역창업 활성화 (지자체)",
              "중소기업 R&D 과제",
              "수출바우처 사업",
              "기타 K-Startup 공고",
            ].map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm shadow-sm"
              >
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            지금 무료로 시작해보세요
          </h2>
          <p className="mb-8 text-gray-600">
            베타 기간 동안 무료로 제공됩니다. 공고문 PDF 하나면 충분합니다.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            공고문 업로드하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t bg-white px-6 py-8 text-center text-sm text-gray-500">
        <p>© 2026 플랜매직. 본 서비스는 창업자 본인의 입력을 기반으로 초안을 제공합니다.</p>
        <p className="mt-1 text-xs">
          ※ AI가 생성한 초안은 반드시 본인이 검토·수정 후 제출하세요. 대필 서비스가 아닙니다.
        </p>
      </footer>
    </div>
  );
}
