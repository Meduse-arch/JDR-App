import { rollDice, rollStatDice } from '../utils/rollDice'
import { statsEngine } from '../utils/statsEngine'

const db = (window as any).db;

export interface StatValeur {
  id: string
  nom: string
  description: string
  valeur: number
  base: number
  bonus: number
}

export const statsService = {
  getBuffRolls: async (idPersonnage: string): Promise<Record<string, number>> => {
    if (!idPersonnage) return {}
    const res = await db.personnage_buff_rolls.getAll();
    if (!res.success) return {};

    const map: Record<string, number> = {}
    res.data.filter((r: any) => r.id_personnage === idPersonnage).forEach((row: any) => { map[row.cache_key] = row.valeur })
    return map
  },

  saveBuffRoll: async (idPersonnage: string, cacheKey: string, valeur: number) => {
    if (!idPersonnage || !cacheKey) return;
    const res = await db.personnage_buff_rolls.getAll();
    if (!res.success) return;
    const existing = res.data.find((r: any) => r.id_personnage === idPersonnage && r.cache_key === cacheKey);

    if (existing) {
      await db.personnage_buff_rolls.update(existing.id, { valeur });
    } else {
      await db.personnage_buff_rolls.create({
        id: crypto.randomUUID(),
        id_personnage: idPersonnage,
        cache_key: cacheKey,
        valeur,
        created_at: new Date().toISOString()
      });
    }
  },

  cleanupObsoleteBuffRolls: async (idPersonnage: string, activeKeys: Set<string>) => {
    const res = await db.personnage_buff_rolls.getAll();
    if (!res.success) return;
    const obsoletes = res.data
      .filter((r: any) => r.id_personnage === idPersonnage && !activeKeys.has(r.cache_key));

    for (const obs of obsoletes) {
      await db.personnage_buff_rolls.delete(obs.id);
    }
  },

  calculateAllStats: async (
    idPersonnage: string, 
    buffRollsCache: Record<string, number>,
    onNewRoll: (cacheKey: string, val: number) => Promise<void>
  ): Promise<StatValeur[]> => {
    const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme'];

    // MIGRATION: était des jointures SQL complexes
    const resBaseStats = await db.personnage_stats.getAll();
    const resStatsTable = await db.stats.getAll();
    if (!resBaseStats.success || !resStatsTable.success) return [];

    const baseStats = resBaseStats.data
      .filter((s: any) => s.id_personnage === idPersonnage)
      .map((s: any) => ({
        ...s,
        stats: resStatsTable.data.find((st: any) => st.id === s.id_stat)
      }));

    const resInv = await db.inventaire.getAll();
    const resItems = await db.items.getAll();
    const resModifs = await db.modificateurs.getAll();
    const resItemTags = await db.item_tags.getAll();

    const equipement = resInv.success ? resInv.data.filter((i: any) => i.id_personnage === idPersonnage && i.equipe === 1).map((inv: any) => {
      const item = resItems.success ? resItems.data.find((it: any) => it.id === inv.id_item) : null;
      const modifs = item && resModifs.success ? resModifs.data.filter((m: any) => m.id_item === item.id) : [];
      const iTags = item && resItemTags.success ? resItemTags.data.filter((it: any) => it.id_item === item.id) : [];
      return {
        id: inv.id,
        equipe: inv.equipe === 1,
        items: item ? { modificateurs: modifs, item_tags: iTags } : null
      };
    }) : [];

    const equippedTagIds = new Set<string>();
    equipement.forEach((inv: any) => {
      inv.items?.item_tags?.forEach((it: any) => { if (it.id_tag) equippedTagIds.add(it.id_tag) });
    });

    const directModifs = resModifs.success ? resModifs.data.filter((m: any) => m.id_personnage === idPersonnage) : [];

    const resPComp = await db.personnage_competences.getAll();
    const resComps = await db.competences.getAll();
    
    const compAcquisesRaw = resPComp.success ? resPComp.data.filter((pc: any) => pc.id_personnage === idPersonnage).map((pc: any) => {
      const comp = resComps.success ? resComps.data.find((c: any) => c.id === pc.id_competence) : null;
      const modifs = comp && resModifs.success ? resModifs.data.filter((m: any) => m.id_competence === comp.id) : [];
      return {
        id: pc.id,
        is_active: pc.is_active === 1,
        competences: comp ? { ...comp, modificateurs: modifs } : null
      };
    }) : [];

    const compAcquisesMap = new Map<string, any>();
    compAcquisesRaw.forEach((entry: any) => {
      const c = entry.competences;
      if (!c) return;
      if (!compAcquisesMap.has(c.id) || entry.is_active) compAcquisesMap.set(c.id, entry);
    });
    const compAcquises = Array.from(compAcquisesMap.values());

    const toggleEntries = compAcquises.filter((entry: any) =>
      entry.is_active === true && entry.competences?.type === 'passive_toggle'
    );
    const activeToggleIds = toggleEntries.map((entry: any) => entry.competences.id);
    const activeTagsPool = new Set<string>(equippedTagIds);

    const resCompTags = await db.competence_tags.getAll();
    if (activeToggleIds.length > 0 && resCompTags.success) {
      const toggleTags = resCompTags.data.filter((ct: any) => activeToggleIds.includes(ct.id_competence));
      toggleTags.forEach((tt: any) => { if (tt.id_tag) activeTagsPool.add(tt.id_tag) });
    }

    const bonusFixes: Record<string, number> = {};
    const bonusPct: Record<string, number> = {};
    const clesActives = new Set<string>();

    const accumulerBonus = async (modificateurs: any[], sourceId: string) => {
      if (!modificateurs) return;
      for (const m of modificateurs) {
        let val = m.valeur || 0;

        if (m.type_calcul === 'roll_dice' || m.type_calcul === 'roll_stat') {
          const cacheKey = `${sourceId}-${m.id}`;
          clesActives.add(cacheKey);

          if (buffRollsCache[cacheKey] !== undefined) {
            val = buffRollsCache[cacheKey];
          } else {
            let newRoll = 0;
            if (m.type_calcul === 'roll_dice') {
              newRoll = rollDice(m.des_nb || 1, m.des_faces || 6, m.valeur || 0).total;
            } else {
              const statRollBase = baseStats.find((s: any) => s.id_stat === m.des_stat_id);
              const valeurBaseRoll = statRollBase?.valeur || 10;
              const statsData: any = statRollBase?.stats;
              const nomBaseRoll = (Array.isArray(statsData) ? statsData[0]?.nom : statsData?.nom) || 'Stat';
              newRoll = rollStatDice(valeurBaseRoll, m.valeur || 0, nomBaseRoll).total;
            }
            await onNewRoll(cacheKey, newRoll);
            buffRollsCache[cacheKey] = newRoll;
            val = newRoll;
          }
        }

        if (!m.id_stat) continue;

        if (m.type_calcul === 'pourcentage') {
          bonusPct[m.id_stat] = (bonusPct[m.id_stat] || 0) + val;
        } else {
          bonusFixes[m.id_stat] = (bonusFixes[m.id_stat] || 0) + val;
        }
      }
    };

    for (const entry of equipement) await accumulerBonus(entry.items?.modificateurs, entry.id);
    if (directModifs.length > 0) await accumulerBonus(directModifs, idPersonnage);

    for (const entry of compAcquises) {
      const c = entry.competences;
      if (!c || c.type === 'passive_toggle') continue;
      if (c.type === 'passive_auto' && !c.condition_type) await accumulerBonus(c.modificateurs, entry.id);
    }
    
    const passiveAutoComps = compAcquises.filter((entry: any) => {
      const c = entry.competences;
      return c && c.type === 'passive_auto' && ['item', 'les_deux'].includes(c.condition_type);
    });

    for (const entry of passiveAutoComps) {
      const pc = entry.competences;
      const condTags = resCompTags.success ? resCompTags.data.filter((ct: any) => ct.id_competence === pc.id) : [];
      const condTagIds = condTags.map((ct: any) => ct.id_tag);
      if (Array.from(activeTagsPool).some(tid => condTagIds.includes(tid))) {
        await accumulerBonus(pc.modificateurs, entry.id);
      }
    }

    for (const entry of toggleEntries) await accumulerBonus(entry.competences.modificateurs, entry.id);

    await statsService.cleanupObsoleteBuffRolls(idPersonnage, clesActives);

    const statsCibles = baseStats.filter((d: any) => d.stats && !['PV Max', 'Mana Max', 'Stamina Max'].includes(d.stats.nom));
    const formatted = statsCibles.map((d: any) => {
      const fixe = bonusFixes[d.id_stat] || 0;
      const pct = bonusPct[d.id_stat] || 0;
      const valeurFinale = statsEngine.calculerValeurFinale(d.valeur, fixe, pct);
      return {
        id: d.stats.id,
        nom: d.stats.nom,
        description: d.stats.description,
        base: d.valeur,
        bonus: valeurFinale - d.valeur,
        valeur: valeurFinale
      };
    });

    return statsEngine.trierStats(formatted, ORDRE_STATS);
  }
}