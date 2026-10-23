export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(-2).map((part) => part[0]).join('').toUpperCase();
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount > 0 ? `${amount.toLocaleString('vi-VN')} ₫` : 'Mở đăng ký';
}
