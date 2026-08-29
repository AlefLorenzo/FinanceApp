import { useState, useEffect } from 'react';
import { Smartphone, Download, ExternalLink, Bell, CheckCircle2, AlertCircle } from 'lucide-react';

export function SettingsView() {
  const [isCordova, setIsCordova] = useState(false);
  const [isAndroidBrowser, setIsAndroidBrowser] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  const apkUrl = import.meta.env.VITE_ANDROID_APK_URL;
  const DEEP_LINK = 'intent://#Intent;scheme=financeapp;package=com.financeapp.app;end';

  useEffect(() => {
    const cordova = typeof (window as any).cordova !== 'undefined';
    setIsCordova(cordova);

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isAndroid = /android/i.test(ua);
    setIsAndroidBrowser(isAndroid && !cordova);

    // Initial permission check if in cordova
    if (cordova) {
      // In a real app we might need a plugin call to check status accurately
      // but for now we'll rely on the user tapping "Permitir"
    } else if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (isCordova) {
      const plugin = (window as any).FinanceNotifications;
      if (plugin) {
        plugin.requestPermission(
          (result: string) => {
            if (result === 'granted') {
              setNotificationPermission('granted');
            } else {
              setNotificationPermission('denied');
            }
          },
          (err: any) => console.error(err)
        );
      }
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-gray-500">⚙</span> Configurações
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Gerencie as preferências do aplicativo e opções do sistema.
        </p>

        {/* Notificações Section */}
        <div className="mb-8 bg-gray-50 p-5 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-gray-900">Permitir notificações</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            O FinanceApp precisa dessa permissão para avisar você sobre contas próximas do vencimento e outras movimentações importantes.
          </p>

          {notificationPermission === 'granted' ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-xl text-sm font-bold w-fit">
              <CheckCircle2 className="w-4 h-4" /> Notificações ativadas
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={requestNotificationPermission}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                Permitir
              </button>
              <button
                onClick={() => setNotificationPermission('denied')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                Agora não
              </button>
            </div>
          )}
          
          {notificationPermission === 'denied' && (
            <p className="text-xs text-red-500 mt-2">
              Permissão negada. Você pode ativá-la manualmente nas configurações do dispositivo.
            </p>
          )}
        </div>

        {/* Aplicativo Android Section */}
        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-gray-900">Aplicativo Android</h3>
          </div>

          {isCordova ? (
            // App is currently running natively
            <div>
              <div className="flex items-center gap-2 text-green-600 font-bold mb-2">
                <CheckCircle2 className="w-5 h-5" />
                ✅ Aplicativo instalado e em uso
              </div>
              <p className="text-sm text-indigo-700">
                Você já está utilizando a versão nativa do aplicativo.
              </p>
            </div>
          ) : isAndroidBrowser ? (
            // Running in Android Browser
            <div className="space-y-4">
              <div className="flex gap-2 items-start text-sm text-indigo-800 bg-indigo-100/50 p-3 rounded-xl">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  Não foi possível verificar automaticamente se o aplicativo está instalado neste navegador.
                </p>
              </div>
              <p className="text-sm text-indigo-700">
                Tenha o FinanceApp instalado no seu celular para receber notificações mesmo quando não estiver com o site aberto.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={DEEP_LINK}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir aplicativo
                </a>
                {apkUrl && (
                  <a
                    href={apkUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Baixar APK
                  </a>
                )}
              </div>
            </div>
          ) : (
            // Desktop or iOS Browser
            <div className="space-y-4">
              <p className="text-sm text-indigo-700">
                Tenha o FinanceApp instalado no seu celular Android para receber notificações mesmo quando não estiver com o site aberto.
              </p>
              {apkUrl ? (
                <a
                  href={apkUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Instalar APK
                </a>
              ) : (
                <p className="text-sm text-gray-500 italic">APK indisponível no momento.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
