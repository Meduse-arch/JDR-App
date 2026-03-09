import { useState, useEffect, useCallback } from 'react';
import { competenceService } from '../services/competenceService';
import { Competence } from '../types';

export function useCompetences() {
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [chargement, setChargement] = useState(false);

  const chargerCompetences = useCallback(async () => {
    setChargement(true);
    const data = await competenceService.getCompetences();
    setCompetences(data);
    setChargement(false);
  }, []);

  useEffect(() => {
    chargerCompetences();
  }, [chargerCompetences]);

  const supprimerCompetence = async (id: string) => {
    const success = await competenceService.deleteCompetence(id);
    if (success) {
      setCompetences(prev => prev.filter(c => c.id !== id));
    }
    return success;
  };

  const creerCompetence = async (data: { nom: string; description: string; type: string }) => {
    const newComp = await competenceService.createCompetence(data);
    if (newComp) {
      setCompetences(prev => [...prev, newComp].sort((a, b) => a.nom.localeCompare(b.nom)));
    }
    return newComp;
  };

  return {
    competences,
    chargement,
    chargerCompetences,
    supprimerCompetence,
    creerCompetence
  };
}
