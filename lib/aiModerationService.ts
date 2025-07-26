import { supabase } from './supabase';

// AI Moderation Service
// Provides sentiment analysis, toxicity detection, and content moderation

export interface AIAnalysisResult {
  sentiment_score: number; // -1 (negative) to 1 (positive)
  toxicity_score: number;  // 0 (clean) to 1 (toxic)
  confidence: number;      // 0 to 1
  language: string;
  topics: string[];
  mentions: string[];
  flags: ModerationFlag[];
  recommended_action: 'approve' | 'review' | 'auto_hide' | 'reject';
}

export interface ModerationFlag {
  type: 'toxicity' | 'spam' | 'harassment' | 'hate_speech' | 'misinformation' | 'inappropriate';
  confidence: number;
  reason: string;
}

// Advanced sentiment analysis using multiple approaches
export class SentimentAnalyzer {
  private positiveWords = [
    'amazing', 'awesome', 'beautiful', 'brilliant', 'excellent', 'fantastic', 
    'great', 'incredible', 'love', 'perfect', 'wonderful', 'outstanding',
    'spectacular', 'superb', 'magnificent', 'marvelous', 'phenomenal',
    'inspiring', 'uplifting', 'motivating', 'encouraging', 'supportive',
    'grateful', 'thankful', 'blessed', 'happy', 'joyful', 'excited',
    'proud', 'accomplished', 'successful', 'thriving', 'flourishing'
  ];

  private negativeWords = [
    'awful', 'terrible', 'horrible', 'disgusting', 'hate', 'worst',
    'pathetic', 'useless', 'stupid', 'idiotic', 'annoying', 'frustrating',
    'disappointing', 'depressing', 'sad', 'angry', 'furious', 'outraged',
    'disgusted', 'appalled', 'shocked', 'devastated', 'heartbroken',
    'miserable', 'hopeless', 'worthless', 'failure', 'disaster'
  ];

  private intensifiers = [
    'very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely',
    'utterly', 'really', 'truly', 'definitely', 'certainly', 'particularly',
    'especially', 'remarkably', 'exceptionally', 'tremendously'
  ];

  private negators = [
    'not', 'no', 'never', 'none', 'nothing', 'nobody', 'nowhere',
    'neither', 'nor', 'hardly', 'scarcely', 'barely', 'seldom', 'rarely'
  ];

  analyzeSentiment(text: string): { score: number; confidence: number } {
    const words = this.tokenize(text.toLowerCase());
    let score = 0;
    let wordCount = 0;
    let confidence = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let wordScore = 0;
      let wordConfidence = 0;

      // Check for positive words
      if (this.positiveWords.includes(word)) {
        wordScore = 1;
        wordConfidence = 0.8;
      }
      // Check for negative words
      else if (this.negativeWords.includes(word)) {
        wordScore = -1;
        wordConfidence = 0.8;
      }

      if (wordScore !== 0) {
        // Check for intensifiers before the word
        if (i > 0 && this.intensifiers.includes(words[i - 1])) {
          wordScore *= 1.5;
          wordConfidence *= 1.2;
        }

        // Check for negators before the word
        if (i > 0 && this.negators.includes(words[i - 1])) {
          wordScore *= -1;
          wordConfidence *= 1.1;
        }

        score += wordScore;
        confidence += wordConfidence;
        wordCount++;
      }
    }

    // Normalize scores
    const normalizedScore = wordCount > 0 ? Math.max(-1, Math.min(1, score / wordCount)) : 0;
    const normalizedConfidence = Math.min(1, confidence / Math.max(wordCount, 1));

    return {
      score: normalizedScore,
      confidence: normalizedConfidence
    };
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
}

// Toxicity detection using pattern matching and ML-like approaches
export class ToxicityDetector {
  private toxicPatterns = [
    // Profanity patterns
    /\b(f+u+c+k|s+h+i+t|d+a+m+n|b+i+t+c+h|a+s+s+h+o+l+e)\b/gi,
    // Hate speech patterns
    /\b(kill\s+yourself|kys|die|suicide)\b/gi,
    // Harassment patterns
    /\b(stupid|idiot|moron|retard|loser|pathetic)\s+(person|human|individual)/gi,
    // Spam patterns
    /\b(buy\s+now|click\s+here|free\s+money|get\s+rich)\b/gi,
  ];

