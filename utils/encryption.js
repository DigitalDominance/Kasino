const crypto = require("crypto");

// Function to encrypt data using AES-256-CBC
function encryptData(data, secretKey) {
  const iv = crypto.randomBytes(16); // Generate a random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return { iv: iv.toString('hex'), encryptedData: encrypted };
}

// Function to decrypt data (client-side or server-side as needed)
function decryptData(encryptedData, iv, secretKey) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'utf-8'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return JSON.parse(decrypted);
}

module.exports = { encryptData, decryptData };
