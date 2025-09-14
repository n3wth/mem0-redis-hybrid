import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
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
  private useSpacy: boolean = true;
  private pythonPath: string;
  private scriptPath: string;
  private spacyChecked: boolean = false;

  constructor(quiet: boolean = false) {
    this.nlp = winkNLP(model);
    this.its = this.nlp.its;
    this.as = this.nlp.as;
    this.quiet = quiet;

    // Setup paths for spaCy bridge
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.scriptPath = path.join(__dirname, "spacy_bridge.py");

    // Check if we're in the r3 directory with venv
    const projectRoot = path.resolve(__dirname, "../..");
    const venvPython = path.join(projectRoot, "venv", "bin", "python");

    // Try to use venv Python if it exists, otherwise use system Python
    this.pythonPath = venvPython;
  }

  private async checkSpacyAvailability(): Promise<void> {
    try {
      const result = await this.runSpacyBridge("test");
      if (result && !result.error) {
        this.log("SpaCy entity extraction enabled");
      } else {
        this.useSpacy = false;
        this.log("SpaCy not available, using fallback");
      }
    } catch (error) {
      this.useSpacy = false;
      this.log("SpaCy not available, using fallback:", error);
    }
  }

  private log(message: string, ...args: any[]) {
    if (!this.quiet) {
      console.error(message, ...args);
    }
  }

  private runSpacyBridge(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [this.scriptPath, text]);
      let output = "";
      let error = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        error += data.toString();
      });

      process.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`SpaCy bridge exited with code ${code}: ${error}`));
        } else {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse spaCy output: ${output}`));
          }
        }
      });

      process.on("error", (err) => {
        reject(err);
      });
    });
  }

  async extract(text: string): Promise<ExtractionResult> {
    // Check spaCy availability on first use
    if (!this.spacyChecked) {
      await this.checkSpacyAvailability();
      this.spacyChecked = true;
    }

    // Try spaCy first if available
    if (this.useSpacy) {
      try {
        const spacyResult = await this.runSpacyBridge(text);
        if (spacyResult && !spacyResult.error) {
          return spacyResult as ExtractionResult;
        }
      } catch (error) {
        this.log("SpaCy extraction failed, falling back to wink:", error);
      }
    }

    // Fallback to wink-nlp
    return this.extractWithWink(text);
  }

  private extractWithWink(text: string): ExtractionResult {
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
      /\b(AI|ML|NLP|LLM|GPT|BERT|transformer|spaCy)\b/gi,
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
        entities.technologies.push({
          text: match[0],
          type: "TECH",
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    });

    // Extract projects
    projectPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.projects.push({
          text: match[1],
          type: "PROJECT",
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    });
  }

  private extractRelationships(
    doc: any,
    entities: ExtractionResult["entities"],
  ): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    // Simple relationship extraction based on sentence structure
    doc.sentences().each((sentence: any) => {
      const tokens = sentence.tokens();
      const sentenceText = sentence.out();

      // Look for patterns like "X works at Y", "X is Y's Z", etc.
      const workPatterns = [
        /(\w+)\s+(?:works?|worked)\s+(?:at|for|with)\s+(\w+)/gi,
        /(\w+)\s+is\s+(\w+)'s\s+(\w+)/gi,
        /(\w+)\s+(?:manages?|managed|leads?|led)\s+(\w+)/gi,
      ];

      workPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(sentenceText)) !== null) {
          const from = match[1];
          const to = match[2];
          const relationType = this.inferRelationType(sentenceText);

          relationships.push({
            from,
            to,
            type: relationType,
            context: sentenceText,
            confidence: 0.7,
          });
        }
      });
    });

    return relationships;
  }

  private inferRelationType(context: string): string {
    const lowercaseContext = context.toLowerCase();

    if (lowercaseContext.includes("work") || lowercaseContext.includes("employ")) {
      return "WORKS_FOR";
    } else if (lowercaseContext.includes("manage") || lowercaseContext.includes("lead")) {
      return "MANAGES";
    } else if (lowercaseContext.includes("friend") || lowercaseContext.includes("colleague")) {
      return "KNOWS";
    } else if (lowercaseContext.includes("married") || lowercaseContext.includes("husband") || lowercaseContext.includes("wife")) {
      return "MARRIED_TO";
    } else if (lowercaseContext.includes("live") || lowercaseContext.includes("located")) {
      return "LOCATED_IN";
    } else {
      return "RELATED_TO";
    }
  }

  private extractKeywords(doc: any): string[] {
    const keywords = new Set<string>();

    // Extract nouns and proper nouns
    doc.tokens().each((token: any) => {
      const pos = token.out(this.its.pos);
      const text = token.out();

      if (
        (pos === "NOUN" || pos === "PROPN") &&
        text.length > 2 &&
        !token.out(this.its.stopWordFlag)
      ) {
        keywords.add(token.out(this.its.lemma));
      }
    });

    return Array.from(keywords).slice(0, 20);
  }

  private generateSummary(doc: any): string {
    // Simple summary: first sentence or first 100 characters
    const sentences = doc.sentences();
    if (sentences.length() > 0) {
      return sentences.itemAt(0).out();
    }
    return doc.out().substring(0, 100);
  }
}