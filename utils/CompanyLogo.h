#pragma once
#include <cstdint>
#include <string>
#include <vector>
namespace business_desk::utils {
// Inline raster uploads only; SVG/HTML data URLs must never be accepted.
inline bool validCompanyLogo(const std::string &value) {
  if (value.empty())
    return true;
  if (!value.starts_with("data:")) {
    for (unsigned char c : value)
      if (c < 32 || c == 127 || c == '\\')
        return false;
    return value.size() <= 2048 &&
           (value.starts_with("https://") || value.starts_with("http://") ||
            (value.starts_with("/") && !value.starts_with("//")));
  }
  const bool png = value.starts_with("data:image/png;base64,");
  const bool jpeg = value.starts_with("data:image/jpeg;base64,");
  if (!png && !jpeg)
    return false;
  const auto encoded = value.substr(png ? 22 : 23);
  if (encoded.empty() || encoded.size() % 4 || encoded.size() > 349528)
    return false;
  const std::string alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::vector<unsigned char> bytes;
  bytes.reserve(encoded.size() / 4 * 3);
  for (size_t i = 0; i < encoded.size(); i += 4) {
    uint32_t bits = 0;
    int padding = 0;
    for (int j = 0; j < 4; ++j) {
      const char c = encoded[i + j];
      if (c == '=') {
        if (i + 4 != encoded.size() || j < 2)
          return false;
        ++padding;
        bits <<= 6;
      } else {
        auto digit = alphabet.find(c);
        if (padding || digit == std::string::npos)
          return false;
        bits = (bits << 6) | uint32_t(digit);
      }
    }
    if (padding > 2 || (padding == 2 && (bits & 0xffff)) ||
        (padding == 1 && (bits & 0xff)))
      return false;
    bytes.push_back((bits >> 16) & 255);
    if (padding < 2)
      bytes.push_back((bits >> 8) & 255);
    if (!padding)
      bytes.push_back(bits & 255);
  }
  if (bytes.size() > 262144)
    return false;
  if (png) {
    const unsigned char signature[] = {137, 80, 78, 71, 13, 10, 26, 10};
    if (bytes.size() < 33)
      return false;
    for (int i = 0; i < 8; ++i)
      if (bytes[i] != signature[i])
        return false;
    // Bound the declared PNG canvas before another user renders the image.
    auto size = [&](int p) {
      return (uint32_t(bytes[p]) << 24) | (uint32_t(bytes[p + 1]) << 16) |
             (uint32_t(bytes[p + 2]) << 8) | bytes[p + 3];
    };
    return bytes[12] == 'I' && bytes[13] == 'H' && bytes[14] == 'D' &&
           bytes[15] == 'R' && size(16) > 0 && size(16) <= 4096 &&
           size(20) > 0 && size(20) <= 4096;
  }
  if (bytes.size() < 4 || bytes[0] != 255 || bytes[1] != 216 ||
      bytes[2] != 255 || bytes[bytes.size() - 2] != 255 || bytes.back() != 217)
    return false;
  for (size_t p = 2; p + 3 < bytes.size();) {
    if (bytes[p++] != 255)
      return false;
    while (p < bytes.size() && bytes[p] == 255)
      ++p;
    if (p >= bytes.size())
      return false;
    const auto marker = bytes[p++];
    if (marker == 0xd9 || marker == 0xda)
      return false;
    if (marker == 0x01 || (marker >= 0xd0 && marker <= 0xd8))
      continue;
    if (p + 2 > bytes.size())
      return false;
    const size_t length = (size_t(bytes[p]) << 8) | bytes[p + 1];
    if (length < 2 || p + length > bytes.size())
      return false;
    if ((marker >= 0xc0 && marker <= 0xcf) && marker != 0xc4 &&
        marker != 0xc8 && marker != 0xcc) {
      if (length < 8)
        return false;
      const auto height = (unsigned(bytes[p + 3]) << 8) | bytes[p + 4],
                 width = (unsigned(bytes[p + 5]) << 8) | bytes[p + 6];
      return width > 0 && width <= 4096 && height > 0 && height <= 4096;
    }
    p += length;
  }
  return false;
}
} // namespace business_desk::utils
