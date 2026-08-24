// Simple reusable input validators (kept dependency-free for a college project)

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPan(value) {
  return typeof value === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.toUpperCase());
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return !isNaN(value) && Number(value) > 0;
}

function isValidDate(value) {
  return !isNaN(Date.parse(value));
}

module.exports = { isEmail, isPan, isNonEmptyString, isPositiveNumber, isValidDate };
