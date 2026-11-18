import { PWAInstallButton } from "@/components/PWAInstallButton";

type WelcomeScreenProps = {
  onEnter: () => void;
};

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#fefefe] text-[#1a221d] flex flex-col justify-between overflow-x-hidden"
    >
      <main className="relative flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-8 pt-6 pb-8 sm:pt-8 sm:pb-10 flex flex-col justify-between">
        {/* Top Header Lockup: Centered Title directly above Banner + Vertical Separator & Emblem on Left */}
        <header className="w-full pb-4 sm:pb-5 border-b border-[#b9c5bd]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            <div aria-hidden="true" />

            <h1 className="text-center whitespace-nowrap text-[1.35rem] sm:text-[2.15rem] md:text-[2.75rem] font-black tracking-tight text-[#063116] leading-tight">
              منصة إعداد المقايسات
            </h1>

            <div className="flex items-center justify-end gap-2 sm:gap-3 md:gap-4 shrink-0">
              <span
                aria-hidden="true"
                className="h-10 sm:h-16 md:h-20 w-[1.5px] bg-[#95a49a]"
              />
              <img
                src={`${baseUrl}assets/poster-logo.png`}
                alt="شعار منصة إعداد المقايسات"
                className="w-11 sm:w-20 md:w-28 h-auto object-contain select-none"
              />
            </div>
          </div>
        </header>

        {/* Banner Pill & Description */}
        <section className="pt-5 sm:pt-6 text-center">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2.5 sm:gap-3 rounded-full bg-[#063116] px-6 sm:px-8 py-2 sm:py-2.5 text-white shadow-xs">
              <span className="text-base sm:text-[1.35rem] font-extrabold tracking-tight">
                أداة مجانية لخدمة المهندسين
              </span>
              {/* Outline Hard Hat Icon */}
              <svg
                aria-hidden="true"
                viewBox="0 0 36 28"
                className="w-6 h-5 sm:w-8 sm:h-6 shrink-0 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 19 C5 11, 10.5 6, 18 6 C25.5 6, 31 11, 31 19" />
                <path d="M14.5 6.5 V3.5 H21.5 V6.5" />
                <path d="M14.5 6.5 V18.5 M21.5 6.5 V18.5" />
                <path d="M2 19.5 H34 C34 22.5, 32 23.5, 29 23.5 H7 C4 23.5, 2 22.5, 2 19.5 Z" />
              </svg>
            </div>
          </div>

          <p className="mt-4 sm:mt-5 text-[1.05rem] sm:text-[1.45rem] font-semibold leading-[1.65] text-[#1e2621]">
            أداة متخصصة لتسهيل وتسريع إعداد المقايسات التقديرية،
            <br className="hidden sm:inline" />{" "}
            استنادًا إلى قائمة أسعار هيئة الأبنية التعليمية لعام{" "}
            <span className="font-black text-[#063116] tabular-nums">2026</span>.
          </p>
        </section>

        {/* Ornamental Dome Divider */}
        <div className="my-4 sm:my-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#a3b1a8]" />
          <svg
            aria-hidden="true"
            viewBox="0 0 40 36"
            className="w-8 h-8 sm:w-9 sm:h-9 text-[#063116] shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 3 V6" />
            <path d="M11 22 C11 14, 15 9.5, 20 6.5 C25 9.5, 29 14, 29 22" />
            <path d="M8 22 H32" />
            <path d="M9 22 V31 H31 V22" />
          </svg>
          <div className="h-px flex-1 bg-[#a3b1a8]" />
        </div>

        {/* Lower Dedication Section with Anchored Bottom-Left Blueprint & Helmet */}
        <section className="relative flex-1 flex flex-col justify-center py-4 sm:py-6 border-b border-[#b9c5bd] min-h-[270px] sm:min-h-[340px]">
          <img
            src={`${baseUrl}assets/poster-blueprint.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute bottom-0 left-0 w-28 sm:w-44 md:w-52 h-auto object-contain opacity-30 sm:opacity-95 mix-blend-multiply"
          />

          <div className="relative z-10 text-center space-y-1.5 sm:space-y-2 px-2">
            <h2 className="text-xl sm:text-[1.95rem] font-black text-[#063116] leading-snug">
              أعدّ هذا العمل ابتغاء وجه الله،
            </h2>
            <p className="text-base sm:text-[1.45rem] font-semibold text-[#232b26]">
              وأسأل الله أن ينفع به كل من يستخدمه.
            </p>

            <div className="pt-3 sm:pt-4">
              <div className="text-xl sm:text-[1.85rem] font-black text-[#18201b]">
                م. محمود قوتلي
              </div>
              <div className="text-sm sm:text-lg font-medium text-[#6f7772] mt-0.5">
                مهندس أول – مؤسسة مصر الخير
              </div>
            </div>

            <p className="pt-2.5 sm:pt-3 text-lg sm:text-[1.4rem] font-extrabold text-[#063116]">
              لا تنسونا ووالدينا من صالح دعائكم 🤲
            </p>
          </div>
        </section>

        {/* Bottom Actions: PWA Install Button Directly Above Enter Button */}
        <footer className="pt-5 sm:pt-6 w-full max-w-[640px] mx-auto space-y-3">
          <PWAInstallButton variant="welcome" />

          <button
            type="button"
            onClick={onEnter}
            className="w-full inline-flex items-center justify-center gap-3.5 rounded-full bg-[#063116] hover:bg-[#042410] active:scale-[0.99] text-white font-black text-xl sm:text-[1.75rem] py-3.5 sm:py-4 px-8 transition-all cursor-pointer shadow-sm"
          >
            <span>الدخول إلى المنصة</span>
            {/* Door & Arrow Enter Icon matching poster */}
            <svg
              aria-hidden="true"
              viewBox="0 0 32 32"
              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9 V7 C12 5.5, 13 4.5, 14.5 4.5 H23.5 C25 4.5, 26 5.5, 26 7 V25 C26 26.5, 25 27.5, 23.5 27.5 H14.5 C13 27.5, 12 26.5, 12 25 V23" />
              <path d="M5 16 H20" />
              <path d="M15.5 11.5 L20 16 L15.5 20.5" />
            </svg>
          </button>
        </footer>
      </main>
    </div>
  );
}
