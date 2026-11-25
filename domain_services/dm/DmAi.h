#pragma once

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdint>
#include <json/json.h>
#include <map>
#include <sstream>
#include <string>
#include <vector>

namespace business_desk::domain_services::dm_ai {

// ============================================================================
// 1. Deterministic Heuristic Document Classifier
// ============================================================================

struct ClassificationResult {
  std::string category;
  double confidence = 0.0;
  std::vector<std::string> signals;
  std::vector<std::string> suggestedTags;
};

class HeuristicClassifier {
public:
  static ClassificationResult classify(const std::string &title,
                                       const std::string &content,
                                       const std::string &mimeType = "") {
    std::string text = title + " " + content;
    std::string lowerText;
    lowerText.reserve(text.size());
    for (char c : text) lowerText.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));

    struct CategoryRule {
      std::string name;
      std::vector<std::string> keywords;
      std::vector<std::string> tags;
    };

    static const std::vector<CategoryRule> rules = {
      {
        "Invoice",
        {"invoice", "amount due", "due date", "subtotal", "tax id", "vat", "bill to", "remit to", "line item", "po number"},
        {"finance", "accounts-payable", "invoice"}
      },
      {
        "Contract",
        {"agreement", "parties", "confidentiality", "indemnification", "governing law", "in witness whereof", "effective date", "clause", "terms and conditions"},
        {"legal", "contract", "compliance"}
      },
      {
        "Financial Report",
        {"balance sheet", "income statement", "cash flow", "fiscal year", "profit and loss", "ebitda", "net income", "liabilities", "assets"},
        {"finance", "reporting", "general-ledger"}
      },
      {
        "HR Policy",
        {"employee", "handbook", "leave policy", "human resources", "code of conduct", "workplace", "benefits", "harassment", "vacation"},
        {"hr", "policy", "internal"}
      },
      {
        "Technical Spec",
        {"specification", "architecture", "api", "database schema", "payload", "protocol", "interface", "system design", "endpoints"},
        {"engineering", "technical", "spec"}
      },
      {
        "Receipt",
        {"receipt", "cashier", "terminal", "paid in full", "change due", "subtotal", "tender", "store number"},
        {"receipt", "expenses", "finance"}
      },
      {
        "Identification",
        {"passport", "driver license", "national id", "date of birth", "nationality", "ssn", "identification card", "card number"},
        {"identity", "confidential", "kyc"}
      }
    };

    std::string bestCategory = "General Correspondence";
    double bestScore = 0.0;
    std::vector<std::string> bestSignals;
    std::vector<std::string> bestTags = {"general"};

    for (const auto &rule : rules) {
      double score = 0.0;
      std::vector<std::string> matched;
      for (const auto &kw : rule.keywords) {
        if (lowerText.find(kw) != std::string::npos) {
          score += 1.0;
          matched.push_back(kw);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = rule.name;
        bestSignals = matched;
        bestTags = rule.tags;
      }
    }

    ClassificationResult res;
    res.category = bestCategory;
    res.signals = bestSignals;
    res.suggestedTags = bestTags;
    res.confidence = bestScore > 0 ? std::min(1.0, 0.40 + (bestScore * 0.15)) : 0.35;

    if (mimeType.find("pdf") != std::string::npos)
      res.suggestedTags.push_back("pdf");
    return res;
  }
};

// ============================================================================
// 2. Deterministic FNV-1a Hashing Embeddings (256-dim)
// ============================================================================

class Fnv1aEmbedding {
public:
  static constexpr size_t DIMENSION = 256;

  static uint64_t fnv1a64(const std::string &s) {
    uint64_t h = 14695981039346656037ULL;
    for (unsigned char c : s) {
      h ^= static_cast<uint64_t>(c);
      h *= 1099511628211ULL;
    }
    return h;
  }

  static std::vector<float> generate(const std::string &text) {
    std::vector<float> vec(DIMENSION, 0.0f);
    if (text.empty())
      return vec;

    std::vector<std::string> tokens;
    std::string cur;
    for (char c : text) {
      if (std::isalnum(static_cast<unsigned char>(c))) {
        cur.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
      } else {
        if (!cur.empty()) {
          tokens.push_back(cur);
          cur.clear();
        }
      }
    }
    if (!cur.empty())
      tokens.push_back(cur);

    if (tokens.empty())
      return vec;

    // Unigrams
    for (const auto &tok : tokens) {
      uint64_t h = fnv1a64(tok);
      size_t dim = h % DIMENSION;
      float sign = ((h >> 8) & 1) ? 1.0f : -1.0f;
      vec[dim] += sign * 1.0f;
    }

    // Bigrams
    for (size_t i = 1; i < tokens.size(); ++i) {
      std::string bigram = tokens[i - 1] + "_" + tokens[i];
      uint64_t h = fnv1a64(bigram);
      size_t dim = h % DIMENSION;
      float sign = ((h >> 8) & 1) ? 1.0f : -1.0f;
      vec[dim] += sign * 1.5f;
    }

    // L2 Normalization
    double norm = 0.0;
    for (float v : vec) norm += v * v;
    norm = std::sqrt(norm);
    if (norm > 1e-9) {
      for (float &v : vec) v = static_cast<float>(v / norm);
    }
    return vec;
  }

