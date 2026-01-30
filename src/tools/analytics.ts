import { analyticsPost } from "../client.js";
import type { ToolDef } from "../types.js";

export const annotateText: ToolDef = {
  name: "annotate_text",
  description:
    "Named entity recognition — identify people, locations, organizations, and things in text. Supports 100+ languages.",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to annotate.",
      },
    },
    required: ["text"],
  },
  handler: async (params) => {
    return analyticsPost("/annotate", { text: params.text });
  },
};

export const categorizeText: ToolDef = {
  name: "categorize_text",
  description:
    "Classify text into predefined categories. Choose a taxonomy: dmoz (~5000 categories, English only), news (8 categories, all languages), or iptc (~1000 categories, all languages).",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to categorize.",
      },
      taxonomy: {
        type: "string",
        description: 'Taxonomy to use: "dmoz", "news", or "iptc".',
        enum: ["dmoz", "news", "iptc"],
      },
    },
    required: ["text", "taxonomy"],
  },
  handler: async (params) => {
    return analyticsPost("/categorize", {
      text: params.text,
      taxonomy: params.taxonomy,
    });
  },
};

export const analyzeSentiment: ToolDef = {
  name: "analyze_sentiment",
  description:
    "Compute sentiment of text. Returns a score from -1 (very negative) to 1 (very positive). English only.",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to analyze.",
      },
    },
    required: ["text"],
  },
  handler: async (params) => {
    return analyticsPost("/sentiment", { text: params.text });
  },
};

export const extractArticleInfo: ToolDef = {
  name: "extract_article_info",
  description:
    "Crawl a URL and extract structured article data: title, body, authors, date, image, links, videos, metadata.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL of the article to extract.",
      },
    },
    required: ["url"],
  },
  handler: async (params) => {
    return analyticsPost("/extractArticleInfo", { url: params.url });
  },
};

export const detectLanguage: ToolDef = {
  name: "detect_language",
  description:
    "Detect the language of a text. Returns ISO language codes with confidence probabilities.",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to detect language of.",
      },
    },
    required: ["text"],
  },
  handler: async (params) => {
    return analyticsPost("/detectLanguage", { text: params.text });
  },
};

export const computeSemanticSimilarity: ToolDef = {
  name: "compute_semantic_similarity",
  description:
    "Compare the semantic similarity between two texts. Supports cross-language comparison.",
  inputSchema: {
    type: "object",
    properties: {
      text1: {
        type: "string",
        description: "First text to compare.",
      },
      text2: {
        type: "string",
        description: "Second text to compare.",
      },
    },
    required: ["text1", "text2"],
  },
  handler: async (params) => {
    return analyticsPost("/semanticSimilarity", {
      text1: params.text1,
      text2: params.text2,
    });
  },
};

export const analyticsTools: ToolDef[] = [
  annotateText,
  categorizeText,
  analyzeSentiment,
  extractArticleInfo,
  detectLanguage,
  computeSemanticSimilarity,
];
