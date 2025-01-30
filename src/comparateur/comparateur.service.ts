// src/comparateur/comparateur.service.ts
import { Injectable } from '@nestjs/common';
import { ProduitService } from '../produit/produit.service';
import { OffreService } from '../offre/offre.service';
import { HistoriquePrixService } from '../historique-prix/historique-prix.service';
import { TypePrixEnum } from '@prisma/client';

@Injectable()
export class ComparateurService {
  constructor(
    private readonly produitService: ProduitService,
    private readonly offreService: OffreService,
    private readonly historiquePrixService: HistoriquePrixService,
  ) {}

  // Comparaison automatique
  async comparerProduitsAutomatiquement(criteres?: any) {
    const produitsResponse = await this.produitService.lireProduits();
    const produits = produitsResponse.data;
    const offres = (await this.offreService.findAllOffres({})).data;
    const historiquesPrix = await Promise.all(
      produits.data.map((produit) =>
        this.historiquePrixService.lireHistoriquePrix(
          produit.id_Produit,
          TypePrixEnum.PRODUIT,
          1,
          10,
        ),
      ),
    );

    const resultats = produits.data.map((produit, index) => ({
      produit,
      offres: offres.filter((offre) => offre.id_produit === produit.id_Produit),
      historique: historiquesPrix[index]?.data || [],
    }));

    // Appliquer les critères automatiques (exemple : tri par prix initial)
    return resultats.sort((a, b) => a.produit.prixInitial - b.produit.prixInitial);
  }

  // Comparaison manuelle
  async comparerProduitsManuellement(idsProduits: string[]) {
    const produits = await Promise.all(
      idsProduits.map((id) => this.produitService.findOneProduit(id)),
    );

    const offres = await Promise.all(
      produits.map((produit) =>
        this.offreService.findOneOffre(produit.id_Produit),
      ),
    );

    const historiquesPrix = await Promise.all(
      produits.map((produit) =>
        this.historiquePrixService.lireHistoriquePrix(
          produit.id_Produit,
          TypePrixEnum.PRODUIT,
          1,
          10,
        ),
      ),
    );

    return produits.map((produit, index) => ({
      produit,
      offres: offres[index] || [],
      historique: historiquesPrix[index]?.data || [],
    }));
  }
}