import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { v4 as uuidv4 } from 'uuid';
import type { PasswordEntry } from '../types';
import { Lock, Eye, EyeOff, Copy, Plus, X, Pencil, Trash2, Search, KeyRound } from 'lucide-react';

// Simple obfuscation for MVP (not true encryption - noted for Supabase phase)
const obfuscate = (str: string) => btoa(unescape(encodeURIComponent(str)));
const deobfuscate = (str: string) => { try { return decodeURIComponent(escape(atob(str))); } catch { return str; } };

function PasswordForm({ entry, onClose }: { entry?: PasswordEntry; onClose: () => void }) {
  const [title, setTitle] = useState(entry?.title || '');
  const [username, setUsername] = useState(entry?.username || '');
  const [password, setPassword] = useState(entry ? deobfuscate(entry.password) : '');
  const [url, setUrl] = useState(entry?.url || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [showPw, setShowPw] = useState(false);

  const handleSave = async () => {
    if (!title || !password) return;
    const now = new Date();
    if (entry) {
      await db.passwords.update(entry.id, { title, username, password: obfuscate(password), url, notes, updated_at: now });
    } else {
      await db.passwords.add({ id: uuidv4(), title, username, password: obfuscate(password), url, notes, created_at: now, updated_at: now });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-[2rem] w-full max-w-md p-6 pb-10 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-900">{entry ? 'Editar Senha' : 'Nova Senha'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="space-y-4">
          <input type="text" placeholder="Título (ex: Instagram, Banco)" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400" />
          <input type="text" placeholder="Usuário / E-mail" value={username} onChange={e => setUsername(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400" />
          
          <div className="relative">
            <input 
              type={showPw ? 'text' : 'password'} 
              placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-blue-400"
            />
            <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-700">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <input type="url" placeholder="URL (opcional)" value={url} onChange={e => setUrl(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400" />
          <textarea placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 resize-none" />

          <button onClick={handleSave} className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition shadow-sm text-base">
            {entry ? 'Salvar Alterações' : 'Salvar Senha'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordCard({ entry, onEdit, onDelete }: { entry: PasswordEntry; onEdit: () => void; onDelete: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(deobfuscate(entry.password));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-gray-500" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 truncate">{entry.title}</h4>
            {entry.username && <p className="text-xs text-gray-400 truncate">{entry.username}</p>}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-full transition text-gray-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
        <span className="flex-1 font-mono text-sm text-gray-700 truncate">
          {showPw ? deobfuscate(entry.password) : '••••••••••••'}
        </span>
        <button onClick={() => setShowPw(!showPw)} className="text-gray-400 hover:text-gray-700 p-1">
          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button onClick={handleCopy} className={`p-1 transition ${copied ? 'text-green-500' : 'text-gray-400 hover:text-gray-700'}`}>
          <Copy className="w-4 h-4" />
        </button>
      </div>
      {copied && <p className="text-xs text-green-600 font-bold mt-1 text-right">Copiado!</p>}
      {entry.notes && <p className="text-xs text-gray-400 mt-2">{entry.notes}</p>}
    </div>
  );
}

export function PasswordsView() {
  const passwords = useLiveQuery(() => db.passwords.toArray(), []) || [];
  const [search, setSearch] = useState('');
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<PasswordEntry | null>(null);

  const filtered = passwords.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Excluir esta senha?')) await db.passwords.delete(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="bg-gray-900 p-6 rounded-[2rem] shadow-md text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-white font-black text-xl mb-1 flex items-center gap-2">
            <Lock className="w-5 h-5" /> Cofre de Senhas
          </h2>
          <p className="text-gray-400 text-sm">{passwords.length} {passwords.length === 1 ? 'senha salva' : 'senhas salvas'}</p>
        </div>
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Lock className="w-40 h-40" />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text" placeholder="Buscar senha..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 shadow-sm"
        />
      </div>

      {/* List */}
      <div className="flex justify-between items-center px-1">
        <span className="text-sm font-bold text-gray-500">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</span>
        <button
          onClick={() => setForming(true)}
          className="flex items-center gap-1 bg-gray-900 text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-gray-800 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-[2rem] border border-dashed border-gray-300">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium text-sm mb-4">Nenhuma senha encontrada.</p>
          <button onClick={() => setForming(true)} className="text-blue-600 font-bold text-sm hover:underline">
            Adicionar minha primeira senha →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(entry => (
            <PasswordCard
              key={entry.id}
              entry={entry}
              onEdit={() => setEditing(entry)}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}

      {forming && <PasswordForm onClose={() => setForming(false)} />}
      {editing && <PasswordForm entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
