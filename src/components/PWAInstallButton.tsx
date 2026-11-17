import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <Button
        variant="default"
        onClick={install}
        className="whitespace-nowrap shrink-0 flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        <span>تثبيت التطبيق</span>
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setShowIOSGuide(true)}
          className="whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          <span>تثبيت على iOS</span>
        </Button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <Card className="w-full max-w-sm bg-card border shadow-2xl p-6 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute left-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold mb-2">
                تثبيت التطبيق على iPhone / iPad
              </h3>
              <ol className="text-sm text-muted-foreground space-y-2 leading-relaxed list-decimal list-inside">
                <li>
                  افتح الموقع في متصفح <strong>Safari</strong> ثم اضغط على زر{" "}
                  <strong>المشاركة (Share)</strong> أسفل الشاشة.
                </li>
                <li>
                  مرر للأسفل واختر{" "}
                  <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                </li>
                <li>
                  اضغط <strong>إضافة (Add)</strong> ليظهر التطبيق ويعمل بدون
                  إنترنت.
                </li>
              </ol>
              <Button
                variant="outline"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full"
              >
                إغلاق
              </Button>
            </Card>
          </div>
        )}
      </>
    );
  }

  return null;
}
