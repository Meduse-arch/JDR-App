import { useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { useInventaire } from '../../hooks/useInventaire'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useItems } from '../../hooks/useItems'
import { useStats } from '../../hooks/useStats'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../utils/constants'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'
import { verifierCoutsFixes } from '../../utils/competenceUtils'
import { ItemCard } from '../../components/ItemCard'
import { InventaireEntry, CategorieItem } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { inventaireService } from '../../services/inventaireService'
import { rollDice, rollStatDice } from '../../utils/rollDice'
import { useToast } from '../../hooks/useToast'

export default function MonInventaire() {
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setDiceResult = useStore(s => s.setDiceResult)

  const { personnage, rechargerPersonnage, mettreAJourLocalement } = usePersonnage()
  const { inventaire, charger: chargerInventaire, setInventaire } = useInventaire(personnage?.id)
  const { stats } = useItems()
  const { rechargerStats } = useStats()
  const { toasts, afficherToast } = useToast()

  const [filtre, setFiltre] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [itemDetail, setItemDetail] = useState<InventaireEntry | null>(null)

  const appliquerEffets = async (effets: any[], sourceNom: string) => {
    if (!personnage) return {}
    const updates: any = {}
    
    // Couleurs par jauge
    const colors: Record<string, string> = { hp: '#ef4444', mana: '#3b82f6', stam: '#eab308', hp_max: '#dc2626', mana_max: '#2563eb', stam_max: '#ca8a04' }
    const labels: Record<string, string> = { hp: 'PV', mana: 'Mana', stam: 'Stamina', hp_max: 'PV Max', mana_max: 'Mana Max', stam_max: 'Stamina Max' }

    // 1. Vérifier si le personnage peut payer les coûts fixes
    const erreurCout = verifierCoutsFixes(effets, personnage, labels, sourceNom);
    if (erreurCout) {
      afficherToast(erreurCout);
      return null;
    }

    const diceResults: any[] = [];

    for (const effet of effets) {
      let finalValue = effet.valeur || 0
      const isCout = effet.valeur < 0 || effet.est_cout === true;

      // LOGIQUE DE DÉS
      if (effet.des_nb || effet.des_stat_id) {
        let rollRes;
        if (effet.des_stat_id) {
          const { data: sP } = await supabase.from('personnage_stats').select('valeur, stats(nom)').eq('id_personnage', personnage.id).eq('id_stat', effet.des_stat_id).single()
          const statsData: any = sP?.stats;
          rollRes = rollStatDice(sP?.valeur || 10, effet.valeur, (Array.isArray(statsData) ? statsData[0]?.nom : statsData?.nom) || 'Stat')
        } else {
          rollRes = rollDice(effet.des_nb, effet.des_faces || 6, effet.valeur)
        }
        finalValue = rollRes.total
        diceResults.push({ ...rollRes, label: `Effet sur ${labels[effet.cible_jauge] || 'Action'}`, color: colors[effet.cible_jauge] || '#ffffff', bonus: 0 })
      }

      if (isCout) {
        finalValue = -Math.abs(finalValue);
      }

      if (effet.est_jet_de) continue;

      const champ = effet.cible_jauge
      if (labels[champ]) {
        const actuel = Number(updates[champ] ?? (personnage as any)[champ] ?? 0)
        if (champ.includes('_max')) {
          updates[champ] = Math.max(0, actuel + finalValue)
        } else {
          const maxChamp = `${champ}_max`
          const max = Number((personnage as any)[maxChamp] ?? actuel + finalValue)
          updates[champ] = Math.max(0, Math.min(max, actuel + finalValue))
        }
      }
    }

    if (diceResults.length > 0) {
      setDiceResult(null);
      setTimeout(() => setDiceResult(diceResults), 10);
    }
    return updates
  }

  const utiliserItem = async (entry: InventaireEntry) => {
    if (!personnage) return
    const effets = entry.items.effets_actifs || []
    const updates = await appliquerEffets(effets, entry.items.nom)

    if (!updates) return // Validation failed

    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
      if (pnjControle?.id === personnage.id) setPnjControle({ ...pnjControle, ...updates })
    }

    await inventaireService.retirerItem(entry.id, 1)
    if (itemDetail?.id === entry.id) {
      if (entry.quantite <= 1) setItemDetail(null)
      else setItemDetail({ ...entry, quantite: entry.quantite - 1 })
    }
    await rechargerPersonnage()
    await rechargerStats()
    await chargerInventaire()
    afficherToast(`✨ ${entry.items.nom} utilisé !`)
  }

  const toggleEquiper = async (entry: InventaireEntry) => {
    if (!personnage) return
    const nouveauStatut = !entry.equipe

    // 1. Mise à jour optimiste immédiate pour l'UI
    setInventaire(prev => prev.map(e => e.id === entry.id ? {...e, equipe: nouveauStatut} : e))
    if (itemDetail?.id === entry.id) setItemDetail({ ...entry, equipe: nouveauStatut })

    // 3. Équiper/déséquiper en BDD
    await inventaireService.toggleEquipement(entry.id, nouveauStatut)

    // 4. Récupérer les nouveaux max depuis v_personnages (après équipement)
    const { data: updatedPerso } = await supabase
      .from('v_personnages')
      .select('hp_max, mana_max, stam_max')
      .eq('id', personnage.id)
      .single()

    if (!updatedPerso) return

    let base_stats = {
      hp: personnage.hp || 0,
      mana: personnage.mana || 0,
      stam: personnage.stam || 0
    }

    if (nouveauStatut) {
      // Appliquer les effets immédiats (potions passives, buffs à l'équipement)
      const effets = (entry.items as any).effets_actifs || []
      const bonus_equip = await appliquerEffets(effets, entry.items.nom)
      if (bonus_equip) {
        if (bonus_equip.hp) base_stats.hp = bonus_equip.hp
        if (bonus_equip.mana) base_stats.mana = bonus_equip.mana
        if (bonus_equip.stam) base_stats.stam = bonus_equip.stam
      }
    }

    // 6. Clamp au nouveau max dans tous les cas (équipement ET déséquipement)
    const final_hp = Math.max(0, Math.min(updatedPerso.hp_max, base_stats.hp))
    const final_mana = Math.max(0, Math.min(updatedPerso.mana_max, base_stats.mana))
    const final_stam = Math.max(0, Math.min(updatedPerso.stam_max, base_stats.stam))

    // 7. Mettre à jour le state local et la BDD via le hook (qui gère la synchro avec v_personnages)
    const fullUpdates = {
      hp: final_hp,
      mana: final_mana,
      stam: final_stam
    }
    await mettreAJourLocalement(fullUpdates)

    await rechargerStats()
    afficherToast(nouveauStatut ? `⚔️ ${entry.items.nom} équipé !` : `🔓 ${entry.items.nom} rangé`)
  }

  const itemsFiltrés = inventaire.filter(e => (filtre === 'Tous' || e.items.categorie === filtre) && e.items.nom.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight gradient-title">
          🎒 Sac d'Aventure
        </h2>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
          <input 
            type="text" placeholder="Rechercher un objet..." value={recherche} onChange={e => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none transition-all font-bold"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex gap-2 p-1 rounded-xl overflow-x-auto custom-scrollbar shrink-0" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {['Tous', ...CATEGORIES].map(cat => (
            <button
              key={cat} onClick={() => setFiltre(cat)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-1 ${filtre === cat ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
              style={{ backgroundColor: filtre === cat ? 'var(--color-main)' : 'transparent' }}
            >
              {cat !== 'Tous' && <span className="text-xs">{CATEGORIE_EMOJI[cat as CategorieItem]}</span>}
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
        {itemsFiltrés.map(entry => (
          <ItemCard 
            key={entry.id} 
            entry={entry} 
            onUtiliser={utiliserItem} 
            onEquiper={toggleEquiper} 
            onClick={setItemDetail}
            labelModif={m => formatLabelModif(m, stats)} 
            labelEffet={e => formatLabelEffet(e, stats)}
            modifs={entry.items.modificateurs || []}
          />
        ))}
        {itemsFiltrés.length === 0 && <div className="col-span-full py-20 text-center opacity-20 font-black uppercase italic">Le sac est vide...</div>}
      </div>

      {/* MODAL DETAIL */}
      {itemDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-pointer" onClick={() => setItemDetail(null)}>
          <Card className="max-w-md w-full p-8 gap-6 animate-in zoom-in duration-200 shadow-2xl relative overflow-hidden cursor-default" onClick={e => e.stopPropagation()}>
            {/* Accent Visuel */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-main" />
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-4xl shrink-0">
                  {CATEGORIE_EMOJI[itemDetail.items.categorie]}
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{itemDetail.items.nom}</h3>
                  <Badge variant="ghost" className="uppercase text-[10px] opacity-50">{itemDetail.items.categorie}</Badge>
                </div>
              </div>
              <button className="text-2xl opacity-20 hover:opacity-100 transition-opacity" onClick={() => setItemDetail(null)}>✕</button>
            </div>

            <div className="flex flex-col gap-6">
              {itemDetail.items.description && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 italic text-sm opacity-80 leading-relaxed">
                  "{itemDetail.items.description}"
                </div>
              )}

              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Propriétés & Effets :</p>
                <div className="flex flex-wrap gap-2">
                  {itemDetail.items.modificateurs?.map((m, i) => (
                    <span key={`m-${i}`} className="px-3 py-1.5 rounded-xl bg-main/10 border border-main/20 text-main font-bold text-xs">
                      {formatLabelModif(m as any, stats)}
                    </span>
                  ))}
                  {itemDetail.items.effets_actifs?.map((e, i) => (
                    <span key={`e-${i}`} className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs">
                      {formatLabelEffet(e as any, stats)}
                    </span>
                  ))}
                  {((!itemDetail.items.modificateurs || itemDetail.items.modificateurs.length === 0) && (!itemDetail.items.effets_actifs || itemDetail.items.effets_actifs.length === 0)) && (
                    <p className="text-xs opacity-30 italic">Aucun effet particulier.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {itemDetail.items.categorie === 'Consommable' ? (
                  <Button className="flex-1" onClick={() => utiliserItem(itemDetail)}>✨ Utiliser (x{itemDetail.quantite})</Button>
                ) : (
                  <Button className="flex-1" variant={itemDetail.equipe ? 'secondary' : 'primary'} onClick={() => toggleEquiper(itemDetail)}>
                    {itemDetail.equipe ? '🔓 Ranger dans le sac' : '⚔️ Équiper l\'objet'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-6 py-3 rounded-2xl bg-card border border-main/30 text-main font-black shadow-2xl animate-in slide-in-from-right-full">{t.msg}</div>
        ))}
      </div>
    </div>
  )
}
