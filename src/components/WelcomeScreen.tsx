import { PWAInstallButton } from "@/components/PWAInstallButton";

type WelcomeScreenProps = {
  onEnter: () => void;
};

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full overflow-x-hidden bg-[#fbfdfb] text-[#17231b]"
    >
      <main className="relative mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-3 py-4 sm:px-6 sm:py-6">
        <header className="relative border-b border-[#b9cbbf] pb-4 sm:pb-5">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3 sm:gap-5">
            <img
              src={`${baseUrl}assets/poster-logo.png`}
              alt="شعار منصة إعداد المقايسات"
              className="h-14 w-14 shrink-0 object-contain sm:h-24 sm:w-24"
            />
            <div className="min-w-0 text-center">
              <h1 className="text-[1.45rem] font-black leading-tight tracking-tight text-[#063b25] sm:text-4xl md:text-5xl">
                منصة إعداد المقايسات
              </h1>
              <div className="mt-1.5 flex items-center justify-center gap-3 sm:mt-2">
                <span className="h-0.5 w-10 rounded-full bg-[#c7a34b] sm:w-16" />
                <span className="text-xl font-extrabold tracking-wide text-[#075337] sm:text-3xl">
                  BOQ Pro
                </span>
                <span className="h-0.5 w-10 rounded-full bg-[#c7a34b] sm:w-16" />
              </div>
            </div>
          </div>
        </header>

        <section className="pt-5 text-center sm:pt-7">
          <div className="inline-flex items-center gap-3 rounded-full bg-gradient-to-l from-[#06462d] to-[#08704b] px-6 py-3 text-white shadow-md sm:px-9">
            <svg aria-hidden="true" viewBox="0 0 36 28" className="h-6 w-7 shrink-0 text-[#e6c66e]" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 19 C5 11, 10.5 6, 18 6 C25.5 6, 31 11, 31 19" />
              <path d="M14.5 6.5 V3.5 H21.5 V6.5 M14.5 6.5 V18.5 M21.5 6.5 V18.5" />
              <path d="M2 19.5 H34 C34 22.5, 32 23.5, 29 23.5 H7 C4 23.5, 2 22.5, 2 19.5 Z" />
            </svg>
            <span className="text-base font-extrabold sm:text-xl">أداة مجانية لخدمة المهندسين</span>
          </div>

          <p className="mx-auto mt-5 max-w-4xl text-lg font-semibold leading-relaxed text-[#202a24] sm:mt-6 sm:text-2xl">
            أداة متخصصة لتسهيل وتسريع إعداد المقايسات التقديرية،
            <br className="hidden sm:block" />
            استنادًا إلى قائمة أسعار هيئة الأبنية التعليمية لعام{" "}
            <span className="rounded-full bg-[#e8f2df] px-2 font-black text-[#075337]">2026</span>.
          </p>
        </section>

        <div className="my-5 flex items-center gap-4 sm:my-7">
          <span className="h-px flex-1 bg-[#a9c2b2]" />
          <svg aria-hidden="true" viewBox="0 0 32 36" className="h-8 w-8 shrink-0 text-[#075337]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="7" y="5" width="18" height="26" rx="2" />
            <path d="M12 11 H20 M12 17 H20 M12 23 H17 M12 2 V7 M20 2 V7" />
          </svg>
          <span className="h-px flex-1 bg-[#a9c2b2]" />
        </div>

        <section className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-[#d7e6dc] bg-gradient-to-br from-white via-[#f4faf5] to-[#e5f1e9] px-4 py-8 sm:min-h-[300px] sm:px-8">
          <img
            src={`${baseUrl}assets/poster-blueprint.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-full w-28 object-cover object-left opacity-35 sm:w-56 sm:opacity-75"
          />
          <div className="relative z-10 mx-auto max-w-3xl rounded-3xl border border-white/80 bg-white/70 px-4 py-7 text-center shadow-sm backdrop-blur-sm sm:px-10 sm:py-9">
            <div className="mb-3 flex justify-center text-[#075337]">
              <svg aria-hidden="true" viewBox="0 0 64 64" className="h-12 w-12 sm:h-14 sm:w-14" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 8 H42 L53 19 V55 H15 Z M42 8 V20 H53" />
                <path d="M23 29 L27 33 L34 25 M38 30 H46 M23 42 L27 46 L34 38 M38 43 H46" />
              </svg>
            </div>
            <h2 className="text-2xl font-black leading-snug text-[#06462d] sm:text-4xl">
              أعدّ هذا العمل ابتغاء وجه الله،
            </h2>
            <p className="mt-2 text-lg font-semibold leading-relaxed text-[#26332b] sm:text-2xl">
              وأسأل الله أن ينفع به كل من يستخدمه.
            </p>
            <p className="mt-6 text-base font-extrabold text-[#075337] sm:mt-8 sm:text-xl">
              لا تنسونا ووالدينا من صالح دعائكم 🤲
            </p>
          </div>
        </section>

        <footer className="mx-auto w-full max-w-[900px] pt-5 sm:pt-6">
          <div className="space-y-3">
            <PWAInstallButton variant="welcome" />
            <button
              type="button"
              onClick={onEnter}
              className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-l from-[#063b25] to-[#08704b] px-6 py-4 text-xl font-black text-white shadow-lg shadow-emerald-950/15 transition hover:brightness-110 active:scale-[0.99] sm:py-5 sm:text-2xl"
            >
              <span>الدخول إلى المنصة</span>
              <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9 V7 C12 5.5, 13 4.5, 14.5 4.5 H23.5 C25 4.5, 26 5.5, 26 7 V25 C26 26.5, 25 27.5, 23.5 27.5 H14.5 C13 27.5, 12 26.5, 12 25 V23" />
                <path d="M5 16 H20 M15.5 11.5 L20 16 L15.5 20.5" />
              </svg>
            </button>
          </div>

          <section className="mt-5 overflow-hidden rounded-2xl border border-[#0b6548] bg-gradient-to-l from-[#043c2b] via-[#07543b] to-[#08745a] text-white shadow-lg sm:mt-6">
            <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#d8bd68]/60 bg-white/5 text-[#e8cd78] sm:h-14 sm:w-14">
                  <svg aria-hidden="true" viewBox="0 0 48 48" className="h-8 w-8 sm:h-9 sm:w-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="7" y="9" width="34" height="25" rx="3" />
                    <path d="M17 41 H31 M24 34 V41 M18 20 L14 24 L18 28 M30 20 L34 24 L30 28 M22 29 L26 19" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#f0d786] sm:text-lg">بيانات مصمم التطبيق للتواصل</h3>
                  <p className="mt-1 text-sm font-bold sm:text-base">م. محمود قوتلي محمد</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/20 pt-3 text-sm sm:border-r sm:border-t-0 sm:pr-5 sm:pt-0 sm:text-base">
                <a href="https://wa.me/201000646571" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold transition hover:text-[#f0d786]" dir="ltr">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5Z" />
                    <path d="M8.5 8.5c.5 3 2 4.5 5 5l1.2-1.2 2 1c-.2 1.4-1.2 2-2.4 2-3.7-.5-6.6-3.4-7.1-7.1 0-1.2.6-2.2 2-2.4l1 2Z" />
                  </svg>
                  01000646571
                </a>
                <a href="mailto:mahmoudkowatly@gmail.com" className="inline-flex items-center gap-2 font-semibold transition hover:text-[#f0d786]" dir="ltr">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                  mahmoudkowatly@gmail.com
                </a>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-l from-[#e6c66e] via-[#d1ad50] to-transparent" />
          </section>
        </footer>
      </main>
    </div>
  );
}
