// File: packages/shared/src/constants.ts
import type { MemberType, DrinkPreference, DrinkChoice, BankCode } from './types';

export const MEMBER_TYPES: readonly { value: MemberType; label: string }[] = [
  { value: 'BD', label: 'เด็ก BD' },
  { value: 'TL', label: 'เด็ก TL' },
  { value: 'KU', label: 'เด็ก KU' },
  { value: 'SWU', label: 'เด็ก SWU' },
  { value: 'CU', label: 'เด็ก CU' },
  { value: 'KMITL', label: 'เด็ก KMITL' },
  { value: 'FRIEND', label: 'เพื่อนอีสเหล้า' },
  { value: 'OTHER', label: 'อื่นๆ' },
] as const;

export const DRINK_PREFERENCES: readonly { value: DrinkPreference; label: string; emoji: string }[] = [
  { value: 'LIQUOR', label: 'เหล้า', emoji: '🥃' },
  { value: 'BEER', label: 'เบียร์', emoji: '🍺' },
] as const;

export const DRINK_CHOICES: readonly { value: DrinkChoice; label: string; emoji: string }[] = [
  { value: 'LIQUOR', label: 'เหล้า', emoji: '🥃' },
  { value: 'BEER', label: 'เบียร์', emoji: '🍺' },
  { value: 'NONE', label: 'ไม่กิน', emoji: '💧' },
] as const;

export const BILL_ITEM_TYPE_LABELS = {
  LIQUOR: 'เหล้า',
  BEER: 'เบียร์',
  MIXER: 'มิกเซอร์',
  SHARED: 'หารทุกคน',
  CUSTOM: 'เลือกเอง',
} as const;

export const BANK_OPTIONS: readonly { value: BankCode; label: string; short: string; color: string }[] = [
  { value: 'BBL',   label: 'ธนาคารกรุงเทพ',              short: 'BBL',      color: '#1e3a8a' },
  { value: 'KBANK', label: 'ธนาคารกสิกรไทย',             short: 'KBank',    color: '#166534' },
  { value: 'KTB',   label: 'ธนาคารกรุงไทย',              short: 'KTB',      color: '#1d4ed8' },
  { value: 'SCB',   label: 'ธนาคารไทยพาณิชย์',           short: 'SCB',      color: '#6b21a8' },
  { value: 'BAY',   label: 'ธนาคารกรุงศรีอยุธยา',         short: 'Krungsri', color: '#c2410c' },
  { value: 'TTB',   label: 'ธนาคารทหารไทยธนชาต',          short: 'TTB',      color: '#0369a1' },
  { value: 'GSB',   label: 'ธนาคารออมสิน',               short: 'GSB',      color: '#15803d' },
  { value: 'BAAC',  label: 'ธนาคารเพื่อการเกษตรฯ (ธกส.)', short: 'BAAC',     color: '#166534' },
  { value: 'GHB',   label: 'ธนาคารอาคารสงเคราะห์',       short: 'GHB',      color: '#b45309' },
  { value: 'UOB',   label: 'ธนาคารยูโอบี',               short: 'UOB',      color: '#1e40af' },
  { value: 'CIMB',  label: 'ธนาคารซีไอเอ็มบีไทย',        short: 'CIMB',     color: '#991b1b' },
  { value: 'LHB',   label: 'ธนาคารแลนด์แอนด์เฮ้าส์',     short: 'LHB',      color: '#d97706' },
  { value: 'TISCO', label: 'ธนาคารทิสโก้',               short: 'TISCO',    color: '#b91c1c' },
  { value: 'KKP',   label: 'ธนาคารเกียรตินาคินภัทร',      short: 'KKP',      color: '#c2410c' },
] as const;

export const MAX_CUSTOM_NAME_LENGTH = 50;
export const MAX_EVENT_NAME_LENGTH = 100;
export const MAX_VENUE_LENGTH = 200;
export const MAX_BILL_NAME_LENGTH = 100;
export const MAX_ITEM_NAME_LENGTH = 100;
