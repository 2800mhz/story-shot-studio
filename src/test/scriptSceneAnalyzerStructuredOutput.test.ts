import { describe, expect, it } from 'vitest';
import { parseScriptAnalysisResponse } from '@/lib/scriptSceneAnalysisSchema';

describe('scriptSceneAnalyzer structured output parsing', () => {
  it('maps structured character fields into explicit age/ethnicity/clothing/physicalFeatures keys', () => {
    const parsed = parseScriptAnalysisResponse(`{
      "scenes": [
        {
          "text": "Test sahne",
          "visualNote": "Test notu",
          "visualStyle": "cinematic",
          "characterNames": ["Modern Visitors"],
          "locationNames": ["Müze Salonu"],
          "timeContextLabel": "Modern Dönem"
        }
      ],
      "characters": [
        {
          "name": "Modern Visitors",
          "role": "Turist",
          "ageAndEra": "Modern dönem, 20-60 yaş arası",
          "ethnicityPhenotype": "Çeşitli etnik kökenler",
          "clothingCostume": "Günlük modern kıyafetler, sırt çantaları",
          "physicalTraits": "Meraklı bakışlar, farklı yüz hatları",
          "visualDescription": "Diverse group of modern-day tourists in contemporary casual clothing."
        }
      ],
      "locations": [
        { "name": "Müze Salonu", "visualDescription": "Wide interior hall with marble floors." }
      ],
      "timeContexts": [
        { "label": "Modern Dönem" }
      ]
    }`);

    expect(parsed.characters[0]).toMatchObject({
      age: 'Modern dönem, 20-60 yaş arası',
      ethnicity: 'Çeşitli etnik kökenler',
      clothing: 'Günlük modern kıyafetler, sırt çantaları',
      physicalFeatures: 'Meraklı bakışlar, farklı yüz hatları',
      visualDescription: 'Diverse group of modern-day tourists in contemporary casual clothing.',
    });
  });
});
