#include <drogon/drogon.h>
#include <filesystem>
#include <iostream>

int main() {
    //Load config file
    if (std::filesystem::exists("config.json")) {
        drogon::app().loadConfigFile("config.json");
    } else if (std::filesystem::exists("../config.json")) {
        drogon::app().loadConfigFile("../config.json");
    } else if (std::filesystem::exists("config.local.json")) {
        drogon::app().loadConfigFile("config.local.json");
    } else if (std::filesystem::exists("../config.local.json")) {
        drogon::app().loadConfigFile("../config.local.json");
    } else {
        std::cerr << "Warning: Could not find config.json or config.local.json" << std::endl;
    }

    drogon::app().registerPostHandlingAdvice(
      [](const drogon::HttpRequestPtr &req,
         const drogon::HttpResponsePtr &resp) {
        // Array of allowed origins
        const std::vector<std::string> allowedOrigins = {
            "http://localhost:5005",
            "https://erp.rhyoliteprime.com"
        };

        auto origin = req->getHeader("Origin");

        if (std::find(allowedOrigins.begin(), allowedOrigins.end(), origin) != allowedOrigins.end()) {
          resp->addHeader("Access-Control-Allow-Origin", origin);
          resp->addHeader("Access-Control-Allow-Credentials", "true");
        }

        // Add CORS headers to every response
        resp->addHeader("Access-Control-Allow-Methods",
                        "GET, POST, PUT, DELETE, OPTIONS");
        resp->addHeader("Access-Control-Allow-Headers",
                        "Content-Type, Authorization, Referer, User-Agent, "
                        "Accept, X-Requested-With, Origin");
      });

    drogon::app().run();
    return 0;
}
