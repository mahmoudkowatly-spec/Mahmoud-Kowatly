/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Trash2,
  Plus,
  Minus,
  Download,
  Printer,
  Search,
  FileSpreadsheet,
  Image as ImageIcon,
  X,
  FolderOpen,
  FilePlus2,
  Copy,
  Upload,
  FileJson,
  ArrowUp,
  ArrowDown,
  Check,
  PenLine,
  FileText,
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  RefreshCw,
  ExternalLink,
  Loader2,
  Eye,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { exportEstimate, generateEstimateExcelBlob } from "@/lib/export-estimate";
import {
  computeTotals,
  fmt,
  sectionOf,
  SECTION_LABELS,
  tafqeet,
  type Section,
} from "@/lib/estimate-utils";
import { exportElementToPdf } from "@/lib/export-pdf";
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  listDriveEstimates,
  uploadEstimateToDrive,
  downloadDriveFile,
  deleteDriveFile,
  type DriveFileItem,
} from "@/lib/google-drive";
import type { User } from "firebase/auth";

type Item = {
  id: number;
  code: string;
  desc: string;
  unit: string;
  rate: number;
  part: string;
  page: number;
  section?: Section;
};

type LineItem = Item & { qty: number; section?: Section; custom?: boolean };

type Project = {
  id: string;
  updatedAt: number;
  projectName: string;
  clientName: string;
  orgName: string;
  governorate: string;
  refNumber: string;
  discountPercent: number;
  logoDataUrl: string;
  estimate: LineItem[];
};

const STORE_KEY = "gea_projects_v2";
const OLD_KEY = "gea_estimate_v1";

function newProject(partial: Partial<Project> = {}): Project {
  return {
    id: `p${Date.now()}${Math.floor(Math.random() * 1000)}`,
    updatedAt: Date.now(),
    projectName: "",
    clientName: "",
    orgName: "",
    governorate: "",
    refNumber: "",
    discountPercent: 0,
    logoDataUrl: "",
    estimate: [],
    ...partial,
  };
}

