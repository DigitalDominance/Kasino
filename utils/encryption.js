const crypto = require("crypto");

// Function to ensure the secret key is 32 bytes (for AES-256-CBC)
function ensure32ByteKey(secretKey) {
  if (!secretKey) {
    throw new Error('Secret key is undefined');
  }
  
  // If secretKey is too short, pad it
  if (secretKey.length < 32) {
    return secretKey.padEnd(32, '\0'); // Pad with null characters
  }
  // If it's too long, trim it
  return secretKey.slice(0, 32); // Trim to 32 bytes
}

// Function to encrypt data using AES-256-CBC
function encryptData(data, secretKey) {
  const iv = crypto.randomBytes(16); // Generate a random IV
  
  // Ensure the secretKey is 32 bytes
  const key = ensure32ByteKey(secretKey);

  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf-8'), iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf-8', 'hex');
  encrypted += cipher.final('hex');

  return { iv: iv.toString('hex'), encryptedData: encrypted };
}

// Function to decrypt data (client-side or server-side as needed)
function decryptData(encryptedData, iv, secretKey) {
  // Ensure the secretKey is 32 bytes
  const key = ensure32ByteKey(secretKey);

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf-8'), Buffer.from(iv, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');

  return JSON.parse(decrypted);
}

module.exports = { encryptData, decryptData };
