// Test the convertHourToTimestamp function behavior
function convertHourToTimestamp(hour, targetDate) {
  if (!hour) return null;
  const baseDate = targetDate ? new Date(targetDate) : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const date = baseDate.getDate();
  const [h, m] = hour.split(':').map(Number);
  // 1. Construct UTC timestamp for the same Y/M/D H:M as if in UTC
  const utcMs = Date.UTC(year, month, date, h, m, 0);
  // 2. Subtract 9 hours (Tokyo offset) so that when formatted in Asia/Tokyo, it shows the intended H:M
  const jstMs = utcMs - 9 * 60 * 60 * 1000;
  return jstMs;
}

console.log('Testing convertHourToTimestamp function:');
console.log('Date: 2024-01-15');
console.log('09:00 ->', convertHourToTimestamp('09:00', '2024-01-15'));
console.log('17:00 ->', convertHourToTimestamp('17:00', '2024-01-15'));

const testDate = '2024-01-15';
const testTime = '09:00';
const result = convertHourToTimestamp(testTime, testDate);
console.log('Result timestamp:', result);
console.log('Result as JST:', new Date(result).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('Result as UTC:', new Date(result).toISOString());

// Test the current reservation scenario
console.log('\n--- Current Reservation Scenario ---');
const currentTimestamp = 1737105600000; // Example timestamp
console.log('Current timestamp:', currentTimestamp);
console.log('As JST:', new Date(currentTimestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('As UTC:', new Date(currentTimestamp).toISOString());

// Test work schedule conversion
console.log('\n--- Work Schedule Conversion ---');
const workStart = convertHourToTimestamp('09:00', '2025-01-16');
const workEnd = convertHourToTimestamp('17:00', '2025-01-16');
console.log('Work start (09:00):', workStart, '→', new Date(workStart).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('Work end (17:00):', workEnd, '→', new Date(workEnd).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));

// Test with today's date
const today = new Date().toISOString().split('T')[0];
console.log('\n--- Today\'s Date Test ---');
console.log('Today:', today);
const todayStart = convertHourToTimestamp('09:00', today);
const todayEnd = convertHourToTimestamp('17:00', today);
console.log('Today start (09:00):', todayStart, '→', new Date(todayStart).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
console.log('Today end (17:00):', todayEnd, '→', new Date(todayEnd).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));