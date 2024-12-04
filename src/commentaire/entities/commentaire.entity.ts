// src/commentaire/entities/commentaire.entity.ts
export class Commentaire {
    id: string; // Identifiant unique du commentaire
    contenu: string; // Texte du commentaire
    auteurId: string; // Identifiant de l'utilisateur ayant fait le commentaire
    produitId: string; // Identifiant du produit concerné
    dateCreation: Date; // Date de création du commentaire
  }  