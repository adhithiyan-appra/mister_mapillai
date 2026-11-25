/**
 * Ceremony Transformation Assets (Before & After)
 * Real ceremony staging and transformation references.
 */
import engagementBefore from '../../assets/images/home/before-after/engagement-before.webp';
import sangeetBefore from '../../assets/images/home/before-after/sangeet-before.webp';
import cocktailBefore from '../../assets/images/home/before-after/cocktail-before.webp';
import familyFunctionsBefore from '../../assets/images/home/before-after/family-functions-before.webp';
import weddingBefore from '../../assets/images/home/before-after/wedding-before.webp';
import receptionBefore from '../../assets/images/home/before-after/reception-before.webp';

import cocktailHomeBefore from '../../assets/images/collections/looks/before-after/cocktail-before.webp';
import cocktailHomeAfter from '../../assets/images/collections/looks/before-after/cocktail-after.webp';
import nichayatharthamBefore from '../../assets/images/collections/looks/before-after/nichayathartham-before.webp';
import nichayatharthamAfter from '../../assets/images/collections/high_quality_webp/mister_mapillai_navy_groom_8k.webp';
import receptionTransformBefore from '../../assets/images/collections/looks/before-after/reception-before.webp';
import receptionTransformAfter from '../../assets/images/collections/high_quality_webp/mister_mapillai_burgundy_groom_8k.webp';
import muhurthamBefore from '../../assets/images/collections/looks/before-after/muhurtham-before.webp';
import muhurthamAfter from '../../assets/images/collections/high_quality_webp/mister_mapillai_muhurtham_exact_8k.webp';
// The same three photographs as lossless 1120x1400 renditions of those 8K files (4:5, same crop). The comparison frame is at most
// 440 CSS px wide, so it shows these (>= 2.5 device px per CSS px); the 14-17 MB 8K files would be fetched and decoded as ~190 MB
// bitmaps for a 440x660 box. The 8K masters stay in the registry above for anything that really shows them large.
import nichayatharthamAfterView from '../../assets/images/collections/high_quality_webp/mister_mapillai_navy_groom_8k-sm.webp';
import receptionTransformAfterView from '../../assets/images/collections/high_quality_webp/mister_mapillai_burgundy_groom_8k-sm.webp';
import muhurthamAfterView from '../../assets/images/collections/high_quality_webp/mister_mapillai_muhurtham_exact_8k-sm.webp';

export const transformationAssets = {
  engagement: engagementBefore,
  sangeet: sangeetBefore,
  cocktail: cocktailBefore,
  cocktailHomeBefore,
  cocktailHomeAfter,
  familyFunctions: familyFunctionsBefore,
  wedding: weddingBefore,
  reception: receptionBefore,
  nichayatharthamBefore,
  nichayatharthamAfter,
  receptionTransformBefore,
  receptionTransformAfter,
  muhurthamBefore,
  muhurthamAfter,
  nichayatharthamAfterView,
  receptionTransformAfterView,
  muhurthamAfterView,
} as const;
