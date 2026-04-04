import { useState } from 'react';
import { Link2, Copy, Plus, FolderOpen, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTrip } from '@/hooks/useTrip';
import { toast } from 'sonner';

export function TripSharingDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const [copied, setCopied] = useState(false);
  const {
    hydrated,
    tripName,
    setTripName,
    activeTripId,
    listTrips,
    createNewTrip,
    switchToTrip,
    deleteTrip,
    getShareUrl,
    getShareCode,
    importFromEncoded,
  } = useTrip();

  const trips = listTrips();

  const copyLink = async () => {
    try {
      const url = getShareUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiato negli appunti');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossibile copiare il link');
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(getShareCode());
      toast.success('Codice viaggio copiato');
    } catch {
      toast.error('Impossibile copiare');
    }
  };

  const extractPayload = (raw: string): string => {
    const t = raw.trim();
    const hashIdx = t.indexOf('#t=');
    if (hashIdx >= 0) {
      const part = t.slice(hashIdx + 3).split(/[&#]/)[0] || '';
      return decodeURIComponent(part);
    }
    if (t.startsWith('http')) {
      try {
        const u = new URL(t);
        if (u.hash.startsWith('#t=')) {
          return decodeURIComponent(u.hash.slice(3).split(/[&#]/)[0] || '');
        }
      } catch {
        /* fallthrough */
      }
    }
    return t;
  };

  const handleImport = () => {
    const raw = paste.trim();
    if (!raw) {
      toast.error('Incolla un link o il payload dopo #t=');
      return;
    }
    try {
      const encoded = extractPayload(raw);
      importFromEncoded(encoded, { asNewTrip: false });
      toast.success('Itinerario applicato al viaggio attuale');
      setPaste('');
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Codice o link non valido');
    }
  };

  const handleImportAsNew = () => {
    const raw = paste.trim();
    if (!raw) {
      toast.error('Incolla un link o il payload');
      return;
    }
    try {
      const encoded = extractPayload(raw);
      importFromEncoded(encoded, { asNewTrip: true });
      toast.success('Nuovo viaggio creato dalla condivisione');
      setPaste('');
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Codice o link non valido');
    }
  };

  if (!hydrated) {
    return <>{children}</>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Itinerari e condivisione
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div>
            <label className="text-white/60 text-xs block mb-1">Nome del viaggio attuale</label>
            <Input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
              placeholder="es. Giappone con Marco — aprile"
            />
            <p className="text-white/40 text-xs mt-1">
              Codice viaggio (sul tuo browser):{' '}
              <span className="text-white/80 font-mono">{activeTripId}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copyLink} className="bg-red-600 hover:bg-red-700">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              Copia link condivisibile
            </Button>
            <Button type="button" variant="outline" className="border-white/30 text-white" onClick={copyCode}>
              Copia codice
            </Button>
          </div>
          <p className="text-white/50 text-xs">
            Invia il <strong>link</strong> a un amico: aprendolo carica lo stesso itinerario (attrazioni, hotel
            personalizzati, giorni, budget). Ogni modifica si salva in automatico sul proprio dispositivo: per
            aggiornare gli altri, rimanda il link dopo le modifiche. Per un altro gruppo o un altro viaggio, crea un
            nuovo itinerario qui sotto.
          </p>

          <div className="border-t border-white/10 pt-4 space-y-2">
            <p className="text-white/70 text-sm font-medium">Incolla link o codice</p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="Incolla qui l’URL completo oppure solo la parte dopo #t=..."
              rows={3}
              className="w-full rounded-md bg-white/10 border border-white/20 text-white text-sm p-3 placeholder:text-white/40 resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={handleImport}>
                Applica al viaggio attuale
              </Button>
              <Button type="button" variant="secondary" onClick={handleImportAsNew}>
                Apri come nuovo viaggio
              </Button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white/70 text-sm font-medium">I tuoi itinerari</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/30 text-white h-8"
                onClick={() => {
                  createNewTrip();
                  toast.success('Nuovo itinerario creato');
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nuovo
              </Button>
            </div>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {trips
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((t) => (
                  <li
                    key={t.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                      t.id === activeTripId ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5'
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left flex items-center gap-2 min-w-0"
                      onClick={() => {
                        switchToTrip(t.id);
                        toast.message('Itinerario attivo cambiato');
                      }}
                    >
                      <FolderOpen className="w-4 h-4 shrink-0 text-white/50" />
                      <span className="truncate">{t.name}</span>
                      {t.id === activeTripId && (
                        <span className="text-xs text-red-300 shrink-0">(attivo)</span>
                      )}
                    </button>
                    {trips.length > 1 && (
                      <button
                        type="button"
                        className="p-1.5 rounded text-white/40 hover:text-red-400 hover:bg-white/10"
                        aria-label="Elimina itinerario"
                        onClick={() => {
                          if (confirm(`Eliminare «${t.name}»?`)) {
                            deleteTrip(t.id);
                            toast.success('Itinerario eliminato');
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
