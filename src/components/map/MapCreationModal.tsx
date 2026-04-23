import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../supabase';
import { ImageGalerie } from '../../types';
import { X, ImageIcon, Layout, Grid3X3, Save, Plus, Maximize2 } from 'lucide-react';

interface MapCreationModalProps {
  sessionId: string;
  onClose: () => void;
  onSubmit: (data: { nom: string, image_url: string, largeur: number, hauteur: number, grille_taille: number }) => void;
  initialData?: { nom: string, image_url: string, largeur: number, hauteur: number, grille_taille: number };
}

export function MapCreationModal({ sessionId, onClose, onSubmit, initialData }: MapCreationModalProps) {
  const { mode, navigationMode } = useStore();
  const [tab, setTab] = useState<'nouvelle' | 'galerie'>('nouvelle');
  const [nom, setNom] = useState(initialData?.nom || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [largeur, setLargeur] = useState(initialData?.largeur || 20);
  const [hauteur, setHauteur] = useState(initialData?.hauteur || 15);
  const [grilleTaille, setGrilleTaille] = useState(initialData?.grille_taille || 50);

  const [images, setImages] = useState<ImageGalerie[]>([]);
  const [loadingGalerie, setLoadingGalerie] = useState(false);
  const [newImageGalerie, setNewImageGalerie] = useState('');

  useEffect(() => {
    if (tab === 'galerie') loadGalerie();
  }, [tab]);

  const loadGalerie = async () => {
    setLoadingGalerie(true);
    const { data } = await supabase
      .from('images')
      .select('*')
      .eq('id_session', sessionId)
      .eq('type', 'map');
    if (data) setImages(data as ImageGalerie[]);
    setLoadingGalerie(false);
  };

  const handleAjouterGalerie = async () => {
    if (!newImageGalerie) return;
    const { data } = await supabase
      .from('images')
      .insert({ id_session: sessionId, url: newImageGalerie, type: 'map' })
      .select()
      .single();
    if (data) {
      setImages([...images, data as ImageGalerie]);
      setNewImageGalerie('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ nom, image_url: imageUrl, largeur, hauteur, grille_taille: grilleTaille });
  };

  return createPortal(
    <div className={`fixed ${navigationMode === 'basic' ? 'top-16 left-[72px]' : 'top-0 left-0'} right-0 bottom-0 z-[50] ${mode} bg-app backdrop-blur-md flex flex-col lg:flex-row animate-in fade-in duration-300 overflow-hidden`}>

      {/* GAUCHE : Panneau de configuration — largeur fixe, hauteur 100%, flex column */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col h-[40vh] lg:h-full bg-card border-r border-white/10 shadow-2xl z-10 medieval-border">

        {/* Header fixe */}
        <div className="flex-shrink-0 p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-cinzel text-theme-main drop-shadow-md flex items-center gap-2">
            <Layout size={20} />
            {initialData ? 'Modifier la carte' : 'Créer une carte'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Onglets fixe */}
        <div className="flex-shrink-0 px-5 pt-5">
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setTab('nouvelle')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-cinzel tracking-wider transition-all ${tab === 'nouvelle' ? 'bg-theme-main text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
              <Layout size={14} /> Réglages
            </button>
            <button
              onClick={() => setTab('galerie')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-cinzel tracking-wider transition-all ${tab === 'galerie' ? 'bg-theme-main text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
              <ImageIcon size={14} /> Galerie
            </button>
          </div>
        </div>

        {/* Contenu scrollable — flex-1 + overflow-y-auto */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {tab === 'nouvelle' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 animate-in slide-in-from-left-2 duration-300">

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold px-1">Nom de la carte</label>
                <Input
                  placeholder="ex: Temple Maudit"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  required
                  className="bg-black/40 border-white/10 focus:border-theme-main/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold px-1">URL de l'image</label>
                <Input
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="bg-black/40 border-white/10 focus:border-theme-main/50"
                />
                {imageUrl && (
                  <p className="text-[10px] text-green-400 mt-1 italic flex items-center gap-1 px-1">
                    <span>✓</span> Image sélectionnée
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold px-1 flex items-center gap-1">
                    <Maximize2 size={10} /> Largeur
                  </label>
                  <Input
                    type="number"
                    value={largeur || ''}
                    onChange={e => setLargeur(parseInt(e.target.value) || 1)}
                    required
                    className="bg-black/40 border-white/10 focus:border-theme-main/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold px-1 flex items-center gap-1">
                    <Maximize2 size={10} className="rotate-90" /> Hauteur
                  </label>
                  <Input
                    type="number"
                    value={hauteur || ''}
                    onChange={e => setHauteur(parseInt(e.target.value) || 1)}
                    required
                    className="bg-black/40 border-white/10 focus:border-theme-main/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold px-1 flex items-center gap-1">
                  <Grid3X3 size={10} /> Taille de case (px)
                </label>
                <Input
                  type="number"
                  value={grilleTaille || ''}
                  onChange={e => setGrilleTaille(parseInt(e.target.value) || 10)}
                  required
                  className="bg-black/40 border-white/10 focus:border-theme-main/50"
                />
              </div>

              {/* Bouton submit — toujours visible car dans le scroll */}
              <div className="pt-2 pb-2">
                <button
                  type="submit"
                  className="w-full bg-theme-main text-white hover:bg-theme-main/80 font-cinzel py-4 text-base tracking-[0.2em] flex items-center justify-center gap-3 rounded shadow-[0_0_20px_rgba(var(--color-theme-main),0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {initialData ? <Save size={18} /> : <Plus size={18} />}
                  {initialData ? 'Enregistrer' : 'Créer la carte'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4 animate-in slide-in-from-right-2 duration-300">
              <div className="flex gap-2">
                <Input
                  placeholder="URL d'une image..."
                  value={newImageGalerie}
                  onChange={e => setNewImageGalerie(e.target.value)}
                  className="flex-1 bg-black/40 border-white/10 focus:border-theme-main/50"
                />
                <Button size="sm" onClick={handleAjouterGalerie} className="shrink-0 bg-theme-main hover:bg-theme-main/80">
                  <Plus size={16} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {loadingGalerie ? (
                  <div className="col-span-2 text-center py-12 text-white/20 animate-pulse font-cinzel">Chargement...</div>
                ) : images.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-white/20 italic text-sm font-cinzel">Galerie vide</div>
                ) : (
                  images.map(img => (
                    <div
                      key={img.id}
                      className={`relative aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all group ${imageUrl === img.url ? 'border-theme-main ring-2 ring-theme-main/20 shadow-lg scale-[0.98]' : 'border-transparent hover:border-white/20 hover:scale-[1.02]'}`}
                      onClick={() => {
                        setImageUrl(img.url);
                        if (!nom) {
                          try {
                            const urlParts = img.url.split('/');
                            const fileName = urlParts[urlParts.length - 1];
                            const nameWithoutExt = fileName.split('.')[0];
                            const decodedName = decodeURIComponent(nameWithoutExt)
                              .replace(/[-_]/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase());
                            setNom(decodedName);
                          } catch (e) {
                            console.error('Erreur extraction nom:', e);
                          }
                        }
                        setTab('nouvelle');
                      }}
                    >
                      <img src={img.url} alt="Galerie" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-theme-main/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-1 rounded border border-white/20 tracking-widest">UTILISER</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DROITE : Prévisualisation */}
      <div className="flex-1 h-full relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 to-black flex items-center justify-center p-8 lg:p-16">

        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />

        <div className="relative shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden transition-all duration-500 ease-out"
          style={{
            aspectRatio: `${largeur} / ${hauteur}`,
            maxWidth: '100%',
            maxHeight: '80vh',
            width: '100%',
            backgroundColor: '#050505',
          }}>

          {/* Image — object-contain : toujours visible en entier, sans rognage */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="preview"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ objectFit: 'contain', opacity: 0.85 }}
              draggable={false}
            />
          )}

          {/* Grille SVG — calquée sur les cases, pas sur les pixels */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${largeur} ${hauteur}`}
            preserveAspectRatio="none"
          >
            {Array.from({ length: largeur + 1 }, (_, x) => (
              <line key={`v${x}`} x1={x} y1={0} x2={x} y2={hauteur} stroke="rgba(255,255,255,0.2)" strokeWidth={0.05} />
            ))}
            {Array.from({ length: hauteur + 1 }, (_, y) => (
              <line key={`h${y}`} x1={0} y1={y} x2={largeur} y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth={0.05} />
            ))}
          </svg>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-black/80 backdrop-blur-xl rounded-full border border-theme-main/30 flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
            <span className="text-white/30 text-[10px] uppercase font-bold tracking-[0.3em]">Dimensions</span>
            <span className="text-theme-main font-cinzel text-2xl drop-shadow-[0_0_10px_rgba(var(--color-theme-main),0.5)]">
              {largeur} <span className="text-white/20 mx-1">x</span> {hauteur}
            </span>
            <span className="text-white/30 text-[10px] uppercase font-bold tracking-[0.3em]">Cases</span>
          </div>

          <div className="absolute top-5 right-5 text-white/20 font-cinzel text-[10px] uppercase tracking-[0.4em] pointer-events-none select-none flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500/50 animate-pulse" />
            Aperçu dynamique
          </div>
        </div>

        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/10 font-cinzel text-xs tracking-widest uppercase pointer-events-none">
          Prévisualisation du rendu final
        </div>
      </div>
    </div>,
    document.body
  );
}
