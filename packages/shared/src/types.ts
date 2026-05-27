// File: packages/shared/src/types.ts
// Pure TypeScript types (no runtime). Mirror Prisma enums where applicable.

export type DrinkPreference = 'LIQUOR' | 'BEER';
export type DrinkChoice = 'LIQUOR' | 'BEER' | 'NONE';
export type MemberType = 'BD' | 'TL' | 'KU' | 'SWU' | 'CU' | 'KMITL' | 'FRIEND' | 'OTHER';
export type EventStatus = 'ACTIVE' | 'INACTIVE';
export type BillStatus = 'DRAFT' | 'SENT' | 'CLOSED';
export type BillItemType = 'LIQUOR' | 'BEER' | 'SHARED';
export type PaymentStatus = 'PENDING' | 'CLAIMED' | 'PAID';
export type PushDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';
export type AdminRole = 'ADMIN';
export type AuthRole = 'MEMBER' | AdminRole;

export interface MemberDto {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  customName: string;
  preferredDrink: DrinkPreference;
  memberType: MemberType;
  isRegistered: boolean;
}

export interface EventListItemDto {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  status: EventStatus;
  attendeeCount: number;
  hasSubmitted: boolean;
  hasBill: boolean;
}

export interface AttendeeDto {
  memberId: string;
  name: string;
  pictureUrl: string | null;
  drinkChoice: DrinkChoice;
  memberType: MemberType;
  isMe: boolean;
}

export interface EventStatsDto {
  total: number;
  liquor: { count: number; percent: number };
  beer: { count: number; percent: number };
  none: { count: number; percent: number };
}

export interface EventDetailDto {
  event: {
    id: string;
    name: string;
    venue: string;
    eventDate: string;
    status: EventStatus;
    isPast: boolean;
    hasBill: boolean;
    billClosed: boolean;
  };
  stats: EventStatsDto;
  attendees: AttendeeDto[];
  mySubmission: { id: string; nameSnapshot: string; drinkChoice: DrinkChoice; updatedAt: string } | null;
}

export interface MyBillDto {
  bill: { id: string; name: string; status: BillStatus; totalAmount: number };
  myShare: {
    amount: number;
    sharedAmount: number;
    drinkAmount: number;
    paymentStatus: PaymentStatus;
    paidAt: string | null;
    claimedAt: string | null;
    claimNote: string | null;
  };
  qrPayload: {
    type: 'PROMPTPAY' | 'CUSTOM_URL';
    value: string;
    amount: number;
    customUrl: string | null;
  };
}

export interface AuthTokenDto {
  token: string;
  expiresAt: string;
}

export interface LineAuthResponse extends AuthTokenDto {
  member: MemberDto;
}

export interface AdminAuthResponse extends AuthTokenDto {
  admin: { id: string; email: string; name: string };
}

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  fields?: Record<string, string>;
}
