#pragma once

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <json/json.h>
#include <string>
#include <vector>

namespace business_desk::domain_services::dm_workflow {

// ============================================================================
// 1. Structured Condition Evaluator
// ============================================================================

class ConditionEvaluator {
public:
  static bool evaluate(const Json::Value &condition, const Json::Value &docMetadata) {
    if (!condition.isObject() || condition.empty())
      return true; // No condition means always execute

    std::string field = condition.isMember("field") ? condition["field"].asString() : "";
    std::string op = condition.isMember("operator") ? condition["operator"].asString() : "eq";
    Json::Value expected = condition.isMember("value") ? condition["value"] : Json::Value();

    if (field.empty() || !docMetadata.isMember(field))
      return false;

    const Json::Value &actual = docMetadata[field];

    if (op == "eq") {
      return actual == expected;
    } else if (op == "ne") {
      return actual != expected;
    } else if (op == "gt") {
      if (actual.isNumeric() && expected.isNumeric())
        return actual.asDouble() > expected.asDouble();
    } else if (op == "gte") {
      if (actual.isNumeric() && expected.isNumeric())
        return actual.asDouble() >= expected.asDouble();
    } else if (op == "lt") {
      if (actual.isNumeric() && expected.isNumeric())
        return actual.asDouble() < expected.asDouble();
    } else if (op == "lte") {
      if (actual.isNumeric() && expected.isNumeric())
        return actual.asDouble() <= expected.asDouble();
    } else if (op == "contains") {
      if (actual.isString() && expected.isString())
        return actual.asString().find(expected.asString()) != std::string::npos;
    } else if (op == "in") {
      if (expected.isArray()) {
        for (const auto &item : expected) {
          if (item == actual) return true;
        }
        return false;
      }
    }
    return false;
  }
};

// ============================================================================
// 2. Workflow Template Validator
// ============================================================================

struct ValidationResult {
  bool valid = true;
  std::string error;
};

class WorkflowValidator {
public:
  static ValidationResult validateSteps(const Json::Value &steps) {
    ValidationResult res;
    if (!steps.isArray() || steps.empty()) {
      res.valid = false;
      res.error = "Workflow steps must be a non-empty array.";
      return res;
    }

    for (Json::ArrayIndex i = 0; i < steps.size(); ++i) {
      const auto &step = steps[i];
      if (!step.isObject()) {
        res.valid = false;
        res.error = "Step at index " + std::to_string(i) + " must be a valid JSON object.";
        return res;
      }
      if (!step.isMember("name") || step["name"].asString().empty()) {
        res.valid = false;
        res.error = "Step at index " + std::to_string(i) + " requires a non-empty 'name'.";
        return res;
      }

      std::string taskType = step.isMember("taskType") ? step["taskType"].asString() : "approval";
      if (taskType != "approval" && taskType != "review" && taskType != "sign" && taskType != "input") {
        res.valid = false;
        res.error = "Step '" + step["name"].asString() + "' has invalid taskType: " + taskType;
        return res;
      }

      std::string mode = step.isMember("executionMode") ? step["executionMode"].asString() : "sequential";
      if (mode != "sequential" && mode != "parallel") {
        res.valid = false;
        res.error = "Step '" + step["name"].asString() + "' has invalid executionMode: " + mode;
        return res;
      }
    }

    return res;
  }
};

} // namespace business_desk::domain_services::dm_workflow
