import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

export interface ExtractedEntity {
  text: string;
  type: string;
  start: number;
  end: number;
}

export interface ExtractedRelationship {
  from: string;
  to: string;
  type: string;
  context: string;
  confidence: number;
}

export interface ExtractionResult {
  entities: {
    people: ExtractedEntity[];
    organizations: ExtractedEntity[];
    places: ExtractedEntity[];
    dates: ExtractedEntity[];
    technologies: ExtractedEntity[];
    projects: ExtractedEntity[];
  };
  relationships: ExtractedRelationship[];
  keywords: string[];
  summary?: string;
}

export class EntityExtractor {
  private nlp: any;
  private its: any;
  private as: any;
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    this.nlp = winkNLP(model);
    this.its = this.nlp.its;
    this.as = this.nlp.as;
    this.quiet = quiet;
  }

  private log(message: string, ...args: any[]) {
    if (!this.quiet) {
      console.error(message, ...args);
    }
  }

  async extract(text: string): Promise<ExtractionResult> {
    const doc = this.nlp.readDoc(text);

    // Extract standard entities
    const entities = this.extractEntities(doc);

    // Extract relationships between entities
    const relationships = this.extractRelationships(doc, entities);

    // Extract keywords
    const keywords = this.extractKeywords(doc);

    // Generate a brief summary (optional)
    const summary = this.generateSummary(doc);

    return {
      entities,
      relationships,
      keywords,
      summary,
    };
  }

  private extractEntities(doc: any): ExtractionResult["entities"] {
    const entities = {
      people: [] as ExtractedEntity[],
      organizations: [] as ExtractedEntity[],
      places: [] as ExtractedEntity[],
      dates: [] as ExtractedEntity[],
      technologies: [] as ExtractedEntity[],
      projects: [] as ExtractedEntity[],
    };

    // Extract standard named entities
    doc.entities().each((entity: any) => {
      const entityData: ExtractedEntity = {
        text: entity.out(),
        type: entity.out(this.its.type),
        start: entity.out(this.its.span)[0],
        end: entity.out(this.its.span)[1],
      };

      switch (entityData.type) {
        case "PERSON":
          entities.people.push(entityData);
          break;
        case "ORG":
          entities.organizations.push(entityData);
          break;
        case "PLACE":
        case "GPE": // Geo-political entity
          entities.places.push(entityData);
          break;
        case "DATE":
        case "TIME":
          entities.dates.push(entityData);
          break;
      }
    });

    // Extract custom entities (technologies and projects)
    this.extractCustomEntities(doc, entities);

    return entities;
  }

  private extractCustomEntities(
    doc: any,
    entities: ExtractionResult["entities"],
  ): void {
    // Technology patterns
    const techPatterns = [
      /\b(React|Vue|Angular|Next\.js|Node\.js|TypeScript|JavaScript|Python|Rust|Go)\b/gi,
      /\b(Redis|MongoDB|PostgreSQL|MySQL|Elasticsearch)\b/gi,
      /\b(Docker|Kubernetes|AWS|GCP|Azure)\b/gi,
      /\b(GraphQL|REST|gRPC|WebSocket)\b/gi,
      /\b(AI|ML|NLP|LLM|GPT|BERT|transformer)\b/gi,
    ];

    // Project patterns (words starting with capital letters followed by specific patterns)
    const projectPatterns = [
      /\b([A-Z][a-zA-Z]+(?:[-_][A-Za-z]+)*)\s+(?:project|app|system|platform|tool)\b/g,
      /\bproject\s+([A-Z][a-zA-Z]+(?:[-_][A-Za-z]+)*)\b/g,
    ];

    const text = doc.out();

    // Extract technologies
    techPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const tech = match[1] || match[0];
        if (!entities.technologies.some((t) => t.text === tech)) {
          entities.technologies.push({
            text: tech,
            type: "TECHNOLOGY",
            start: match.index,
            end: match.index + tech.length,
          });
        }
      }
    });

    // Extract projects
    projectPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const project = match[1];
        if (!entities.projects.some((p) => p.text === project)) {
          entities.projects.push({
            text: project,
            type: "PROJECT",
            start: match.index,
            end: match.index + project.length,
          });
        }
      }
    });
  }

  private extractRelationships(
    doc: any,
    entities: ExtractionResult["entities"],
  ): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    // Relationship patterns with confidence scores
    const patterns = [
      {
        regex: /(\w+)\s+(?:works?|employed)\s+(?:at|for|with)\s+(\w+)/gi,
        type: "WORKS_FOR",
        confidence: 0.9,
      },
      { regex: /(\w+)\s+manages?\s+(\w+)/gi, type: "MANAGES", confidence: 0.8 },
      {
        regex: /(\w+)\s+(?:leads?|heads?)\s+(\w+)/gi,
        type: "LEADS",
        confidence: 0.8,
      },
      {
        regex: /(\w+)\s+reports?\s+to\s+(\w+)/gi,
        type: "REPORTS_TO",
        confidence: 0.9,
      },
      {
        regex: /(\w+)\s+(?:uses?|utilizing|leverages?)\s+(\w+)/gi,
        type: "USES",
        confidence: 0.7,
      },
      {
        regex:
          /(\w+)\s+(?:built|created|developed)\s+(?:with|using|on)\s+(\w+)/gi,
        type: "BUILT_WITH",
        confidence: 0.8,
      },
      {
        regex: /(\w+)\s+(?:owns?|founded|started)\s+(\w+)/gi,
        type: "OWNS",
        confidence: 0.9,
      },
      {
        regex: /(\w+)\s+(?:located|based)\s+(?:in|at)\s+(\w+)/gi,
        type: "LOCATED_IN",
        confidence: 0.9,
      },
      {
        regex: /(\w+)\s+(?:part|member|division)\s+of\s+(\w+)/gi,
        type: "PART_OF",
        confidence: 0.8,
      },
      {
        regex: /(\w+)\s+(?:knows?|familiar\s+with)\s+(\w+)/gi,
        type: "KNOWS",
        confidence: 0.6,
      },
      {
        regex: /(\w+)\s+(?:depends?\s+on|requires?)\s+(\w+)/gi,
        type: "DEPENDS_ON",
        confidence: 0.8,
      },
      {
        regex: /(\w+)\s+(?:integrates?\s+with|connects?\s+to)\s+(\w+)/gi,
        type: "INTEGRATES_WITH",
        confidence: 0.7,
      },
    ];

    // Process each sentence
    doc.sentences().each((sentence: any) => {
      const sentenceText = sentence.out();

      patterns.forEach((pattern) => {
        let match;
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

        while ((match = regex.exec(sentenceText)) !== null) {
          const from = match[1];
          const to = match[2];

          // Check if entities are recognized
          const fromEntity = this.findEntity(from, entities);
          const toEntity = this.findEntity(to, entities);

          // Increase confidence if both are recognized entities
          let confidence = pattern.confidence;
          if (fromEntity && toEntity) {
            confidence = Math.min(1.0, confidence + 0.1);
          }

          relationships.push({
            from,
            to,
            type: pattern.type,
            context: sentenceText,
            confidence,
          });
        }
      });
    });

    // Deduplicate relationships
    return this.deduplicateRelationships(relationships);
  }

  private findEntity(
    text: string,
    entities: ExtractionResult["entities"],
  ): ExtractedEntity | null {
    const allEntities = [
      ...entities.people,
      ...entities.organizations,
      ...entities.places,
      ...entities.technologies,
      ...entities.projects,
    ];

    return (
      allEntities.find((e) => e.text.toLowerCase() === text.toLowerCase()) ||
      null
    );
  }

  private deduplicateRelationships(
    relationships: ExtractedRelationship[],
  ): ExtractedRelationship[] {
    const seen = new Set<string>();
    const unique: ExtractedRelationship[] = [];

    for (const rel of relationships) {
      const key = `${rel.from}:${rel.type}:${rel.to}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rel);
      }
    }

    return unique;
  }

  private extractKeywords(doc: any): string[] {
    const keywords = new Set<string>();

    // Extract nouns and important words
    doc
      .tokens()
      .filter((t: any) => {
        const pos = t.out(this.its.pos);
        const text = t.out();
        return (
          (pos === "NOUN" || pos === "PROPN") &&
          text.length > 3 &&
          !this.isStopWord(text)
        );
      })
      .each((t: any) => {
        keywords.add(t.out().toLowerCase());
      });

    // Add bi-grams that appear to be meaningful
    const tokens = doc.tokens();
    const tokenCount = tokens.out().length;

    tokens.each((t: any, idx: number) => {
      if (idx > 0 && idx < tokenCount) {
        const pos = t.out(this.its.pos);
        const prevToken = tokens.itemAt(idx - 1);
        const prevPos = prevToken.out(this.its.pos);

        if (
          (pos === "NOUN" && prevPos === "ADJ") ||
          (pos === "NOUN" && prevPos === "NOUN")
        ) {
          const prev = prevToken.out();
          const current = t.out();
          keywords.add(`${prev.toLowerCase()} ${current.toLowerCase()}`);
        }
      }
    });

    return Array.from(keywords).slice(0, 20); // Top 20 keywords
  }

  private generateSummary(doc: any): string {
    // Simple extractive summary - take the first 2 sentences
    const sentences: string[] = [];
    let count = 0;
    doc.sentences().each((s: any) => {
      if (count < 2) {
        sentences.push(s.out());
        count++;
      }
    });

    return sentences.join(" ");
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "what",
      "which",
      "who",
      "when",
      "where",
      "why",
      "how",
      "all",
      "each",
      "every",
      "both",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "than",
      "too",
      "very",
    ]);

    return stopWords.has(word.toLowerCase());
  }

  // Batch processing
  async extractBatch(texts: string[]): Promise<ExtractionResult[]> {
    return Promise.all(texts.map((text) => this.extract(text)));
  }
}
