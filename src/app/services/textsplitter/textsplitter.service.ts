import { Injectable } from '@angular/core';

/** Local ChunkMetadata shape — transplanted without Zyppar's library model. */
interface ChunkMetadata {
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  index: number;
  fileId: string;
}

interface TextSplitterConfig {
  maxChunkLength: number;
  pauseThreshold: number;
  preserveFormatting: boolean;
  handleAbbreviations: boolean;
  technicalNotation: boolean;
  isStem: boolean;
}

interface CategoryAssessment {
  category: string;
  confidence: number;
  features: {
    technicalTerms: number;
    mathematicalNotation: number;
    codeBlocks: number;
    literaryPatterns: number;
    abbreviationDensity: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TextsplitterService {
  private readonly SPLITTER_PROFILES: Record<string, TextSplitterConfig> = {
    'Technical Documentation': {
      maxChunkLength: 250,
      pauseThreshold: 0.6,
      preserveFormatting: true,
      handleAbbreviations: false,
      technicalNotation: true,
      isStem: true
    },
    'Educational': {
      maxChunkLength: 220,
      pauseThreshold: 0.5,
      preserveFormatting: true,
      handleAbbreviations: false,
      technicalNotation: true,
      isStem: true
    },
    'Biography': {
      maxChunkLength: 200,
      pauseThreshold: 0.45,
      preserveFormatting: true,
      handleAbbreviations: true,
      technicalNotation: false,
      isStem: false
    },
    'Classic Literature': {
      maxChunkLength: 180,
      pauseThreshold: 0.4,
      preserveFormatting: false,
      handleAbbreviations: true,
      technicalNotation: false,
      isStem: false
    },
    'Modern Literature': {
      maxChunkLength: 190,
      pauseThreshold: 0.4,
      preserveFormatting: false,
      handleAbbreviations: true,
      technicalNotation: false,
      isStem: false
    },
    'History': {
      maxChunkLength: 200,
      pauseThreshold: 0.45,
      preserveFormatting: false,
      handleAbbreviations: true,
      technicalNotation: false,
      isStem: false
    },
    'Science Fiction': {
      maxChunkLength: 200,
      pauseThreshold: 0.4,
      preserveFormatting: false,
      handleAbbreviations: true,
      technicalNotation: false,
      isStem: false
    },
    'Self-Improvement': {
      maxChunkLength: 210,
      pauseThreshold: 0.45,
      preserveFormatting: false,
      handleAbbreviations: true,
      technicalNotation: false,
      isStem: false
    },
    'All': {
      maxChunkLength: 140,  // smaller spoken chunks (~8-10s at normal rate) for better resilience: if one chunk fails/times out, less content lost, easier to bypass and continue the rest of the item
      pauseThreshold: 0.45,
      preserveFormatting: false,
      handleAbbreviations: true,
      technicalNotation: false,
      isStem: false
    }
  };

  // Centralized threshold for deciding whether to offload heavy splitting of very large texts (performance).
  // This was previously an arbitrary magic number (100000) duplicated in multiple functions across audiobrief.service.ts,
  // document paths, etc. Use this (or the service methods) instead of per-function arbitrary numbers.
  // For narration/TTS chunk *sizes*, the SPLITTER_PROFILES['All'].maxChunkLength = 140 (and category variants 180-250)
  // are the manageable sizes (tuned for ~8-10s spoken chunks for resilience in Grok-style narration / Microsoft TTS best practices).
  public readonly LARGE_TEXT_OFFLOAD_THRESHOLD = 100000;

  // Technical term patterns for category assessment
  private readonly TECHNICAL_TERMS = /\b(algorithm|function|variable|class|object|method|api|database|server|client|protocol|interface|framework|library|compile|execute|debug|optimize|syntax|semantic)\b/i;
  private readonly MATH_NOTATION = /(\$\$?[^$]+\$\$?|\\\([^)]+\\\)|\\\[[^\]]+\\\])/;
  private readonly CODE_BLOCKS = /```[\s\S]*?```|`[^`]+`/;
  private readonly LITERARY_PATTERNS = /\b(the|and|of|to|a|in|that|it|with|for|as|on|was|he|she|they|their|her|his|our|your|my)\b/gi;
  private readonly ABBREVIATIONS = /\b([A-Za-z]+\.[A-Za-z]+\.?|e\.g|i\.e|etc\.|viz\.|cf\.|approx\.|est\.|min\.|max\.|[A-Z]{2,}\.)\b/g;
  
  // Enhanced currency patterns for African currencies
  private readonly CURRENCY_PATTERNS = {
    'NAIRA': /₦\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|N\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)/g,  // Require 3+ digits to avoid short codes
    'CEDI': /₵\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|GHS\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)/g,
    'RAND': /R\s+(\d{3,}[\d,]*(?:\.\d{1,2})?)|ZAR\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)/g,  // Space + 3+ digits
    'SHILLING': /KSh\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|KES\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|TSh\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|TZS\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)/g,
    'FRANC': /CFA\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|FCFA\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|XOF\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|XAF\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)/g,
    'DALASI': /D\s+(\d{3,}[\d,]*(?:\.\d{1,2})?)|GMD\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)/g,  // Space + 3+ digits
    'KWACHA': /K\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|MWK\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)|ZMW\s*(\d{3,}[\d,]*(?:\.\d{1,2})?)/g
  };

  // Problematic word patterns that TTS might mispronounce
  private readonly TTS_PROBLEM_WORDS = {
    ABOUT_US: /\bAbout\s+us\b/gi,
    U_S_STANDALONE: /\bU\.S\.(?!A)/g,
    STANDALONE_LETTERS: /\b([A-Z])\.(?=\s|$)/g
  };

  // Enhanced patterns for TTS problems
  private readonly TTS_PROBLEM_PATTERNS = {
    KSH_STANDALONE: /\bKsh\.?(?!\s*\d)/gi,
    ABOUT_US: /\bAbout\s+us\b/gi,
    U_S_STANDALONE: /\bU\.S\.(?!A)/g,
    STANDALONE_LETTERS: /\b([A-Z])\.(?=\s|$)/g,
    COMPANY_ABOUT: /\bCo\.?\s*About\b/gi,
    DOT_EDU: /\.edu\b/gi
  };

  // Add number abbreviation patterns
  private readonly NUMBER_ABBREVIATIONS = {
    TRILLION: /\b(\d[\d,.]*)\s*(?:trl|trillion)\b/gi,
    BILLION: /\b(\d[\d,.]*)\s*(?:bln|billion)\b/gi,
    MILLION: /\b(\d[\d,.]*)\s*(?:mln|million)\b/gi,
    THOUSAND: /\b(\d[\d,.]*)\s*(?:k|thousand)\b/gi
  };

  constructor() { }

  /**
   * Main method to split text, with automatic category assessment
   */
  splitText(text: string, category?: string): { chunks: string[]; assessedCategory: CategoryAssessment } {
    const assessedCategory = this.assessCategory(text);
    const finalCategory = category && this.SPLITTER_PROFILES[category]
      ? category
      : assessedCategory.category;

    const config = this.SPLITTER_PROFILES[finalCategory] || this.SPLITTER_PROFILES['All'];
    const chunks = config.technicalNotation
      ? this.splitTechnicalText(text, config)
      : this.splitGeneralText(text, config);

    return {
      chunks,
      assessedCategory
    };
  }

  /**
   * Automatically assess the best category for the given text
   */
  assessCategory(text: string): CategoryAssessment {
    const features = {
      technicalTerms: (text.match(this.TECHNICAL_TERMS)?.length || 0) / Math.max(1, text.split(/\s+/).length / 100),
      mathematicalNotation: (text.match(this.MATH_NOTATION)?.length || 0) > 0 ? 1 : 0,
      codeBlocks: (text.match(this.CODE_BLOCKS)?.length || 0) > 0 ? 1 : 0,
      literaryPatterns: (text.match(this.LITERARY_PATTERNS)?.length || 0) / Math.max(1, text.split(/\s+/).length),
      abbreviationDensity: (text.match(this.ABBREVIATIONS)?.length || 0) / Math.max(1, text.split(/\s+/).length / 50)
    };

    // Calculate scores for each category
    const scores = Object.entries(this.SPLITTER_PROFILES)
      .filter(([key]) => key !== 'All')
      .map(([category, config]) => {
        let score = 0;

        if (config.isStem) {
          score += features.technicalTerms * 3;
          score += features.mathematicalNotation * 4;
          score += features.codeBlocks * 5;
          score -= features.literaryPatterns * 2;
        } else {
          score += features.literaryPatterns * 3;
          score += features.abbreviationDensity * 2;
          score -= features.technicalTerms * 2;
          score -= features.mathematicalNotation * 4;
          score -= features.codeBlocks * 4;
        }

        return { category, score };
      });

    // Find the best matching category
    const bestMatch = scores.reduce((best, current) =>
      current.score > best.score ? current : best,
      { category: 'All', score: -Infinity }
    );

    // Normalize confidence score (0-1)
    const maxPossibleScore = 12; // Approximate maximum possible score
    const confidence = Math.max(0, Math.min(1, bestMatch.score / maxPossibleScore));

    return {
      category: bestMatch.category,
      confidence,
      features
    };
  }

  /**
   * Split text with a specific category (bypassing auto-assessment)
   */
  splitTextByCategory(text: string, category: string = 'All'): string[] {
    const config = this.SPLITTER_PROFILES[category] || this.SPLITTER_PROFILES['All'];
    return config.technicalNotation
      ? this.splitTechnicalText(text, config)
      : this.splitGeneralText(text, config);
  }

  private splitTechnicalText(text: string, config: TextSplitterConfig): string[] {
    const preservedBlocks: { id: string; content: string }[] = [];
    let blockId = 0;

    // Enhanced preservation with better pattern matching
    const preservationPatterns = [
      {
        pattern: /```[\s\S]*?```/g,
        prefix: 'TECH'
      },
      {
        pattern: /(\$\$?)(?!\s)([^\n$]+?)(?<!\s)\1/g,
        prefix: 'MATH'
      },
      {
        pattern: /([A-Z][a-z]?\d*[a-z]?\d*)/g,
        test: (match: string) => /[a-z]\d|[A-Z][a-z]?\d/.test(match),
        prefix: 'CHEM'
      },
      {
        pattern: /https?:\/\/[^\s]+/g,
        prefix: 'URL'
      },
      {
        pattern: /<[^>]+>/g,
        prefix: 'HTML'
      }
    ];

    preservationPatterns.forEach(({ pattern, test, prefix }) => {
      text = text.replace(pattern, match => {
        if (test && !test(match)) return match;
        const id = `__${prefix}${blockId++}__`;
        preservedBlocks.push({ id, content: match });
        return id;
      });
    });

    text = this.cleanText(text, config);
    const chunks = this.advancedTextSplitter(text, config);

    // Restore preserved content
    return chunks.map(chunk => {
      let restoredChunk = chunk;
      preservedBlocks.forEach(({ id, content }) => {
        restoredChunk = restoredChunk.replace(id, content);
      });
      return restoredChunk;
    });
  }

  private splitGeneralText(text: string, config: TextSplitterConfig): string[] {
    text = this.cleanText(text, config);
    return this.advancedTextSplitter(text, config);
  }

  private cleanText(text: string, config: TextSplitterConfig): string {
    // Step 0: Pre-normalize currency symbols and special notations BEFORE abbreviation expansion.
    // Order matters: dollar signs and other symbols must be resolved before the abbreviation
    // engine runs, otherwise "$9 million" becomes "Dollar 9 million" instead of "Nine million dollars".
    text = this.normalizeCurrencySymbols(text);

    // Step 1: Fix TTS problems first
    text = this.fixTTSProblems(text);

    // Step 2: Handle currency conversions
    text = this.expandAfricanCurrencies(text);

    // Step 3: Handle number abbreviations
    text = this.expandNumberAbbreviations(text);

    // Step 4: Process abbreviations if enabled
    if (config.handleAbbreviations) {
      text = this.expandAbbreviations(text);
    }

    return text;
  }

  /**
   * Expand number abbreviations (trl, bln, mln, k)
   */
  private expandNumberAbbreviations(text: string): string {
    // Handle trillion
    text = text.replace(this.NUMBER_ABBREVIATIONS.TRILLION, (match, amount) => {
      return `${this.formatNumberForSpeech(amount)} trillion`;
    });

    // Handle billion
    text = text.replace(this.NUMBER_ABBREVIATIONS.BILLION, (match, amount) => {
      return `${this.formatNumberForSpeech(amount)} billion`;
    });

    // Handle million
    text = text.replace(this.NUMBER_ABBREVIATIONS.MILLION, (match, amount) => {
      return `${this.formatNumberForSpeech(amount)} million`;
    });

    // Handle thousand
    text = text.replace(this.NUMBER_ABBREVIATIONS.THOUSAND, (match, amount) => {
      return `${this.formatNumberForSpeech(amount)} thousand`;
    });

    return text;
  }

  /**
   * Expand African currency notations for proper TTS pronunciation
   */
  private expandAfricanCurrencies(text: string): string {
    // Nigerian Naira
    text = text.replace(this.CURRENCY_PATTERNS.NAIRA, (match, p1, p2) => {
      const amount = p1 || p2;
      return `Naira ${this.formatNumberForSpeech(amount)}`;
    });

    // Ghanaian Cedi
    text = text.replace(this.CURRENCY_PATTERNS.CEDI, (match, p1, p2) => {
      const amount = p1 || p2;
      return `Ghanaian Cedis ${this.formatNumberForSpeech(amount)}`;
    });

    // South African Rand
    text = text.replace(this.CURRENCY_PATTERNS.RAND, (match, p1, p2) => {
      const amount = p1 || p2;
      return `South African Rand ${this.formatNumberForSpeech(amount)}`;
    });

    // Kenyan/Tanzanian Shilling
    text = text.replace(this.CURRENCY_PATTERNS.SHILLING, (match, ...groups) => {
      const amount = groups.find(g => g);
      const isTanzanian = match.includes('TSh') || match.includes('TZS');
      const currency = isTanzanian ? 'Tanzanian Shillings' : 'Kenyan Shillings';
      return `${currency} ${this.formatNumberForSpeech(amount)}`;
    });

    // West African CFA Franc
    text = text.replace(this.CURRENCY_PATTERNS.FRANC, (match, ...groups) => {
      const amount = groups.find(g => g);
      return `CFA Francs ${this.formatNumberForSpeech(amount)}`;
    });

    // Gambian Dalasi
    text = text.replace(this.CURRENCY_PATTERNS.DALASI, (match, p1, p2) => {
      const amount = p1 || p2;
      return `Dalasis ${this.formatNumberForSpeech(amount)}`;
    });

    // Zambian/Malawian Kwacha
    text = text.replace(this.CURRENCY_PATTERNS.KWACHA, (match, ...groups) => {
      const amount = groups.find(g => g);
      const isZambian = match.includes('ZMW') || (match.includes('K') && !match.includes('MWK'));
      const currency = isZambian ? 'Zambian Kwacha' : 'Malawian Kwacha';
      return `${currency} ${this.formatNumberForSpeech(amount)}`;
    });

    return text;
  }

  /**
   * Expanded abbreviation dictionary with comprehensive African coverage
   */
  private expandAbbreviations(text: string): string {
    const ABBREVIATION_MAP: Record<string, string> = {
      // Global abbreviations
      'Mr.': 'Mister', 'Ms.': 'Miss', 'Mrs.': 'Missus', 'Dr.': 'Doctor',
      'Prof.': 'Professor', 'St.': 'Saint', 'Jr.': 'Junior', 'Sr.': 'Senior',
      'Rev.': 'Reverend', 'Fig.': 'Figure', 'Eq.': 'Equation', 'Vol.': 'Volume',
      'No.': 'Number', 'Ch.': 'Chapter', 'Sec.': 'Section', 'Col.': 'Colonel',
      'Gen.': 'General', 'Capt.': 'Captain', 'Lt.': 'Lieutenant', 'Sgt.': 'Sergeant',
      'Ph.D.': 'Doctor of Philosophy', 'U.S.': 'United States',
      'U.S.A.': 'United States of America', 'e.g.': 'for example',
      'i.e.': 'that is', 'etc.': 'et cetera', 'viz.': 'namely',
      'cf.': 'compare', 'approx.': 'approximately', 'POTUS': 'President of the United States',
      'Gov': 'Governor', 'Dept.': 'Department', 'Univ.': 'University', 'Tinubu': 'Tee-noo-boo', 
      'Abacha' : 'A-ba-cha', 'Wike' : 'We-kay',

      // African country abbreviations
      'NG': 'Nigeria', 'GH': 'Ghana', 'KE': 'Kenya', 'ZA': 'South Africa',
      'EG': 'Egypt', 'ET': 'Ethiopia', 'TZ': 'Tanzania', 'UG': 'Uganda',
      'RW': 'Rwanda', 'ZM': 'Zambia', 'ZW': 'Zimbabwe', 'MW': 'Malawi',
      'SL': 'Sierra Leone', 'LR': 'Liberia', 'GM': 'Gambia', 'SN': 'Senegal',
      'CI': 'Cote d Ivoire', 'CM': 'Cameroon', 'GA': 'Gabon', 'CG': 'Congo',
      'CD': 'Democratic Republic of Congo', 'AO': 'Angola', 'MZ': 'Mozambique',
      'NA': 'Namibia', 'BW': 'Botswana', 'LS': 'Lesotho', 'SZ': 'Eswatini',

      // African organizations and institutions
      'AU': 'African Union', 'ECOWAS': 'Economic Community of West African States',
      'SADC': 'Southern African Development Community', 'EAC': 'East African Community',
      'COMESA': 'Common Market for Eastern and Southern Africa',
      'CEN-SAD': 'Community of Sahel-Saharan States',
      'NASS': 'National Assembly', 'NNPC': 'Nigerian National Petroleum Corporation',
      'GRA': 'Ghana Revenue Authority', 'KRA': 'Kenya Revenue Authority',
      'SARS': 'South African Revenue Service',

      // Nigerian-specific abbreviations
      'FCT': 'Federal Capital Territory', 'ASUU': 'Academic Staff Union of Universities',
      'NLC': 'Nigeria Labour Congress', 'TUC': 'Trade Union Congress',
      'INEC': 'Independent National Electoral Commission', 'EFCC': 'Economic and Financial Crimes Commission',
      'NDLEA': 'National Drug Law Enforcement Agency', 'NSCDC': 'Nigeria Security and Civil Defence Corps',
      'NYSC': 'National Youth Service Corps', 'JAMB': 'Joint Admissions and Matriculation Board',
      'WAEC': 'West African Examinations Council', 'NECO': 'National Examinations Council',
      'UBE': 'Universal Basic Education', 'TETFUND': 'Tertiary Education Trust Fund', 'CAC': 'Corporate Affairs Commission',

      // Ghanaian-specific abbreviations
      'GES': 'Ghana Education Service', 'GHS': 'Ghana Health Service',
      'SSNIT': 'Social Security and National Insurance Trust', 'VAT': 'Value Added Tax',
      'NHIS': 'National Health Insurance Scheme', 'GETFund': 'Ghana Education Trust Fund',

      // Kenyan-specific abbreviations
      'KNEC': 'Kenya National Examinations Council', 'KCPE': 'Kenya Certificate of Primary Education',
      'KCSE': 'Kenya Certificate of Secondary Education', 'KUCCPS': 'Kenya Universities and Colleges Central Placement Service',
      'HELB': 'Higher Education Loans Board', 'NTSA': 'National Transport and Safety Authority',

      // South African-specific abbreviations
      'ANC': 'African National Congress', 'DA': 'Democratic Alliance',
      'EFF': 'Economic Freedom Fighters', 'SABC': 'South African Broadcasting Corporation',
      'Eskom': 'Electricity Supply Commission', 'SANDF': 'South African National Defence Force',

      // Academic and professional titles common in Africa
      'Engr.': 'Engineer', 'Barr.': 'Barrister', 'Arc.': 'Architect', 'Hon.': 'Honourable',
      'Surv.': 'Surveyor', 'Pharm.': 'Pharmacist', 'Chief': 'Chief',
      'Alh.': 'Alhaji', 'Haj.': 'Hajia', 'Oba': 'King', 'Emir': 'Emir',

      // Common African geographic abbreviations
      'LGA': 'Local Government Area', 'SA': 'South Africa', 'WA': 'West Africa',
      'EA': 'East Africa', 'NAfr': 'North Africa', 'SAfr': 'Southern Africa',
      'WAF': 'West Africa', 'EAF': 'East Africa',

      // Measurement units commonly used in Africa
      'ha': 'hectares', 'km²': 'square kilometers', 'MT': 'metric tons',
      'bag': 'bag', 'plt': 'plot', 'acre': 'acre',

      // Financial and number abbreviations
      'tr': 'trillion',
      'trl': 'trillion',
      'trn': 'trillion',
      'bl': 'billion',
      'bln': 'billion',
      'bn': 'billion',
      'm': 'million',
      'mln': 'million',
      'mn': 'million',
      'k': 'thousand',
      'th': 'thousand',
      'mil': 'million',
      'bil': 'billion',
      'tri': 'trillion',

      // Financial terms
      'GDP': 'Gross Domestic Product',
      'GNP': 'Gross National Product',
      'FDI': 'Foreign Direct Investment',
      'IPO': 'Initial Public Offering',
      'ROI': 'Return on Investment',
      'EPS': 'Earnings Per Share',
      'P/E': 'Price to Earnings',
      'EBITDA': 'Earnings Before Interest Taxes Depreciation and Amortization',
      'YOY': 'Year Over Year',
      'QOQ': 'Quarter Over Quarter',
    };

    // Enhanced replacement logic
    return text.replace(/\b[\w\.]+\b/g, (word) => {
      // Exact match
      if (ABBREVIATION_MAP[word]) {
        return ABBREVIATION_MAP[word];
      }

      // Lowercase match for financial abbreviations
      const lowerWord = word.toLowerCase();
      if (ABBREVIATION_MAP[lowerWord]) {
        return ABBREVIATION_MAP[lowerWord];
      }

      // Handle dotted abbreviations
      if (word.includes('.')) {
        const withoutDot = word.replace(/\.$/, '');
        if (ABBREVIATION_MAP[withoutDot]) {
          return ABBREVIATION_MAP[withoutDot];
        }
      }

      return word;
    });
  }

  /**
   * Format numbers for natural TTS pronunciation
   */
  /**
 * Format numbers for natural TTS pronunciation with better large number handling
 */
  private formatNumberForSpeech(numberStr: string): string {
    if (!numberStr) return '';

    // Remove commas and parse
    const cleanNumber = numberStr.replace(/,/g, '');
    const number = parseFloat(cleanNumber);

    if (isNaN(number)) return numberStr;

    // For whole numbers
    if (Number.isInteger(number)) {
      // Handle very large numbers with million/billion
      if (number >= 1000000000) {
        const billions = number / 1000000000;
        return `${this.formatDecimalForSpeech(billions)} billion`;
      } else if (number >= 1000000) {
        const millions = number / 1000000;
        return `${this.formatDecimalForSpeech(millions)} million`;
      } else if (number >= 1000) {
        const thousands = number / 1000;
        return `${this.formatDecimalForSpeech(thousands)} thousand`;
      }

      // Format regular numbers with proper grouping
      return this.numberToWords(number);
    }

    // For decimal numbers, handle the decimal part separately
    const [wholePart, decimalPart] = number.toString().split('.');
    const wholeWords = this.numberToWords(parseInt(wholePart));
    const decimalWords = decimalPart ? ` point ${this.digitsToWords(decimalPart)}` : '';

    return wholeWords + decimalWords;
  }

  /**
   * Convert numbers to words for more natural speech
   */
  private numberToWords(num: number): string {
    if (num === 0) return 'zero';

    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
      'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num < 20) return ones[num];

    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    }

    if (num < 1000) {
      return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 !== 0 ? ' and ' + this.numberToWords(num % 100) : '');
    }

    if (num < 1000000) {
      return this.numberToWords(Math.floor(num / 1000)) + ' thousand' + (num % 1000 !== 0 ? ' ' + this.numberToWords(num % 1000) : '');
    }

    return num.toString(); // Fallback for very large numbers
  }

  /**
   * Convert individual digits to words for decimal parts
   */
  private digitsToWords(digits: string): string {
    const digitWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    return digits.split('').map(digit => digitWords[parseInt(digit)]).join(' ');
  }

  /**
   * Format decimals for natural speech in large numbers
   */
  private formatDecimalForSpeech(value: number): string {
    if (Number.isInteger(value)) {
      return value.toString();
    }

    // Round to 1 decimal place for natural speech
    const rounded = Math.round(value * 10) / 10;
    return rounded.toString();
  }

  /**
   * Fix TTS pronunciation problems
   */
  private fixTTSProblems(text: string): string {
    // Fix "About us" being read as "About u.s."
    text = text.replace(this.TTS_PROBLEM_PATTERNS.ABOUT_US, 'About us section');

    // Fix standalone "U.S." being misinterpreted
    text = text.replace(this.TTS_PROBLEM_PATTERNS.U_S_STANDALONE, 'United States');

    // Fix single letters with periods
    text = text.replace(this.TTS_PROBLEM_PATTERNS.STANDALONE_LETTERS, '$1');

    // Fix "Co. About"
    text = text.replace(this.TTS_PROBLEM_PATTERNS.COMPANY_ABOUT, 'Company About');

    // Fix ".edu" domain
    text = text.replace(this.TTS_PROBLEM_PATTERNS.DOT_EDU, ' dot edu');

    // Ensure Ksh is handled properly
    text = text.replace(/\bKsh\s+/g, 'Kenyan Shillings ');
    text = text.replace(/\bKsh\./g, 'Kenyan Shillings');

    // 2026-08-20 ROLODEX PRONUNCIATION CLARIFICATIONS.
    // Fix the "t-h-e" affectation: TTS reading "the" letter-by-letter as
    // "t h e" / "t-h-e" — collapse it to the real word so it says "the".
    text = text.replace(/\bt\s*[-–—]\s*h\s*[-–—]\s*e\b/gi, 'the');
    text = text.replace(/\bt\s+h\s+e\b/gi, 'the');

    // live (laɪv) — paraphrase to phrases every engine pronounces correctly.
    text = text.replace(/\blive across devices\b/gi, 'in real time across devices');
    text = text.replace(/\bdevices link live\b/gi, 'devices link in real time');
    text = text.replace(/\blink devices live\b/gi, 'link devices in real time');
    text = text.replace(/\bdevices live\b/gi, 'devices in real time');
    text = text.replace(/\blink live\b/gi, 'link in real time');
    text = text.replace(/\ball live\b/gi, 'all in real time');
    text = text.replace(/\bis live\b/gi, 'is in real time');
    text = text.replace(/\blive demo\b/gi, 'real-time demo');
    text = text.replace(/\blive stream\b/gi, 'real-time stream');
    text = text.replace(/\bloves live\b/gi, 'loves live music');

    // live (lɪv) — the verb form.
    text = text.replace(/\b(?:where\s+your\s+)?contacts\s+live\b/gi, 'contacts lihv');
    text = text.replace(
      /\b(?:you|they|we|people|i|he|she|friends|family)\s+live\b/gi,
      (m) => m.replace(/\blive\b/i, 'lihv')
    );
    text = text.replace(/\blive\b(?=[.!?]|$)/gi, 'lyve');

    // read (red) vs reads (reed).
    text = text.replace(/(?:sent|delivered)\s*[·•]\s*read\b/gi, (m) => m.replace(/\bread\b/i, 'redd'));
    text = text.replace(/\breads\b/gi, 'reedz');

    return text;
  }

  /**
   * Normalize currency symbols and quantities for natural TTS speech.
   * Handles: $9 million → "Nine million dollars", €50 → "Fifty euros",
   * £1.5 billion → "One point five billion pounds", % signs, etc.
   * MUST run BEFORE abbreviation expansion to prevent "Dollar 9 million" junk.
   */
  private normalizeCurrencySymbols(text: string): string {
    // ── Dollar amounts ($) ──
    // $X million/billion/trillion → "X million dollars"
    text = text.replace(/\$\s*([\d,.]+)\s*(million|billion|trillion)/gi,
      (_, amount, unit) => `${this.formatNumberForSpeech(amount)} ${unit.toLowerCase()} dollars`);
    // $X thousand → "X thousand dollars"
    text = text.replace(/\$\s*([\d,.]+)\s*(thousand)/gi,
      (_, amount, unit) => `${this.formatNumberForSpeech(amount)} ${unit.toLowerCase()} dollars`);
    // $X → "X dollars" (standalone, but NOT part of $X million etc.)
    text = text.replace(/\$\s*([\d,.]+(?:\.\d{1,2})?)\b(?!\s*(?:million|billion|trillion|thousand))/gi,
      (_, amount) => `${this.formatNumberForSpeech(amount)} dollars`);

    // ── Euro amounts (€) ──
    text = text.replace(/€\s*([\d,.]+)\s*(million|billion|trillion)/gi,
      (_, amount, unit) => `${this.formatNumberForSpeech(amount)} ${unit.toLowerCase()} euros`);
    text = text.replace(/€\s*([\d,.]+(?:\.\d{1,2})?)\b(?!\s*(?:million|billion|trillion))/gi,
      (_, amount) => `${this.formatNumberForSpeech(amount)} euros`);

    // ── Pound amounts (£) ──
    text = text.replace(/£\s*([\d,.]+)\s*(million|billion|trillion)/gi,
      (_, amount, unit) => `${this.formatNumberForSpeech(amount)} ${unit.toLowerCase()} pounds`);
    text = text.replace(/£\s*([\d,.]+(?:\.\d{1,2})?)\b(?!\s*(?:million|billion|trillion))/gi,
      (_, amount) => `${this.formatNumberForSpeech(amount)} pounds`);

    // ── Yen / Yuan amounts (¥) ──
    text = text.replace(/¥\s*([\d,.]+)\s*(million|billion|trillion)?/gi,
      (_, amount, unit) => unit
        ? `${this.formatNumberForSpeech(amount)} ${unit.toLowerCase()} yen`
        : `${this.formatNumberForSpeech(amount)} yen`);

    // ── Percentage notation (%) ──
    text = text.replace(/([\d,.]+(?:\.\d+)?)\s*%/g,
      (_, num) => `${this.formatNumberForSpeech(num)} percent`);

    // ── "US$X" → "X US dollars" ──
    text = text.replace(/US\$\s*([\d,.]+(?:\.\d{1,2})?)\b/gi,
      (_, amount) => `${this.formatNumberForSpeech(amount)} US dollars`);

    return text;
  }

  private advancedTextSplitter(text: string, config: TextSplitterConfig): string[] {
    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(text);
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      if (currentLength + sentenceLength + currentChunk.length <= config.maxChunkLength) {
        currentChunk.push(sentence);
        currentLength += sentenceLength;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(' '));
        }
        currentChunk = [sentence];
        currentLength = sentenceLength;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Improved sentence splitting that handles abbreviations and technical content
    const sentences: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      current += char;

      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && /[.!?]/.test(char)) {
        // Check if this is likely a sentence ending (not an abbreviation)
        if (this.isSentenceEnding(text, i)) {
          sentences.push(current.trim());
          current = '';
        }
      }
    }

    if (current.trim()) {
      sentences.push(current.trim());
    }

    return sentences.filter(s => s.length > 0);
  }

  private isSentenceEnding(text: string, position: number): boolean {
    // Common abbreviations that shouldn't end sentences
    const abbreviations = [
      'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Jr', 'Sr', 'Rev',
      'Fig', 'Eq', 'Vol', 'No', 'Ch', 'Sec', 'Col', 'Gen', 'Capt',
      'Lt', 'Sgt', 'e.g', 'i.e', 'etc', 'viz', 'cf', 'approx',
      'GDP', 'GNP', 'FDI', 'IPO', 'ROI', 'EPS', 'YOY', 'QOQ'
    ];
    // Look backwards for potential abbreviation
    for (let i = position - 1; i >= 0; i--) {
      if (text[i] === ' ') {
        const word = text.substring(i + 1, position);
        if (abbreviations.includes(word)) {
          return false;
        }
        break;
      }
    }

    // Check if next character starts a new sentence
    if (position + 1 < text.length) {
      const nextChar = text[position + 1];
      return nextChar === ' ' && /[A-Z]/.test(text[position + 2]);
    }

    return true;
  }

  splitTextWithCustomConfig(text: string, customConfig: Partial<TextSplitterConfig>): string[] {
    const defaultConfig = this.SPLITTER_PROFILES['All'];
    const config: TextSplitterConfig = {
      ...defaultConfig,
      ...customConfig,
      isStem: customConfig.isStem ?? defaultConfig.isStem
    };

    return config.technicalNotation
      ? this.splitTechnicalText(text, config)
      : this.splitGeneralText(text, config);
  }

  /**
   * Get available categories for UI display
   */
  getAvailableCategories(): string[] {
    return Object.keys(this.SPLITTER_PROFILES).filter(cat => cat !== 'All');
  }

  /**
   * Get configuration for a specific category
   */
  getCategoryConfig(category: string): TextSplitterConfig | null {
    return this.SPLITTER_PROFILES[category] || null;
  }

  /**
   * Public method to preprocess text for TTS (for use outside of splitting)
   */
  preprocessForTTS(text: string, category?: string): string {
    const config = category
      ? this.SPLITTER_PROFILES[category] || this.SPLITTER_PROFILES['All']
      : this.SPLITTER_PROFILES['All'];

    return this.cleanText(text, config);
  }

  /**
   * SINGLE SOURCE OF TRUTH for chunking used across the app (zyppar-listen, audiobrief, audiodata, etc.).
   * Splits text (via existing category-aware logic) and estimates per-chunk durations scaled by playbackRate.
   * This ensures consistency and that faster/slower narration makes chunks "shorter/longer" in time,
   * so per-chunk timeouts, safety, and progress are correct.
   * Smaller effective chunks (via splitter profiles) mitigate impact of one failed chunk (timeout/error in iteration),
   * allowing bypass and still deliver the rest of the item reasonably.
   */
  getPlaybackChunks(text: string, category: string = 'All', playbackRate: number = 1.0): ChunkMetadata[] {
    const textChunks = this.splitTextByCategory(text, category);
    return this.estimateChunksFromText(textChunks, playbackRate);
  }

  public estimateChunksFromText(chunks: string[], playbackRate: number = 1.0): ChunkMetadata[] {
    const chunkMetadata: ChunkMetadata[] = [];
    let currentTime = 0;
    const effectiveWpm = 150 * Math.max(0.5, Math.min(2.0, playbackRate || 1.0)); // scale for current speed

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const wordCount = chunk.split(/\s+/).length;
      const duration = (wordCount / effectiveWpm) * 60; // spoken seconds at rate
      chunkMetadata.push({
        text: chunk,
        startTime: currentTime,
        endTime: currentTime + duration,
        duration: duration,
        index: i,
        fileId: ''
      });
      currentTime += duration;
    }

    return chunkMetadata;
  }
}