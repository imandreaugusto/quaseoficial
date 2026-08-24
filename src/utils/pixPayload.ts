// Standard EMVCo / BCB Pix Payload Generator with CRC16-CCITT

function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadParams {
  pixKey: string;
  beneficiaryName: string;
  city: string;
  amount: number;
  txId?: string;
  description?: string;
}

export function generatePixBRCode({
  pixKey,
  beneficiaryName,
  city,
  amount,
  txId = '***'
}: PixPayloadParams): string {
  // Clean inputs
  const cleanKey = pixKey.trim();
  const cleanName = (beneficiaryName.trim() || 'Brazilian in Action').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25);
  const cleanCity = (city.trim() || 'SAO PAULO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15);
  const cleanTxId = (txId.trim() || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';
  const formattedAmount = amount > 0 ? amount.toFixed(2) : '0.00';

  // Format 26 Merchant Account Information
  const gui = formatTLV('00', 'br.gov.bcb.pix');
  const key = formatTLV('01', cleanKey);
  const merchantAccountInfo = formatTLV('26', `${gui}${key}`);

  // Format 00, 01, 52, 53, 54, 58, 59, 60, 62
  const payloadFormatIndicator = formatTLV('00', '01');
  const pointOfInitiation = formatTLV('01', '12'); // Dynamic or reusable
  const merchantCategoryCode = formatTLV('52', '0000');
  const transactionCurrency = formatTLV('53', '986'); // BRL
  const transactionAmount = formatTLV('54', formattedAmount);
  const countryCode = formatTLV('58', 'BR');
  const merchantName = formatTLV('59', cleanName);
  const merchantCity = formatTLV('60', cleanCity);
  
  // Format 62 Additional Data Field (TxID)
  const additionalDataField = formatTLV('62', formatTLV('05', cleanTxId));

  const payloadWithoutCRC = `${payloadFormatIndicator}${pointOfInitiation}${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${transactionAmount}${countryCode}${merchantName}${merchantCity}${additionalDataField}6304`;
  const checksum = crc16(payloadWithoutCRC);

  return `${payloadWithoutCRC}${checksum}`;
}
