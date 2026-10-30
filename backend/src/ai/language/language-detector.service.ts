import { Injectable } from '@nestjs/common';

export type DetectedLanguage = 'en' | 'bn' | 'bn-Latn' | 'mixed';

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  confidence: number;
  isBanglaFamily: boolean;
  detectedFeatures: string[];
}

@Injectable()
export class LanguageDetectorService {
  // Bengali Unicode range: \u0980 - \u09FF
  private readonly bengaliScriptRegex = /[\u0980-\u09FF]/g;
  private readonly latinWordRegex = /[a-zA-Z]+/g;

  // Common Banglish phonetics, vocabulary, and particles
  private readonly banglishKeywords = [
    'amar', 'amra', 'apnar', 'apnake', 'kobe', 'pabo', 'hocche', 'bhai',
    'kemon', 'achen', 'kothay', 'jani', 'janan', 'dorkar', 'shomossha',
    'khub', 'shighroi', 'dhonnobad', 'dekhi', 'dekhtechi', 'asche',
    'thik', 'taka', 'korbo', 'koren', 'korchi', 'ekhon', 'hobe',
  ];

  detectLanguage(text: string, manualOverride?: DetectedLanguage): LanguageDetectionResult {
    if (manualOverride) {
      return {
        language: manualOverride,
        confidence: 1.0,
        isBanglaFamily: manualOverride !== 'en',
        detectedFeatures: ['manual_override'],
      };
    }

    const clean = text.trim();
    if (!clean) {
      return {
        language: 'en',
        confidence: 0.5,
        isBanglaFamily: false,
        detectedFeatures: ['empty_fallback'],
      };
    }

    const bengaliChars = clean.match(this.bengaliScriptRegex)?.length || 0;
    const totalChars = clean.replace(/\s+/g, '').length;
    const bengaliRatio = totalChars > 0 ? bengaliChars / totalChars : 0;

    // Check pure or predominantly Bengali script
    if (bengaliRatio > 0.6) {
      return {
        language: 'bn',
        confidence: parseFloat(Math.min(0.99, 0.7 + bengaliRatio * 0.3).toFixed(2)),
        isBanglaFamily: true,
        detectedFeatures: ['bengali_unicode_script'],
      };
    }

    // Check mixed Bengali script + Latin characters
    if (bengaliRatio > 0.15) {
      return {
        language: 'mixed',
        confidence: 0.85,
        isBanglaFamily: true,
        detectedFeatures: ['bengali_latin_mixed'],
      };
    }

    // Check Banglish (Romanized Bengali)
    const words = clean.toLowerCase().match(this.latinWordRegex) || [];
    let banglishMatchCount = 0;
    const detectedTokens: string[] = [];

    for (const word of words) {
      if (this.banglishKeywords.includes(word)) {
        banglishMatchCount += 1;
        detectedTokens.push(word);
      }
    }

    const banglishRatio = words.length > 0 ? banglishMatchCount / words.length : 0;

    if (banglishMatchCount >= 2 || banglishRatio >= 0.25) {
      return {
        language: 'bn-Latn',
        confidence: parseFloat(Math.min(0.95, 0.6 + banglishMatchCount * 0.15).toFixed(2)),
        isBanglaFamily: true,
        detectedFeatures: ['banglish_keywords', ...detectedTokens],
      };
    }

    // Default to English
    return {
      language: 'en',
      confidence: 0.9,
      isBanglaFamily: false,
      detectedFeatures: ['latin_standard_english'],
    };
  }
}

