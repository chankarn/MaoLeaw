// File: packages/shared/src/constants.ts
import type { MemberType, DrinkPreference, DrinkChoice } from './types';

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
  SHARED: 'หารทุกคน',
} as const;

export const MAX_CUSTOM_NAME_LENGTH = 50;
export const MAX_EVENT_NAME_LENGTH = 100;
export const MAX_VENUE_LENGTH = 200;
export const MAX_BILL_NAME_LENGTH = 100;
export const MAX_ITEM_NAME_LENGTH = 100;
