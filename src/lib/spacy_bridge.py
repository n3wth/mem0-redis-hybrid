#!/usr/bin/env python3
"""
SpaCy Entity Extraction Bridge for r3 MCP Server
Provides Named Entity Recognition using spaCy's en_core_web_sm model
"""

import sys
import json
import spacy
from typing import Dict, List, Any

# Load the spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print(json.dumps({"error": "Model en_core_web_sm not found. Run: python -m spacy download en_core_web_sm"}))
    sys.exit(1)

def extract_entities(text: str) -> Dict[str, Any]:
    """
    Extract entities from text using spaCy NER

    Returns:
        Dictionary containing categorized entities, relationships, and keywords
    """
    doc = nlp(text)

    # Initialize result structure
    result = {
        "entities": {
            "people": [],
            "organizations": [],
            "places": [],
            "dates": [],
            "technologies": [],
            "projects": [],
            "money": [],
            "products": []
        },
        "relationships": [],
        "keywords": []
    }

    # Extract named entities
    for ent in doc.ents:
        entity_data = {
            "text": ent.text,
            "type": ent.label_,
            "start": ent.start_char,
            "end": ent.end_char
        }

        # Map spaCy labels to our categories
        if ent.label_ == "PERSON":
            result["entities"]["people"].append(entity_data)
        elif ent.label_ in ["ORG", "COMPANY"]:
            result["entities"]["organizations"].append(entity_data)
        elif ent.label_ in ["GPE", "LOC", "FAC"]:
            result["entities"]["places"].append(entity_data)
        elif ent.label_ in ["DATE", "TIME"]:
            result["entities"]["dates"].append(entity_data)
        elif ent.label_ == "MONEY":
            result["entities"]["money"].append(entity_data)
        elif ent.label_ == "PRODUCT":
            result["entities"]["products"].append(entity_data)

    # Extract custom entities for technologies and projects
    # Look for common tech terms not caught by NER
    tech_patterns = [
        "AI", "ML", "NLP", "API", "MCP", "Redis", "React", "TypeScript",
        "JavaScript", "Python", "Node.js", "Docker", "Kubernetes", "AWS",
        "spaCy", "Gemini", "Claude", "GPT", "LLM", "mem0", "Qdrant"
    ]

    text_lower = text.lower()
    for tech in tech_patterns:
        if tech.lower() in text_lower:
            # Find exact position
            import re
            for match in re.finditer(re.escape(tech), text, re.IGNORECASE):
                result["entities"]["technologies"].append({
                    "text": match.group(),
                    "type": "TECHNOLOGY",
                    "start": match.start(),
                    "end": match.end()
                })

    # Extract relationships between entities
    # Simple pattern: PERSON + verb + PERSON/ORG
    for token in doc:
        if token.dep_ in ["nsubj", "dobj"] and token.head.pos_ == "VERB":
            # Check if subject and object are entities
            subj = None
            obj = None

            for child in token.head.children:
                if child.dep_ == "nsubj" and child.ent_type_:
                    subj = child
                elif child.dep_ in ["dobj", "pobj", "prep"] and child.ent_type_:
                    obj = child

            if subj and obj:
                result["relationships"].append({
                    "from": subj.text,
                    "to": obj.text if hasattr(obj, 'text') else str(obj),
                    "type": token.head.lemma_.upper(),
                    "context": token.head.text,
                    "confidence": 0.7
                })

    # Extract keywords (nouns and proper nouns)
    keywords = []
    for token in doc:
        if token.pos_ in ["NOUN", "PROPN"] and not token.is_stop and len(token.text) > 2:
            keywords.append(token.lemma_)

    # Deduplicate and limit keywords
    result["keywords"] = list(set(keywords))[:20]

    return result

def main():
    """
    Main entry point - reads text from stdin, outputs JSON to stdout
    """
    if len(sys.argv) > 1:
        # Text provided as command line argument
        text = " ".join(sys.argv[1:])
    else:
        # Read from stdin
        text = sys.stdin.read().strip()

    if not text:
        print(json.dumps({"error": "No text provided"}))
        sys.exit(1)

    try:
        result = extract_entities(text)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()