import { APP_VERSION } from '../config/version';

export function AndroidAppView({ mode }: { mode: 'download' | 'info' }) {
  const apkUrl = import.meta.env.VITE_ANDROID_APK_URL;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 text-center">
          <span className="text-4xl mb-4 block">📱</span>
          <h2 className="text-2xl font-black mb-2">Finance App</h2>
          <p className="text-indigo-200 text-sm mb-6">Tenha o aplicativo no seu Android.</p>
          <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold mb-4">
            Versão {APP_VERSION}
          </div>
        </div>
      </div>

      {mode === 'download' && (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black mb-4 text-center">Baixar APK</h3>
          
          {apkUrl ? (
            <>
              <p className="text-gray-500 text-sm text-center mb-6">
                Clique no botão abaixo para baixar o instalador oficial.
              </p>
              <a 
                href={apkUrl}
                download
                className="w-full block text-center bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-sm active:scale-95 transition-transform"
              >
                BAIXAR APK
              </a>
            </>
          ) : (
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-2xl text-sm font-medium text-center">
              ⚠️ Download do APK ainda não configurado.
            </div>
          )}
        </div>
      )}

      {(mode === 'info' || mode === 'download') && (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-lg font-black mb-2">📱 Como Instalar?</h3>
          <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700 font-medium">
            <li>Baixe o arquivo APK usando o botão acima.</li>
            <li>Abra o arquivo baixado no seu celular.</li>
            <li>O Android pedirá permissão para <b>Instalar apps desconhecidos</b>. Autorize para o seu navegador ou gerenciador de arquivos.</li>
            <li>Conclua a instalação.</li>
            <li>Abra o Finance App e use normalmente.</li>
          </ol>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs font-bold text-gray-500 flex gap-3">
            <span className="text-lg">🔐</span>
            <p>Seus dados locais ficam armazenados neste dispositivo. O aplicativo não os envia para a nuvem sem o seu consentimento explícito (Backup local).</p>
          </div>
        </div>
      )}
    </div>
  );
}