  private severePatterns = [
    /\b(terrorist|bomb|kill|murder|rape|nazi|hitler)\b/gi,
    /\b(nigger|faggot|chink|spic|kike)\b/gi, // Slurs - handle with extreme care
  ];

  private spamIndicators = [
    /https?:\/\/[^\s]+/gi, // URLs
    /\b\w+\.\w{2,}\b/gi,   // Domains
    /\b(follow\s+me|subscribe|like\s+and\s+share)\b/gi,
  ];

  detectToxicity(text: string): { score: number; flags: ModerationFlag[]; confidence: number } {
    const flags: ModerationFlag[] = [];
    let toxicityScore = 0;
    let confidence = 0;

    // Check for severe violations
    for (const pattern of this.severePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        toxicityScore = Math.max(toxicityScore, 0.9);
        flags.push({
          type: 'hate_speech',
          confidence: 0.95,
          reason: `Contains severe hate speech: ${matches.join(', ')}`
        });
        confidence = Math.max(confidence, 0.95);
      }
    }

    // Check for regular toxic patterns
    for (const pattern of this.toxicPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        toxicityScore = Math.max(toxicityScore, 0.6);
        flags.push({
          type: 'toxicity',
          confidence: 0.8,
          reason: `Contains inappropriate language: ${matches.length} violations`
        });
        confidence = Math.max(confidence, 0.8);
      }
    }

    // Check for spam indicators
    let spamScore = 0;
    for (const pattern of this.spamIndicators) {
      const matches = text.match(pattern);
      if (matches) {
        spamScore += matches.length * 0.2;
      }
    }

    if (spamScore > 0.5) {
      toxicityScore = Math.max(toxicityScore, spamScore);
      flags.push({
        type: 'spam',
        confidence: Math.min(0.9, spamScore),
        reason: 'Contains spam-like content'
      });
      confidence = Math.max(confidence, Math.min(0.9, spamScore));
    }

    // Additional heuristics
    const capsRatio = this.calculateCapsRatio(text);
    if (capsRatio > 0.7 && text.length > 20) {
      toxicityScore = Math.max(toxicityScore, 0.3);
      flags.push({
        type: 'inappropriate',
        confidence: 0.6,
        reason: 'Excessive use of capital letters'
      });
    }

    const repeatedChars = this.detectRepeatedCharacters(text);
    if (repeatedChars > 0.3) {
      toxicityScore = Math.max(toxicityScore, 0.2);
      flags.push({
        type: 'spam',
        confidence: 0.5,
        reason: 'Excessive repeated characters'
      });
    }

    return {
      score: Math.min(1, toxicityScore),
      flags,
      confidence: Math.min(1, confidence)
    };
  }

  private calculateCapsRatio(text: string): number {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;
    const caps = text.replace(/[^A-Z]/g, '');
    return caps.length / letters.length;
  }

  private detectRepeatedCharacters(text: string): number {
    const repeatedPattern = /(.)\1{2,}/g;
    const matches = text.match(repeatedPattern) || [];
    return matches.length / Math.max(text.length / 10, 1);
  }
}

// Content analyzer for topics and mentions
export class ContentAnalyzer {
  private topicKeywords = {
    fitness: ['workout', 'gym', 'exercise', 'training', 'muscle', 'cardio', 'strength', 'fitness', 'health'],
    food: ['food', 'recipe', 'cooking', 'meal', 'diet', 'nutrition', 'healthy', 'delicious', 'taste'],
    travel: ['travel', 'trip', 'vacation', 'destination', 'adventure', 'explore', 'journey', 'visit'],
    technology: ['tech', 'app', 'software', 'digital', 'online', 'internet', 'computer', 'mobile'],
    lifestyle: ['life', 'daily', 'routine', 'habit', 'style', 'living', 'personal', 'experience'],
    entertainment: ['movie', 'music', 'show', 'game', 'fun', 'entertainment', 'enjoy', 'watch'],
    fashion: ['fashion', 'style', 'outfit', 'clothing', 'wear', 'trend', 'look', 'design'],
    business: ['business', 'work', 'career', 'professional', 'company', 'success', 'entrepreneur'],
  };

  analyzeContent(text: string): { topics: string[]; mentions: string[]; language: string } {
    const topics = this.extractTopics(text);
    const mentions = this.extractMentions(text);
    const language = this.detectLanguage(text);

    return { topics, mentions, language };
  }

