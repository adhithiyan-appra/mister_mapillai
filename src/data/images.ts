/**
 * MISTER MAPILLAI — Central Image Registry
 * Composes organized domain-specific asset modules and provides type-safe ImageKey lookups.
 */
import {
  aboutAssets,
  accessoryAssets,
  ceremonyAssets,
  collectionAssets,
  happyGroomsAssets,
  testimonialAssets,
  transformationAssets,
} from './assets';

export const images = {
  // Signature Collections & Ceremonial Outfits
  'db-wide': collectionAssets.dbWide,
  'sherwani': collectionAssets.sherwani,
  'sherwani-sm': collectionAssets.sherwani,
  'sherwani-wide': collectionAssets.sherwaniWide,
  'bandhgala-black': collectionAssets.bandhgalaBlack,
  'bandhgala-black-sm': collectionAssets.bandhgalaBlackSm,
  'bandhgala-ivory': collectionAssets.bandhgalaIvory,
  'bandhgala-ivory-sm': collectionAssets.bandhgalaIvorySm,
  'bandhgala-navy': collectionAssets.bandhgalaNavy,
  'bandhgala-navy-sm': collectionAssets.bandhgalaNavySm,
  'charcoal-suit': collectionAssets.charcoalSuit,
  'charcoal-suit-sm': collectionAssets.charcoalSuitSm,
  'charcoal-wide': collectionAssets.charcoalWide,
  'double-breasted': collectionAssets.doubleBreasted,
  'double-breasted-sm': collectionAssets.doubleBreastedSm,
  'indowestern': collectionAssets.indowestern,
  'indowestern-sm': collectionAssets.indowesternSm,
  'jodhpuri': collectionAssets.jodhpuriSm,
  'jodhpuri-sm': collectionAssets.jodhpuriSm,
  'threepiece': collectionAssets.threepiece,
  'threepiece-sm': collectionAssets.threepieceSm,
  'threepiece-wide': collectionAssets.threepieceWide,
  'tuxedo': collectionAssets.tuxedo,
  'tuxedo-sm': collectionAssets.tuxedoSm,
  'ceremonial-shirt': collectionAssets.ceremonialShirt,
  'ceremonial-shirt-sm': collectionAssets.ceremonialShirtSm,
  'signature-shirt': collectionAssets.signatureShirt,
  'signature-shirt-sm': collectionAssets.signatureShirtSm,
  'shirt-wide': collectionAssets.shirtWide,
  'signature-wide': collectionAssets.shirtWide,
  'silk-veshti': collectionAssets.silkVeshtiSm,
  'silk-veshti-sm': collectionAssets.silkVeshtiSm,
  'veshti-wide': collectionAssets.veshtiWide,
  'devatan-sketch': collectionAssets.devatanSketch,
  'devatan-shirt': aboutAssets.devatanShirt,
  'moodboard': collectionAssets.moodboard,
  'motifs': collectionAssets.motifs,

  // Ceremony Process & Craft Highlights
  'chair_coat': ceremonyAssets.chairCoat,
  'sitch': ceremonyAssets.stepThreeImage,
  'image': ceremonyAssets.stepFourImage,
  'place-0': ceremonyAssets.place0,
  'place-1': ceremonyAssets.place1,
  'place-2': ceremonyAssets.place2,
  'detail-0': ceremonyAssets.detail0,
  'detail-1': ceremonyAssets.detail1,
  'detail-2': ceremonyAssets.detail2,
  'detail-3': ceremonyAssets.detail3,
  'detail-4': ceremonyAssets.detail4,

  // Before & After Ceremony Transformations
  'engagement-before': transformationAssets.engagement,
  'sangeet-before': transformationAssets.sangeet,
  'cocktail-before': transformationAssets.cocktail,
  'family-functions-before': transformationAssets.familyFunctions,
  'wedding-before': transformationAssets.wedding,
  'reception-before': transformationAssets.reception,

  // Happy Grooms Editorial Story
  'happy-grooms-hero': happyGroomsAssets.hero,
  'happy-grooms-shirt': happyGroomsAssets.shirt,
  'gowtham': happyGroomsAssets.gowtham,
  'happy-grooms-place-front': happyGroomsAssets.placeFront,
  'happy-grooms-place-sleeve': happyGroomsAssets.placeSleeve,
  'happy-grooms-place-back': happyGroomsAssets.placeBack,
  'happy-grooms-detail-0': happyGroomsAssets.detail0,
  'happy-grooms-detail-1': happyGroomsAssets.detail1,
  'happy-grooms-detail-2': happyGroomsAssets.detail2,
  'happy-grooms-detail-3': happyGroomsAssets.detail3,
  'happy-grooms-detail-4': happyGroomsAssets.detail4,
  'happy-grooms-material-silk': happyGroomsAssets.materialSilk,
  'happy-grooms-material-zari': happyGroomsAssets.materialZari,
  'happy-grooms-material-pearls': happyGroomsAssets.materialPearls,
  'happy-grooms-material-beads': happyGroomsAssets.materialBeads,
  'happy-grooms-material-thread': happyGroomsAssets.materialThread,
  'happy-grooms-moodboard': happyGroomsAssets.moodboard,
  'happy-grooms-motifs': happyGroomsAssets.motifs,

  // Testimonial Groom Portraits
  'groom-profile-1': testimonialAssets.profile1,
  'groom-profile-2': testimonialAssets.profile2,
  'groom-profile-3': testimonialAssets.profile3,
  'groom-profile-4': testimonialAssets.profile4,
  'groom-profile-5': testimonialAssets.profile5,

  // About Page Craftsmanship Collage
  'about-dome-detail': aboutAssets.domeDetail,
  'about-heritage-detail': aboutAssets.heritageDetail,
  'about-floral-detail': aboutAssets.floralDetail,
  'about-vine-detail': aboutAssets.vineDetail,
  'about-bud-detail': aboutAssets.budDetail,
  'about-devatan-shirt': aboutAssets.devatanShirt,

  // Accessory Orbit Cut-Outs
  'orbit-brooch': accessoryAssets.brooch,
  'orbit-watch': accessoryAssets.watch,
  'orbit-pocket-square': accessoryAssets.pocketSquare,
  'orbit-cufflinks': accessoryAssets.cufflinks,
  'orbit-footwear': accessoryAssets.footwear,
  'orbit-groom': accessoryAssets.groom,
  'orbit-groom-sm': accessoryAssets.groomSm,
  'orbit-stole': accessoryAssets.stole,
  'orbit-turban': accessoryAssets.turban,
} as const;

export type ImageKey = keyof typeof images;
