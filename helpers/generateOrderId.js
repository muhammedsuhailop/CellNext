const crypto = require("crypto");

function generateOrderId() {
  const now = new Date();

  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const random = crypto
    .randomBytes(3)
    .toString("base64")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 4);

  return `ORD${yy}${mm}${dd}${random}`;
}

module.exports = generateOrderId;