  private extractTopics(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const detectedTopics: string[] = [];

    for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
      const matchCount = keywords.filter(keyword => 
        words.some(word => word.includes(keyword))
      ).length;

      if (matchCount >= 1) {
        detectedTopics.push(topic);
      }
    }

    return detectedTopics;
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const spanishWords = ['el', 'la', 'y', 'o', 'pero', 'en', 'a', 'para', 'de', 'con', 'por'];
    const frenchWords = ['le', 'la', 'et', 'ou', 'mais', 'dans', 'sur', 'à', 'pour', 'de', 'avec', 'par'];

    const words = text.toLowerCase().split(/\s+/);
    
    const englishMatches = words.filter(word => englishWords.includes(word)).length;
    const spanishMatches = words.filter(word => spanishWords.includes(word)).length;
    const frenchMatches = words.filter(word => frenchWords.includes(word)).length;

    if (englishMatches >= spanishMatches && englishMatches >= frenchMatches) return 'en';
    if (spanishMatches >= frenchMatches) return 'es';
    if (frenchMatches > 0) return 'fr';
    
    return 'en'; // Default to English
  }
}

// Main AI Moderation Service
export class AIModerationService {
  private sentimentAnalyzer = new SentimentAnalyzer();
  private toxicityDetector = new ToxicityDetector();
  private contentAnalyzer = new ContentAnalyzer();

  async analyzeComment(content: string): Promise<AIAnalysisResult> {
    try {
      // Perform all analyses in parallel
      const [sentimentResult, toxicityResult, contentResult] = await Promise.all([
        Promise.resolve(this.sentimentAnalyzer.analyzeSentiment(content)),
        Promise.resolve(this.toxicityDetector.detectToxicity(content)),
        Promise.resolve(this.contentAnalyzer.analyzeContent(content)),
      ]);

      // Determine recommended action based on analysis
      let recommendedAction: 'approve' | 'review' | 'auto_hide' | 'reject' = 'approve';
      
      if (toxicityResult.score > 0.8) {
        recommendedAction = 'reject';
      } else if (toxicityResult.score > 0.6) {
        recommendedAction = 'auto_hide';
      } else if (toxicityResult.score > 0.4 || sentimentResult.score < -0.7) {
        recommendedAction = 'review';
      }

      // Calculate overall confidence
      const confidence = Math.max(sentimentResult.confidence, toxicityResult.confidence);

      const result: AIAnalysisResult = {
        sentiment_score: sentimentResult.score,
        toxicity_score: toxicityResult.score,
        confidence,
        language: contentResult.language,
        topics: contentResult.topics,
        mentions: contentResult.mentions,
        flags: toxicityResult.flags,
        recommended_action: recommendedAction,
      };

      // Log analysis for training and improvement
      await this.logAnalysis(content, result);

      return result;

    } catch (error) {
      console.error('Error in AI analysis:', error);
      
      // Return safe defaults on error
      return {
        sentiment_score: 0,
        toxicity_score: 0,
        confidence: 0,
        language: 'en',
        topics: [],
        mentions: [],
        flags: [],
        recommended_action: 'approve',
      };
    }
  }

  private async logAnalysis(content: string, result: AIAnalysisResult): Promise<void> {
    try {
      await supabase.from('ai_analysis_logs').insert({
        content_hash: this.hashContent(content),
        content_length: content.length,
        sentiment_score: result.sentiment_score,
        toxicity_score: result.toxicity_score,
        confidence: result.confidence,
        language: result.language,
        topics: result.topics,
        flags: result.flags,
        recommended_action: result.recommended_action,
        analyzed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging AI analysis:', error);
    }
  }

  private hashContent(content: string): string {
    // Simple hash function for privacy-preserving logging
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Batch analysis for multiple comments
  async analyzeComments(contents: string[]): Promise<AIAnalysisResult[]> {
    const analyses = await Promise.all(
      contents.map(content => this.analyzeComment(content))
    );
    return analyses;
  }

  // Real-time moderation for live comments
  async moderateRealtime(content: string): Promise<{
    approved: boolean;
    reason?: string;
    analysis: AIAnalysisResult;
  }> {
    const analysis = await this.analyzeComment(content);
    
    const approved = analysis.recommended_action === 'approve';
    const reason = approved ? undefined : `Content flagged: ${analysis.flags.map(f => f.reason).join(', ')}`;

    return {
      approved,
      reason,
      analysis,
    };
  }
}

// Singleton instance
export const aiModerationService = new AIModerationService(); 