  static double cosineSimilarity(const std::vector<float> &a, const std::vector<float> &b) {
    if (a.size() != DIMENSION || b.size() != DIMENSION)
      return 0.0;
    double dot = 0.0;
    for (size_t i = 0; i < DIMENSION; ++i)
      dot += a[i] * b[i];
    return std::clamp(dot, -1.0, 1.0);
  }
};

// ============================================================================
// 3. Extractive RAG with Source Citations
// ============================================================================

struct DocumentChunk {
  std::string documentId;
  std::string documentNumber;
  std::string documentTitle;
  int chunkIndex = 0;
  int pageNumber = 1;
  std::string text;
  std::vector<float> vector;
};

struct Citation {
  std::string documentId;
  std::string documentNumber;
  std::string documentTitle;
  int chunkIndex = 0;
  int pageNumber = 1;
  double similarity = 0.0;
  std::string snippet;
};

struct RagResponse {
  std::string query;
  std::string answer;
  std::vector<Citation> citations;
  double topConfidence = 0.0;
};

class ExtractiveRag {
public:
  static std::vector<DocumentChunk> chunkDocument(const std::string &docId,
                                                  const std::string &docNumber,
                                                  const std::string &title,
                                                  const std::string &fullText,
                                                  size_t chunkWords = 80,
                                                  size_t overlapWords = 20) {
    std::vector<DocumentChunk> chunks;
    std::vector<std::string> words;
    std::string w;
    for (char c : fullText) {
      if (std::isspace(static_cast<unsigned char>(c))) {
        if (!w.empty()) { words.push_back(w); w.clear(); }
      } else {
        w.push_back(c);
      }
    }
    if (!w.empty()) words.push_back(w);

    if (words.empty()) {
      DocumentChunk c;
      c.documentId = docId;
      c.documentNumber = docNumber;
      c.documentTitle = title;
      c.chunkIndex = 0;
      c.pageNumber = 1;
      c.text = title;
      c.vector = Fnv1aEmbedding::generate(title);
      chunks.push_back(c);
      return chunks;
    }

    int chunkIdx = 0;
    size_t i = 0;
    while (i < words.size()) {
      size_t end = std::min(i + chunkWords, words.size());
      std::ostringstream ss;
      for (size_t j = i; j < end; ++j) {
        if (j > i) ss << ' ';
        ss << words[j];
      }
      DocumentChunk c;
      c.documentId = docId;
      c.documentNumber = docNumber;
      c.documentTitle = title;
      c.chunkIndex = chunkIdx++;
      c.pageNumber = static_cast<int>(1 + (i / 250)); // Approx 250 words per page
      c.text = ss.str();
      c.vector = Fnv1aEmbedding::generate(c.text);
      chunks.push_back(c);

      if (end == words.size()) break;
      i += (chunkWords > overlapWords ? (chunkWords - overlapWords) : 1);
    }
    return chunks;
  }

  static RagResponse query(const std::string &queryText,
                           const std::vector<DocumentChunk> &corpus,
                           size_t topK = 3) {
    RagResponse resp;
    resp.query = queryText;
    if (corpus.empty() || queryText.empty()) {
      resp.answer = "No document context available to answer the query.";
      return resp;
    }

    std::vector<float> qVec = Fnv1aEmbedding::generate(queryText);

    struct ScoredChunk {
      double score;
      const DocumentChunk *chunk;
    };
    std::vector<ScoredChunk> scored;
    scored.reserve(corpus.size());
    for (const auto &c : corpus) {
      double sim = Fnv1aEmbedding::cosineSimilarity(qVec, c.vector);
      scored.push_back({sim, &c});
    }

    std::sort(scored.begin(), scored.end(), [](const ScoredChunk &a, const ScoredChunk &b) {
      return a.score > b.score;
    });

    size_t count = std::min(topK, scored.size());
    std::ostringstream ans;
    ans << "Based on the repository documents: ";

    for (size_t i = 0; i < count; ++i) {
      if (scored[i].score <= 0.05 && i > 0) break;
      Citation cit;
      cit.documentId = scored[i].chunk->documentId;
      cit.documentNumber = scored[i].chunk->documentNumber;
      cit.documentTitle = scored[i].chunk->documentTitle;
      cit.chunkIndex = scored[i].chunk->chunkIndex;
      cit.pageNumber = scored[i].chunk->pageNumber;
      cit.similarity = scored[i].score;
      cit.snippet = scored[i].chunk->text.substr(0, 160) + "...";
      resp.citations.push_back(cit);

      if (i > 0) ans << " Furthermore, ";
      ans << "[" << (i + 1) << "] (" << cit.documentNumber << ", page "
          << cit.pageNumber << "): \"" << cit.snippet << "\"";
    }

    resp.topConfidence = resp.citations.empty() ? 0.0 : resp.citations[0].similarity;
    resp.answer = ans.str();
    return resp;
  }
};

} // namespace business_desk::domain_services::dm_ai
