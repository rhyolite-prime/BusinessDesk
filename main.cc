#include <drogon/drogon.h>

#include <cstdlib>
#include <exception>
#include <filesystem>
#include <iostream>
#include <string>

int main(int argc, char *argv[])
{
    std::string configPath;
    if (argc > 1)
    {
        configPath = argv[1];
    }
    else if (const char *environmentPath = std::getenv("BUSINESSDESK_CONFIG"))
    {
        configPath = environmentPath;
    }
    else
    {
        configPath = "config.local.json";
    }

    if (!std::filesystem::exists(configPath))
    {
        std::cerr << "Drogon config not found: " << configPath
                  << "\nCopy config.local.example.json to config.local.json, set local PostgreSQL credentials, "
                     "then start the API again."
                  << std::endl;
        return 2;
    }

    try
    {
        drogon::app().loadConfigFile(configPath).run();
    }
    catch (const std::exception &error)
    {
        std::cerr << "BusinessDesk API failed to start: " << error.what() << std::endl;
        return 1;
    }
    return 0;
}
