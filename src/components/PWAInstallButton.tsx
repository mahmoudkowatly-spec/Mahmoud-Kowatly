import { useState } from "react";
import { CheckCircle2, Download, MonitorSmartphone, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallButton() {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    isSwReady,
    install,
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Hide automatically when already launched as an installed standalone app
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        toast.success("تم تثبيت التطبيق بنجاح! يمكنك الآن فتحه من جهازك بدون إنترنت.");
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <Button
        variant={isInstallable ? "default" : "outline"}
        onClick={handleClick}
        className="whitespace-nowrap shrink-0 flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        <span>تثبيت التطبيق</span>
      </Button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-card border shadow-2xl p-6 relative">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute left-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {isIOS || isAndroid ? (
                  <Smartphone className="w-5 h-5" />
                ) : (
                  <MonitorSmartphone className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold">تثبيت التطبيق للعمل أوفلاين</h3>
                <p className="text-xs text-muted-foreground">
                  الاسم على الجهاز: منصة المقايسات
                </p>
              </div>
            </div>

            {isSwReady && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>محرك العمل بدون إنترنت مفعّل وجاهز على هذا المتصفح.</span>
              </div>
            )}

            {isInIframe ? (
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  المتصفح يمنع تثبيت التطبيقات من داخل نافذة المعاينة المدمجة. لتثبيت التطبيق مباشرة:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-foreground">
                  <li>افتح رابط الموقع المنشور مباشرة في نافذة متصفح مستقلة (Chrome أو Edge أو Safari).</li>
                  <li>اضغط على زر <strong>تثبيت التطبيق</strong> في الشريط العلوي ليتم التثبيت فوراً.</li>
                </ol>
              </div>
            ) : isIOS ? (
              <ol className="text-sm text-muted-foreground space-y-2 leading-relaxed list-decimal list-inside">
                <li>
                  تأكد من فتح الموقع داخل متصفح <strong>Safari</strong>.
                </li>
                <li>
                  اضغط على زر <strong>المشاركة (Share)</strong> في شريط المتصفح.
                </li>
                <li>
                  اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> ثم اضغط <strong>إضافة</strong>.
                </li>
              </ol>
            ) : isAndroid ? (
              <ol className="text-sm text-muted-foreground space-y-2 leading-relaxed list-decimal list-inside">
                <li>
                  افتح الموقع في متصفح <strong>Chrome</strong>.
                </li>
                <li>
                  اضغط على قائمة المتصفح (<strong>⋮</strong>) بالأعلى.
                </li>
                <li>
                  اختر <strong>تثبيت التطبيق (Install app)</strong> أو <strong>الإضافة إلى الشاشة الرئيسية</strong>.
                </li>
              </ol>
            ) : (
              <ol className="text-sm text-muted-foreground space-y-2 leading-relaxed list-decimal list-inside">
                <li>
                  في متصفح <strong>Chrome</strong> أو <strong>Edge</strong> على الكمبيوتر، ابحث عن أيقونة <strong>التثبيت</strong> داخل شريط العنوان بالأعلى.
                </li>
                <li>
                  أو من قائمة المتصفح (<strong>⋮</strong>) اختر <strong>البث والحفظ والمشاركة ← تثبيت الصفحة كتطبيق (Install app)</strong>.
                </li>
                <li>
                  بعد التثبيت سيظهر التطبيق كبرنامج مستقل على سطح المكتب ويعمل بدون إنترنت.
                </li>
              </ol>
            )}

            <Button
              variant="outline"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full"
            >
              فهمت
            </Button>
          </Card>
        </div>
      )}
    </>
  );
}
