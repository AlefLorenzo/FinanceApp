import { Download, Smartphone } from 'lucide-react';

export default function AppDownloadButton() {
  return (
    <a
      href="/downloads/Finance-App.apk"
      download="Finance-App.apk"
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
        <Smartphone className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold">Baixar Finance App</p>
        <p className="text-xs text-slate-500">Aplicativo Android • APK</p>
      </div>

      <Download className="h-5 w-5 shrink-0" />
    </a>
  );
}