function normalize(s: string) {
  return s
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

type Filter = "all" | Section;

export default function App() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // In-app confirmation dialog state (replaces blocked window.confirm in iframe sandbox)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const requestConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
    confirmLabel = "تأكيد",
    isDestructive = true,
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      description,
      confirmLabel,
      isDestructive,
      onConfirm,
    });
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Google Auth & Drive state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAuthUser(user);
        setAuthToken(token);
      },
      () => {
        setAuthUser(null);
        setAuthToken(null);
      },
    );
    return () => unsubscribe();
  }, []);

  // Fetch Drive files when modal is opened and user is authenticated
  useEffect(() => {
    if (showDriveModal && authToken) {
      refreshDriveFiles(authToken);
    }
  }, [showDriveModal, authToken]);

  const refreshDriveFiles = async (token: string) => {
    setIsLoadingDrive(true);
    try {
      const files = await listDriveEstimates(token);
      setDriveFiles(files);
    } catch (err) {
      console.error(err);
      toast.error("فشل في تحميل ملفات Google Drive");
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAuthUser(result.user);
        setAuthToken(result.accessToken);
        toast.success(`مرحباً ${result.user.displayName || "بك"}! تم الاتصال بـ Google Drive`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("فشل تسجيل الدخول باستخدام حساب Google");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setAuthUser(null);
    setAuthToken(null);
    setDriveFiles([]);
    toast.info("تم تسجيل الخروج");
  };

  useEffect(() => {
    setMounted(true);
    fetch("/data/items.json")
      .then((r) => r.json())
      .then((d: Item[]) => setItems(d))
      .catch(() => toast.error("فشل تحميل قاعدة البيانات"));

    let list: Project[] = [];
    let active = "";
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        list = s.projects || [];
        active = s.activeId || "";
      } else {
        const old = localStorage.getItem(OLD_KEY);
        if (old) list = [newProject(JSON.parse(old))];
      }
    } catch {
      /* ignore */
    }
    if (!list.length) list = [newProject()];
    if (!list.find((p) => p.id === active)) active = list[0].id;
    setProjects(list);
    setActiveId(active);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ projects, activeId }));
    } catch {
      toast.error("تعذّر الحفظ — مساحة التخزين ممتلئة (جرّب تصغير اللوجو)");
    }
  }, [projects, activeId, loaded]);

  const project = projects.find((p) => p.id === activeId) ?? newProject();
  const estimate = project.estimate;

  const update = (
    patch: Partial<Project> | ((p: Project) => Partial<Project>),
  ) =>
    setProjects((list) =>
      list.map((p) =>
        p.id === activeId
          ? {
              ...p,
              ...(typeof patch === "function" ? patch(p) : patch),
              updatedAt: Date.now(),
            }
          : p,
      ),
    );

  const setEstimate = (fn: (e: LineItem[]) => LineItem[]) =>
    update((p) => ({ estimate: fn(p.estimate) }));

  const qtyById = useMemo(
    () => new Map(estimate.map((x) => [x.id, x.qty])),
    [estimate],
  );

  const results = useMemo(() => {
    if (!items) return [];
    const pool =
      filter === "all"
        ? items
        : items.filter((it) => sectionOf(it.code, it.section) === filter);
    const q = normalize(query);
    if (!q) return pool.slice(0, 50);

    const normCode = (c: string) =>
      c
        .replace(/[-\\/.]/g, "/")
        .split("/")
        .map((x) => x.replace(/^0+(?=\d)/, ""))
        .join("/");
    const qc = /^[\d\s\-\/.]+$/.test(q) ? normCode(q.replace(/\s/g, "")) : q;
    const terms = q.split(" ").filter(Boolean);

    const scored: { it: Item; score: number }[] = [];
    for (const it of pool) {
      const code = normCode(it.code.toLowerCase());
      const desc = normalize(it.desc);
      let score = 0;
      if (code === qc) score += 100;
      else if (code.startsWith(qc)) score += 60;
      else if (code.includes(qc)) score += 40;
      if (terms.every((t) => desc.includes(t) || code.includes(t)))
        score += 10 + terms.length;
      if (score > 0) scored.push({ it, score });
      if (scored.length > 800) break;
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 100).map((s) => s.it);
  }, [items, query, filter]);

  const addItem = (it: Item) => {
    if (qtyById.has(it.id)) {
      setEstimate((prev) =>
        prev.map((p) => (p.id === it.id ? { ...p, qty: p.qty + 1 } : p)),
      );
      toast.info("البند مضاف بالفعل — تمت زيادة الكمية");
    } else {
      setEstimate((prev) => [...prev, { ...it, qty: 1 }]);
      toast.success("تمت إضافة البند");
    }
  };

  const updateQty = (id: number, qty: number) =>
    setEstimate((p) =>
      p.map((x) => (x.id === id ? { ...x, qty: Math.max(0, qty) } : x)),
    );

  const removeItem = (id: number) =>
    setEstimate((p) => p.filter((x) => x.id !== id));

  const move = (idx: number, dir: -1 | 1) =>
    setEstimate((p) => {
      const j = idx + dir;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[idx], n[j]] = [n[j], n[idx]];
      return n;
    });

  const sortBySection = () =>
    setEstimate((p) => {
      const order: Section[] = ["ordinary", "sanitary", "electrical"];
      return [...p].sort(
        (a, b) =>
          order.indexOf(sectionOf(a.code, a.section)) -
          order.indexOf(sectionOf(b.code, b.section)),
      );
    });

  const clearAll = () => {
    requestConfirm(
      "مسح جميع البنود",
      "هل تريد مسح جميع بنود المقايسة الحالية؟ لا يمكن التراجع عن هذه الخطوة.",
      () => {
        setEstimate(() => []);
        toast.success("تم مسح جميع بنود المقايسة");
      },
      "مسح الكل",
      true,
    );
  };

  const totals = computeTotals(estimate, project.discountPercent);

  // ---- Projects ----
  const createProject = () => {
    const p = newProject({
      orgName: project.orgName,
      logoDataUrl: project.logoDataUrl,
    });
    setProjects((l) => [p, ...l]);
    setActiveId(p.id);
    setShowProjects(false);
    toast.success("تم إنشاء مقايسة جديدة");
  };

  const duplicateProject = (src: Project) => {
    const p = newProject({
      ...src,
      id: undefined,
      projectName: `${src.projectName || "مقايسة"} (نسخة)`,
    } as Partial<Project>);
    p.id = `p${Date.now()}`;
    setProjects((l) => [p, ...l]);
    setActiveId(p.id);
    toast.success("تم نسخ المقايسة");
  };

  const deleteProject = (id: string, projectName?: string) => {
    requestConfirm(
      "حذف المقايسة",
      `هل أنت متأكد من حذف مقايسة "${projectName || "بدون اسم"}" نهائياً؟`,
      () => {
        setProjects((l) => {
          const rest = l.filter((p) => p.id !== id);
          const final = rest.length ? rest : [newProject()];
          if (id === activeId) setActiveId(final[0].id);
          return final;
        });
        toast.success("تم حذف المقايسة بنجاح");
      },
      "تأكيد الحذف",
      true,
    );
  };

  const exportJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { type: "gea-estimate", version: 2, project },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `مقايسة-${project.projectName || "مشروع"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (f: File | null) => {
    if (!f) return;
    f.text().then((txt) => {
      try {
        const d = JSON.parse(txt);
        const src = d.project ?? d;
        if (!Array.isArray(src.estimate)) throw new Error();
        const p = newProject({ ...src });
        p.id = `p${Date.now()}`;
        setProjects((l) => [p, ...l]);
        setActiveId(p.id);
        toast.success("تم استيراد المقايسة");
      } catch {
        toast.error("الملف غير صالح");
      }
    });
  };

  const onLogoPick = (f: File | null) => {
    if (!f) return;
    if (f.size > 1024 * 1024) return toast.error("حجم الصورة أكبر من 1MB");
    const reader = new FileReader();
    reader.onload = () => update({ logoDataUrl: String(reader.result || "") });
    reader.readAsDataURL(f);
  };

  const exportXlsx = async () => {
    if (!estimate.length) return toast.error("لا توجد بنود للتصدير — يرجى إضافة بنود أولاً");
    try {
      await exportEstimate(estimate, {
        orgName: project.orgName,
        projectTitle: project.projectName,
        governorate: project.governorate,
        refNumber: project.refNumber,
        discountPercent: project.discountPercent,
        logoDataUrl: project.logoDataUrl || undefined,
      });
      toast.success("تم تصدير ملف Excel بنجاح");
    } catch (e) {
      console.error(e);
      toast.error("فشل تصدير ملف Excel");
    }
  };

  // ---- TRUE PDF GENERATION & PRINT ----
  const handleDownloadPdf = async () => {
    if (!estimate.length) {
      return toast.error("لا توجد بنود في المقايسة — أضف بنوداً من القائمة أولاً");
    }

    const element = printableAreaRef.current;
    if (!element) {
      return toast.error("تعذر العثور على منطقة الطباعة");
    }

    setIsExportingPdf(true);
    const toastId = toast.loading("جارٍ إنشاء ملف PDF عالي الجودة وتجهيز الصفحات...");

    try {
      const fileName = `مقايسة-${project.projectName || "مشروع"}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const { download } = await exportElementToPdf(element, fileName);
      download();
      toast.success("تم تحميل ملف PDF بنجاح!", { id: toastId });
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("فشل إنشاء ملف PDF: " + (err.message || "حدث خطأ غير متوقع"), { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!estimate.length) {
      return toast.error("لا توجد بنود في المقايسة للطباعة — أضف بنوداً أولاً");
    }

    const element = printableAreaRef.current;
    if (!element) return;

    // Use a clean temporary print iframe to bypass iframe sandboxing
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8">
            <title>مقايسة-${project.projectName || "مشروع"}</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Cairo", Arial, sans-serif; margin: 0; padding: 0; color: #000; direction: rtl; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
              th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
              th { background-color: #d9d9d9 !important; font-weight: bold; text-align: center; }
              .bg-green { background-color: #7bae7f !important; font-weight: bold; padding: 8px; font-size: 14px; text-align: center; }
              .bg-peach { background-color: #f4c7a3 !important; font-weight: bold; padding: 8px; font-size: 13px; border-top: 1px solid #000; text-align: center; }
              .bg-yellow { background-color: #ffff00 !important; font-weight: bold; }
              .bg-gray { background-color: #d9d9d9 !important; font-weight: bold; }
              .page-break { page-break-before: always; margin-top: 20px; }
              .note { font-size: 10px; line-height: 1.4; border: 1px solid #000; padding: 8px; margin-top: 12px; }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }, 400);
      }
    } catch (err) {
      console.warn("Fallback to window.print()", err);
      window.print();
    }
  };

  // ---- Google Drive Operations ----
  const saveToDrive = async (format: "json" | "xlsx" | "pdf") => {
    let token = authToken;
    if (!token) {
      token = await getAccessToken();
    }
    if (!token) {
      setShowDriveModal(true);
      return toast.info("يرجى تسجيل الدخول إلى Google أولاً");
    }

    if (!estimate.length) {
      return toast.error("لا توجد بنود لحفظها — أضف بنوداً أولاً");
    }

    setIsUploadingToDrive(true);
    const toastId = toast.loading("جارٍ رفع الملف إلى Google Drive...");

    try {
      const title = project.projectName || "مشروع";
      const dateStr = new Date().toISOString().slice(0, 10);

      if (format === "json") {
        const content = JSON.stringify(
          { type: "gea-estimate", version: 2, project },
          null,
          2,
        );
        const fileName = `مقايسة-${title}-${dateStr}.json`;
        await uploadEstimateToDrive(token, fileName, content, "application/json");
        toast.success(`تم حفظ نسخة المقايسة على Google Drive: ${fileName}`, { id: toastId });
      } else if (format === "xlsx") {
        const blob = await generateEstimateExcelBlob(estimate, {
          orgName: project.orgName,
          projectTitle: project.projectName,
          governorate: project.governorate,
          refNumber: project.refNumber,
          discountPercent: project.discountPercent,
          logoDataUrl: project.logoDataUrl || undefined,
        });
        const fileName = `مقايسة-${title}-${dateStr}.xlsx`;
        await uploadEstimateToDrive(
          token,
          fileName,
          blob,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        toast.success(`تم حفظ جدول Excel على Google Drive: ${fileName}`, { id: toastId });
      } else if (format === "pdf") {
        const element = printableAreaRef.current;
        if (!element) throw new Error("تعذر تجهيز مستند PDF");
        const fileName = `مقايسة-${title}-${dateStr}.pdf`;
        const { blob } = await exportElementToPdf(element, fileName);
        await uploadEstimateToDrive(token, fileName, blob, "application/pdf");
        toast.success(`تم حفظ مستند PDF على Google Drive: ${fileName}`, { id: toastId });
      }

      await refreshDriveFiles(token);
    } catch (e: any) {
      console.error(e);
      toast.error(`فشل الرفع إلى Google Drive: ${e.message || "خطأ غير معروف"}`, { id: toastId });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const loadFromDrive = async (file: DriveFileItem) => {
    let token = authToken;
    if (!token) token = await getAccessToken();
    if (!token) return;

    requestConfirm(
      "استيراد مقايسة من Google Drive",
      `هل تريد استيراد المقايسة "${file.name}" من Google Drive وفتحها كمشروع جديد؟`,
      async () => {
        try {
          const text = await downloadDriveFile(token!, file.id);
          const data = JSON.parse(text);
          const src = data.project ?? data;
          if (!Array.isArray(src.estimate)) {
            throw new Error("تنسيق بيانات المقايسة غير صحيح");
          }
          const p = newProject({ ...src });
          p.id = `p${Date.now()}`;
          setProjects((l) => [p, ...l]);
          setActiveId(p.id);
          setShowDriveModal(false);
          toast.success(`تم استيراد "${p.projectName || file.name}" من Google Drive`);
        } catch (err: any) {
          console.error(err);
          toast.error(`فشل استيراد الملف: ${err.message || "الملف غير صالح"}`);
        }
      },
      "استيراد",
      false,
    );
  };

  const handleDeleteDriveFile = async (file: DriveFileItem) => {
    let token = authToken;
    if (!token) token = await getAccessToken();
    if (!token) return;

    requestConfirm(
      "حذف ملف من Google Drive",
      `هل أنت متأكد من حذف الملف "${file.name}" نهائياً من Google Drive؟ لا يمكن التراجع عن هذا الإجراء.`,
      async () => {
        try {
          await deleteDriveFile(token!, file.id);
          toast.success(`تم حذف "${file.name}" من Google Drive`);
          setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
        } catch (err: any) {
          console.error(err);
          toast.error("فشل حذف الملف من Google Drive");
        }
      },
      "حذف من Drive",
      true,
    );
  };

  const field = (label: string, key: keyof Project, placeholder: string) => (
    <div>
      <label className="text-xs font-semibold mb-1 block">{label}</label>
      <Input
        value={String(project[key] ?? "")}
        onChange={(e) =>
          update({ [key]: e.target.value } as Partial<Project>)
        }
        placeholder={placeholder}
      />
    </div>
  );

  const sections: Section[] = ["ordinary", "sanitary", "electrical"];

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-sans">
      <Toaster position="top-center" richColors />

      {/* Reusable In-App Confirmation Modal (bypasses iframe sandbox restrictions) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card border-2 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmDialog.isDestructive
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {confirmDialog.isDestructive ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-base font-bold">{confirmDialog.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {confirmDialog.description}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
                }
              >
                إلغاء
              </Button>
              <Button
                variant={confirmDialog.isDestructive ? "destructive" : "default"}
                size="sm"
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  action();
                }}
              >
                {confirmDialog.confirmLabel || "تأكيد"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      <header className="border-b bg-card sticky top-0 z-20 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                منصة إعداد المقايسات
              </h1>
              <p className="text-xs text-muted-foreground">
                قائمة أسعار الهيئة العامة للأبنية التعليمية 2026 •{" "}
                {items?.length ?? "..."} بند
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Google Drive Status & Trigger */}
            <Button
              variant={authToken ? "secondary" : "outline"}
              className="relative flex items-center gap-2 border-emerald-600/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              onClick={() => setShowDriveModal(true)}
            >
              <Cloud className="w-4 h-4 text-emerald-600" />
              <span>Google Drive</span>
              {authToken && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowProjects((v) => !v)}
            >
              <FolderOpen className="w-4 h-4 ml-2" /> المقايسات (
              {projects.length})
            </Button>

            {/* Print with preview modal */}
            <Button variant="outline" onClick={() => setShowPrintModal(true)}>
              <Printer className="w-4 h-4 ml-2" /> طباعة
            </Button>

            {/* Direct PDF Download button */}
            <Button
              variant="outline"
              disabled={isExportingPdf}
              onClick={handleDownloadPdf}
              className="border-red-600/30 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin text-red-600" />
              ) : (
                <FileText className="w-4 h-4 ml-2 text-red-600" />
              )}
              {isExportingPdf ? "جارٍ التجهيز..." : "PDF"}
            </Button>

            <Button onClick={exportXlsx} className="bg-emerald-700 hover:bg-emerald-800 text-white">
              <Download className="w-4 h-4 ml-2" /> Excel
            </Button>
          </div>
        </div>
      </header>

      {/* Print & PDF Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-card border-2 shadow-2xl p-6 relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">معاينة الطباعة والمستند</h2>
                  <p className="text-xs text-muted-foreground">
                    المقايسة الرسمية: الغلاف، جدول الإجماليات، التفقيط، وجدول البنود التفصيلي
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrint}
                  disabled={!estimate.length}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 ml-1" /> طباعة المستند
                </Button>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={!estimate.length || isExportingPdf}
                  variant="outline"
                  className="border-red-600/30 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 ml-1" />
                  )}
                  تحميل PDF
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPrintModal(false)}
                  className="cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Document Preview Container */}
            <div className="flex-1 overflow-y-auto p-4 bg-muted/20 border rounded-lg">
              {estimate.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-semibold">المقايسة فارغة حالياً</p>
                  <p className="text-xs mt-1">أضف بعض البنود من قائمة البحث لعرض ومعاينة المستند المطبوع.</p>
                </div>
              ) : (
                <div className="max-w-[760px] mx-auto bg-white text-black p-8 shadow-sm border rounded">
                  {/* Visual Render for Preview */}
                  <div className="space-y-6">
                    {/* Header Box */}
                    <div className="border border-black text-center">
                      <div className="p-2 font-bold text-base bg-[#7bae7f]">
                        {project.orgName || "الهيئة / الجهة الرسمية"}
                      </div>
                      <div className="p-3 font-bold text-lg bg-[#f4c7a3] border-t border-black">
                        {project.projectName || "مقايسة أعمال تقديرية"}
                      </div>
                      {project.governorate && (
                        <div className="p-2 font-bold bg-[#f4c7a3] border-t border-black text-sm">
                          المحافظة: {project.governorate}
                        </div>
                      )}
                      {project.refNumber && (
                        <div className="p-1.5 font-bold border-t border-black text-xs">
                          رقم تعريفى: {project.refNumber}
                        </div>
                      )}
                    </div>

                    {/* Summary Table */}
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#d9d9d9]">
                          <th className="border border-black p-2 w-16">مسلسل</th>
                          <th className="border border-black p-2">بيان الأعمال</th>
                          <th className="border border-black p-2 w-32">إجمالي البند</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sections.map((s, i) => (
                          <tr key={s}>
                            <td className="border border-black p-2 text-center">{["أولاً", "ثانياً", "ثالثاً"][i]}</td>
                            <td className="border border-black p-2 text-center">إجمالي {SECTION_LABELS[s]}</td>
                            <td className="border border-black p-2 text-center font-bold">{fmt(totals[s])}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#d9d9d9] font-bold">
                          <td colSpan={2} className="border border-black p-2 text-center">الإجمالي</td>
                          <td className="border border-black p-2 text-center">{fmt(totals.grand)}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="border border-black p-2 text-center">نسبة الخصم المقدمة من المقاول</td>
                          <td className="border border-black p-2 text-center">{project.discountPercent || 0}%</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="border border-black p-2 text-center">إجمالي قيمة الخصم</td>
                          <td className="border border-black p-2 text-center">{fmt(totals.discount)}</td>
                        </tr>
                        <tr className="font-bold">
                          <td colSpan={2} className="border border-black p-2 text-center bg-[#d9d9d9]">الإجمالي العام</td>
                          <td className="border border-black p-2 text-center bg-[#ffff00]">{fmt(totals.net)} ج.م</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Tafqeet */}
                    <div className="border border-black p-3 text-center font-bold text-sm bg-neutral-50">
                      {tafqeet(totals.net)}
                    </div>

                    {/* Detailed Items Table Preview */}
                    <div className="pt-4 border-t border-dashed">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm">جدول تفاصيل البنود ({estimate.length} بند)</span>
                        <span className="text-xs text-neutral-500">التاريخ: {new Date().toLocaleDateString("ar-EG")}</span>
                      </div>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#d9d9d9]">
                            <th className="border border-black p-1.5 w-8">م</th>
                            <th className="border border-black p-1.5 w-20">الكود</th>
                            <th className="border border-black p-1.5">بيان الأعمال</th>
                            <th className="border border-black p-1.5 w-12">الوحدة</th>
                            <th className="border border-black p-1.5 w-14">الكمية</th>
                            <th className="border border-black p-1.5 w-16">الفئة</th>
                            <th className="border border-black p-1.5 w-20">القيمة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estimate.map((x, i) => (
                            <tr key={x.id}>
                              <td className="border border-black p-1.5 text-center">{i + 1}</td>
                              <td className="border border-black p-1.5 font-mono text-[11px] text-center">{x.code}</td>
                              <td className="border border-black p-1.5 text-right leading-relaxed">{x.desc}</td>
                              <td className="border border-black p-1.5 text-center">{x.unit}</td>
                              <td className="border border-black p-1.5 text-center">{x.qty.toLocaleString("ar-EG")}</td>
                              <td className="border border-black p-1.5 text-center">{x.rate.toLocaleString("ar-EG")}</td>
                              <td className="border border-black p-1.5 text-center font-semibold">{fmt(x.qty * x.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold bg-[#d9d9d9]">
                            <td colSpan={6} className="border border-black p-2 text-left">الإجمالي الكلي</td>
                            <td className="border border-black p-2 text-center bg-[#ffff00]">{fmt(totals.grand)} ج.م</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Hidden Master Printable Area for HTML2Canvas & Print Execution */}
      <div className="absolute -left-[9999px] top-0 pointer-events-none">
        <div
          ref={printableAreaRef}
          style={{
            width: "800px",
            backgroundColor: "#ffffff",
            color: "#000000",
            padding: "24px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            direction: "rtl",
          }}
        >
          {/* Cover Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
            {project.logoDataUrl && (
              <img
                src={project.logoDataUrl}
                alt="Logo"
                style={{ width: "110px", height: "110px", objectFit: "contain" }}
              />
            )}
            <div style={{ flex: 1, border: "1px solid #000", textAlign: "center" }}>
              <div style={{ padding: "8px", fontWeight: "bold", fontSize: "16px", backgroundColor: "#7bae7f" }}>
                {project.orgName || "الهيئة العامة للأبنية التعليمية"}
              </div>
              <div
                style={{
                  padding: "10px",
                  fontWeight: "bold",
                  fontSize: "18px",
                  backgroundColor: "#f4c7a3",
                  borderTop: "1px solid #000",
                }}
              >
                {project.projectName || "مقايسة أعمال تقديرية"}
              </div>
              {project.governorate && (
                <div style={{ padding: "6px", fontWeight: "bold", backgroundColor: "#f4c7a3", borderTop: "1px solid #000" }}>
                  المحافظة: {project.governorate}
                </div>
              )}
              {project.refNumber && (
                <div style={{ padding: "6px", fontWeight: "bold", borderTop: "1px solid #000", fontSize: "12px" }}>
                  رقم تعريفى: {project.refNumber}
                </div>
              )}
            </div>
          </div>

          {/* Summary Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
            <thead>
              <tr style={{ backgroundColor: "#d9d9d9" }}>
                <th style={{ border: "1px solid #000", padding: "8px", width: "70px", textAlign: "center" }}>مسلسل</th>
                <th style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>بيان الأعمال</th>
                <th style={{ border: "1px solid #000", padding: "8px", width: "160px", textAlign: "center" }}>إجمالي البند</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s, i) => (
                <tr key={s}>
                  <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                    {["أولاً", "ثانياً", "ثالثاً"][i]}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                    إجمالي {SECTION_LABELS[s]}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center", fontWeight: "bold" }}>
                    {fmt(totals[s])}
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: "#d9d9d9", fontWeight: "bold" }}>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                  الإجمالي
                </td>
                <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                  {fmt(totals.grand)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                  نسبة الخصم المقدمة من المقاول
                </td>
                <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                  {project.discountPercent || 0}%
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                  إجمالي قيمة الخصم
                </td>
                <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                  {fmt(totals.discount)}
                </td>
              </tr>
              <tr style={{ fontWeight: "bold" }}>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "8px", textAlign: "center", backgroundColor: "#d9d9d9" }}>
                  الإجمالي العام
                </td>
                <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center", backgroundColor: "#ffff00", fontSize: "14px" }}>
                  {fmt(totals.net)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tafqeet in Arabic Words */}
          <div
            style={{
              border: "1px solid #000",
              padding: "10px",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "13px",
              marginBottom: "12px",
              backgroundColor: "#f9f9f9",
            }}
          >
            {tafqeet(totals.net)}
          </div>

          <div style={{ fontSize: "11px", marginBottom: "16px" }}>
            التاريخ: {new Date().toLocaleDateString("ar-EG")}
          </div>

          {/* Official Engineering Disclaimer Note */}
          <div
            style={{
              border: "1px solid #000",
              padding: "8px",
              fontSize: "10px",
              lineHeight: 1.4,
              textAlign: "right",
              marginBottom: "24px",
            }}
          >
            <strong>ملحوظة:</strong> تم توصيف البنود بجميع مشتملاتها والبنود المحملة على البند وفى حالة عدم تنفيذ احد البنود المحملة على البند يتم عمل خصم نسبة على فئة البند الاجمالية فى مستخلص الاعمال وذلك طبقا للحالة على الطبيعة وبالاتفاق مع مهندس الاشراف بعد الرجوع الى المكتب الفنى.
          </div>

          {/* Detailed Line Items Table */}
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: "bold" }}>
              <span>جدول تفاصيل البنود</span>
              {project.refNumber && <span>رقم تعريفى: {project.refNumber}</span>}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#d9d9d9", fontSize: "11px" }}>
                  <th style={{ border: "1px solid #000", padding: "6px", width: "30px", textAlign: "center" }}>م</th>
                  <th style={{ border: "1px solid #000", padding: "6px", width: "85px", textAlign: "center" }}>رقم البند</th>
                  <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>بيان الأعمال</th>
                  <th style={{ border: "1px solid #000", padding: "6px", width: "50px", textAlign: "center" }}>الوحدة</th>
                  <th style={{ border: "1px solid #000", padding: "6px", width: "60px", textAlign: "center" }}>كمية</th>
                  <th style={{ border: "1px solid #000", padding: "6px", width: "70px", textAlign: "center" }}>الفئة</th>
                  <th style={{ border: "1px solid #000", padding: "6px", width: "85px", textAlign: "center" }}>القيمة</th>
                </tr>
              </thead>
              <tbody>
                {estimate.map((x, i) => (
                  <tr key={x.id} style={{ fontSize: "10.5px" }}>
                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>{i + 1}</td>
                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontFamily: "monospace" }}>
                      {x.code}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right", lineHeight: 1.35 }}>
                      {x.desc}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>{x.unit}</td>
                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                      {x.qty.toLocaleString("ar-EG")}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                      {x.rate.toLocaleString("ar-EG")}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontWeight: "bold" }}>
                      {fmt(x.qty * x.rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#d9d9d9", fontWeight: "bold", fontSize: "12px" }}>
                  <td colSpan={6} style={{ border: "1px solid #000", padding: "8px", textAlign: "left" }}>
                    الإجمالي الكلي
                  </td>
                  <td style={{ border: "1px solid #000", padding: "8px", textAlign: "center", backgroundColor: "#ffff00" }}>
                    {fmt(totals.grand)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Google Drive Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-card border-2 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDriveModal(false)}
              className="absolute left-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b pb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">التكامل مع Google Drive</h2>
                <p className="text-xs text-muted-foreground">
                  مزامنة المقايسات، وحفظ النسخ الاحتياطية وتصدير جداول Excel و PDF مباشرة إلى السحابة
                </p>
              </div>
            </div>

            {/* Auth Section */}
            <div className="p-4 rounded-xl border bg-muted/30 mb-6">
              {authUser ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {authUser.photoURL ? (
                      <img
                        src={authUser.photoURL}
                        alt="Profile"
                        className="w-10 h-10 rounded-full border border-emerald-500/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
                        {authUser.displayName?.[0] || "U"}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold">
                        {authUser.displayName || "مستخدم Google"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {authUser.email}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleLogout}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-3.5 h-3.5 ml-1.5" /> تسجيل خروج
                  </Button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm mb-4 text-muted-foreground">
                    قم بتسجيل الدخول باستخدام حساب Google الخاص بك لحفظ واسترجاع المقايسات مباشرة من Google Drive.
                  </p>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isSigningIn}
                    className="inline-flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-50 border border-gray-300 font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>
                      {isSigningIn
                        ? "جارٍ تسجيل الدخول..."
                        : "تسجيل الدخول باستخدام Google"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Upload Actions */}
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-2">
                حفظ المقايسة الحالية ("{project.projectName || "مشروع"}")
              </h3>
              <div className="grid sm:grid-cols-3 gap-2.5">
                <Button
                  variant="outline"
                  className="h-auto py-3 px-3 flex flex-col items-center justify-center gap-2 border-emerald-500/30 hover:border-emerald-500 text-center"
                  disabled={!authToken || isUploadingToDrive || !estimate.length}
                  onClick={() => saveToDrive("xlsx")}
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">حفظ كـ Excel</div>
                    <div className="text-[10px] text-muted-foreground">جدول كامل بالغلاف</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 px-3 flex flex-col items-center justify-center gap-2 border-red-500/30 hover:border-red-500 text-center"
                  disabled={!authToken || isUploadingToDrive || !estimate.length}
                  onClick={() => saveToDrive("pdf")}
                >
                  <FileText className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">حفظ كـ PDF</div>
                    <div className="text-[10px] text-muted-foreground">مستند رسمي للطباعة</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 px-3 flex flex-col items-center justify-center gap-2 border-blue-500/30 hover:border-blue-500 text-center"
                  disabled={!authToken || isUploadingToDrive || !estimate.length}
                  onClick={() => saveToDrive("json")}
                >
                  <CloudUpload className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">نسخة احتياطية</div>
                    <div className="text-[10px] text-muted-foreground">ملف JSON للاستعادة</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Stored Files in Drive */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">
                  الملفات المحفوظة في مجلد مقايسات_GEA_Estimates
                </h3>
                {authToken && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={isLoadingDrive}
                    onClick={() => refreshDriveFiles(authToken)}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ml-1 ${
                        isLoadingDrive ? "animate-spin" : ""
                      }`}
                    />
                    تحديث
                  </Button>
                )}
              </div>

              {!authToken ? (
                <div className="text-center py-8 border rounded-lg bg-muted/10 text-muted-foreground text-sm">
                  قم بتسجيل الدخول لعرض ملفات المقايسات المحفوظة في Google Drive
                </div>
              ) : isLoadingDrive ? (
                <div className="text-center py-8 border rounded-lg bg-muted/10 text-muted-foreground text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  جارٍ تحميل الملفات من Google Drive...
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/10 text-muted-foreground text-sm">
                  لا توجد مقايسات محفوظة في مجلد Drive بعد. يمكنك حفظ المقايسة الحالية أعلاه.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {driveFiles.map((f) => {
                    const isJson = f.name.endsWith(".json");
                    const isPdf = f.name.endsWith(".pdf");
                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isJson ? (
                            <FileJson className="w-5 h-5 text-blue-500 shrink-0" />
                          ) : isPdf ? (
                            <FileText className="w-5 h-5 text-red-500 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {f.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(f.modifiedTime).toLocaleString("ar-EG")}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isJson && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => loadFromDrive(f)}
                            >
                              <CloudDownload className="w-3.5 h-3.5 ml-1" />
                              استيراد
                            </Button>
                          )}
                          {f.webViewLink && (
                            <a
                              href={f.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDriveFile(f)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {showProjects && (
        <div className="max-w-7xl mx-auto px-4 pt-4 print:hidden">
          <Card className="p-4 border-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold">المقايسات المحفوظة</h2>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={createProject}>
                  <FilePlus2 className="w-4 h-4 ml-1" /> مقايسة جديدة
                </Button>
                <Button size="sm" variant="outline" onClick={exportJson}>
                  <FileJson className="w-4 h-4 ml-1" /> حفظ نسخة (ملف)
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    importJson(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => importRef.current?.click()}
                >
                  <Upload className="w-4 h-4 ml-1" /> فتح ملف
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-700 border-emerald-600/30 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  onClick={() => setShowDriveModal(true)}
                >
                  <Cloud className="w-4 h-4 ml-1 text-emerald-600" /> Google Drive
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[...projects]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((p) => {
                  const t = computeTotals(p.estimate, p.discountPercent);
                  const active = p.id === activeId;
                  return (
                    <div
                      key={p.id}
                      className={`border rounded-lg p-3 ${
                        active ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <button
                        className="text-right w-full cursor-pointer"
                        onClick={() => {
                          setActiveId(p.id);
                          setShowProjects(false);
                        }}
                      >
                        <div className="font-semibold text-sm line-clamp-1">
                          {p.projectName || "مقايسة بدون اسم"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {p.estimate.length} بند • {fmt(t.net)} ج.م
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mounted
                            ? new Date(p.updatedAt).toLocaleDateString("ar-EG")
                            : ""}
                        </div>
                      </button>
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => duplicateProject(p)}
                        >
                          <Copy className="w-3.5 h-3.5 ml-1" />
                          نسخ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(p.id, p.projectName);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-5 gap-6">
        {/* Search panel */}
        <section className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <label className="text-sm font-semibold mb-2 block">
              بحث عن بند
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQuery("");
                  if (e.key === "Enter" && results[0]) addItem(results[0]);
                }}
                placeholder="أدخل كود البند أو جزء من منطوق البند"
                className="pr-10 h-11"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(["all", ...sections] as Filter[]).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "الكل" : SECTION_LABELS[f]}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {items
                  ? `${results.length} نتيجة • Enter لإضافة أول نتيجة`
                  : "جارٍ تحميل قاعدة البيانات..."}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setShowCustom((v) => !v)}
              >
                <PenLine className="w-3.5 h-3.5 ml-1" /> بند مستجد
              </Button>
            </div>
            {showCustom && (
              <CustomItemForm
                onAdd={(li) => {
                  setEstimate((p) => [...p, li]);
                  setShowCustom(false);
                  toast.success("تمت إضافة البند المستجد");
                }}
              />
            )}
          </Card>

          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pl-1">
            {results.map((it) => {
              const q = qtyById.get(it.id);
              return (
                <Card
                  key={it.id}
                  className={`p-3 transition-colors ${
                    q !== undefined
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                          {it.code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {it.part} • ص {it.page}
                        </span>
                        {q !== undefined && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> مضاف
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-3">
                        {it.desc}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          الوحدة:{" "}
                          <span className="text-foreground">{it.unit}</span>
                        </span>
                        <span className="font-semibold text-primary">
                          {it.rate.toLocaleString("ar-EG")} ج.م
                        </span>
                      </div>
                    </div>
                    {q !== undefined ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQty(it.id, q + 1)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <Input
                          type="number"
                          value={q}
                          onChange={(e) =>
                            updateQty(
                              it.id,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-7 w-16 text-center px-1"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQty(it.id, q - 1)}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => addItem(it)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
            {items && !results.length && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                لا توجد نتائج مطابقة
              </p>
            )}
          </div>
        </section>

        {/* Estimate panel */}
        <section className="lg:col-span-3 space-y-4">
          <Card className="p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {field(
                "اسم الجهة (يظهر أعلى الغلاف)",
                "orgName",
                "مثال: مؤسسة / إدارة ...",
              )}
              {field(
                "اسم المشروع / عنوان المقايسة",
                "projectName",
                "مثال: المقايسة التقديرية لمدرسة ...",
              )}
              {field(
                "المحافظة / الموقع",
                "governorate",
                "مثال: مركز ... - محافظة ...",
              )}
              {field(
                "الجهة / العميل",
                "clientName",
                "مثال: مديرية التربية والتعليم",
              )}
              {field("رقم التعريفى", "refNumber", "مثال: 2700290")}
              <div>
                <label className="text-xs font-semibold mb-1 block">
                  نسبة الخصم (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={project.discountPercent}
                  onChange={(e) =>
                    update({
                      discountPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold mb-1 block">
                  شعار الجهة (يظهر على الغلاف)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => onLogoPick(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 ml-2" /> اختر صورة اللوجو
                  </Button>
                  {project.logoDataUrl && (
                    <>
                      <img
                        src={project.logoDataUrl}
                        alt="logo"
                        className="h-12 w-12 object-contain border rounded"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => update({ logoDataUrl: "" })}
                      >
                        <X className="w-4 h-4 ml-1" /> إزالة
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sections.map((s) => (
                <div key={s} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">
                    {SECTION_LABELS[s]}
                  </div>
                  <div className="font-bold mt-1">{fmt(totals[s])}</div>
                </div>
              ))}
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  الإجمالي قبل الخصم
                </div>
                <div className="font-bold mt-1">{fmt(totals.grand)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  الخصم ({project.discountPercent || 0}%)
                </div>
                <div className="font-bold mt-1 text-destructive">
                  {fmt(totals.discount)}
                </div>
              </div>
              <div className="rounded-lg border-2 border-primary bg-primary/10 p-3">
                <div className="text-xs text-muted-foreground">
                  الإجمالي العام
                </div>
                <div className="font-bold mt-1 text-primary">
                  {fmt(totals.net)} ج.م
                </div>
              </div>
            </div>

            <p className="mt-3 text-sm font-semibold leading-relaxed text-center border p-2 rounded bg-muted/20">
              {tafqeet(totals.net)}
            </p>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b bg-muted/40">
              <h2 className="font-semibold">
                بنود المقايسة ({estimate.length})
              </h2>
              {estimate.length > 0 && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={sortBySection}>
                    ترتيب حسب القسم
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 ml-1" /> مسح الكل
                  </Button>
                </div>
              )}
            </div>

            {estimate.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>لم تُضَف بنود بعد. ابدأ بالبحث ثم اضغط زر الإضافة (+).</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs">
                    <tr>
                      <th className="p-2 text-right w-10">م</th>
                      <th className="p-2 text-right w-24">الكود</th>
                      <th className="p-2 text-right w-[316px] min-w-[316px]">
                        البند
                      </th>
                      <th className="p-2 text-right w-16">الوحدة</th>
                      <th className="p-2 text-right w-32">الكمية</th>
                      <th className="p-2 text-right w-24">السعر</th>
                      <th className="p-2 text-right w-28">الإجمالي</th>
                      <th className="p-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.map((x, i) => (
                      <tr key={x.id} className="border-t align-top">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2 font-mono text-xs">
                          {x.code}
                          {x.custom && (
                            <div className="text-[10px] text-muted-foreground font-sans">
                              {SECTION_LABELS[sectionOf(x.code, x.section)]}
                            </div>
                          )}
                        </td>
                        <td className="p-2 leading-relaxed w-[316px] min-w-[316px]">
                          {x.desc}
                        </td>
                        <td className="p-2">{x.unit}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQty(x.id, x.qty - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={x.qty}
                              onChange={(e) =>
                                updateQty(
                                  x.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-7 w-16 px-1 text-center"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQty(x.id, x.qty + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-2">
                          {x.rate.toLocaleString("ar-EG")}
                        </td>
                        <td className="p-2 font-semibold">
                          {fmt(x.qty * x.rate)}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="flex flex-col">
                              <button
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                disabled={i === 0}
                                onClick={() => move(i, -1)}
                                aria-label="تحريك لأعلى"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                disabled={i === estimate.length - 1}
                                onClick={() => move(i, 1)}
                                aria-label="تحريك لأسفل"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeItem(x.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/40 font-bold">
                      <td colSpan={6} className="p-3 text-left">
                        الإجمالي الكلي
                      </td>
                      <td className="p-3 text-primary text-base">
                        {fmt(totals.grand)} ج.م
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}

function CustomItemForm({ onAdd }: { onAdd: (li: LineItem) => void }) {
  const [desc, setDesc] = useState("");
  const [unit, setUnit] = useState("");
  const [rate, setRate] = useState("");
  const [qty, setQty] = useState("1");
  const [section, setSection] = useState<Section>("ordinary");

  const submit = () => {
    const r = parseFloat(rate);
    if (!desc.trim() || !unit.trim() || !(r >= 0))
      return toast.error("أدخل التوصيف والوحدة والسعر");
    onAdd({
      id: -Date.now(),
      code: "مستجد",
      desc: desc.trim(),
      unit: unit.trim(),
      rate: r,
      part: "",
      page: 0,
      qty: parseFloat(qty) || 1,
      section,
      custom: true,
    });
  };

  return (
    <div className="mt-3 border rounded-lg p-3 space-y-2 bg-muted/30">
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="توصيف البند المستجد"
        className="w-full min-h-20 rounded-md border bg-background p-2 text-sm"
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="الوحدة"
        />
        <Input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="السعر"
        />
        <Input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="الكمية"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {(["ordinary", "sanitary", "electrical"] as Section[]).map((s) => (
          <Button
            key={s}
            size="sm"
            type="button"
            variant={section === s ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setSection(s)}
          >
            {SECTION_LABELS[s]}
          </Button>
        ))}
      </div>
      <Button size="sm" className="w-full" onClick={submit}>
        <Plus className="w-4 h-4 ml-1" /> إضافة للمقايسة
      </Button>
    </div>
  );
}
