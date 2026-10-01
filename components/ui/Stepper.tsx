import { Check } from "lucide-react";

const STEPS = ["공고 업로드", "정보 입력", "초안 완성"];

export default function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto mb-8 flex max-w-md items-center justify-between" aria-label="진행 단계">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none" aria-current={active ? "step" : undefined}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className={`text-xs ${active ? "font-semibold text-blue-700" : "text-gray-500"}`}>{label}</span>
            </div>
            {n < STEPS.length && <div className={`mx-2 mb-5 h-0.5 flex-1 ${done ? "bg-green-400" : "bg-gray-200"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
