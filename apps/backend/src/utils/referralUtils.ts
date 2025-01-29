import { customAlphabet } from 'nanoid';

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const generateReferralCode = (): string => {
  const nanoid = customAlphabet(REFERRAL_CODE_ALPHABET, REFERRAL_CODE_LENGTH);
  return nanoid();
};
