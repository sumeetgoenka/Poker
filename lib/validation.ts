import { VALIDATION, ERROR_MESSAGES } from './constants';

/**
 * Validates and sanitizes a nickname
 */
export function validateNickname(nickname: string): { isValid: boolean; error?: string } {
  const trimmed = nickname.trim();

  if (trimmed.length < VALIDATION.NICKNAME_MIN_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_NICKNAME };
  }

  if (trimmed.length > VALIDATION.NICKNAME_MAX_LENGTH) {
    return { isValid: false, error: `Nickname must be ${VALIDATION.NICKNAME_MAX_LENGTH} characters or less.` };
  }

  // Check for invalid characters (only allow alphanumeric, spaces, and basic punctuation)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return { isValid: false, error: 'Nickname contains invalid characters.' };
  }

  return { isValid: true };
}

/**
 * Sanitizes a nickname by trimming and removing extra spaces
 */
export function sanitizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/g, ' ');
}

/**
 * Validates table creation parameters
 */
export function validateTableParams(params: {
  smallBlind: number;
  bigBlind: number;
  defaultStack: number;
  maxPlayers: number;
}): { isValid: boolean; error?: string } {
  if (params.smallBlind <= 0 || params.bigBlind <= 0) {
    return { isValid: false, error: 'Blinds must be positive numbers.' };
  }

  if (params.bigBlind <= params.smallBlind) {
    return { isValid: false, error: 'Big blind must be greater than small blind.' };
  }

  if (params.defaultStack < params.bigBlind * 10) {
    return { isValid: false, error: 'Starting stack must be at least 10 times the big blind.' };
  }

  if (params.maxPlayers < 2 || params.maxPlayers > 9) {
    return { isValid: false, error: 'Max players must be between 2 and 9.' };
  }

  return { isValid: true };
}

/**
 * Validates a player action amount
 */
export function validateActionAmount(
  action: string,
  amount: number,
  playerStack: number,
  currentBet: number
): { isValid: boolean; error?: string } {
  if (action === 'bet' || action === 'raise') {
    if (amount <= 0) {
      return { isValid: false, error: 'Bet amount must be positive.' };
    }

    if (amount > playerStack) {
      return { isValid: false, error: 'Insufficient chips.' };
    }

    if (action === 'raise' && amount <= currentBet) {
      return { isValid: false, error: 'Raise must be greater than current bet.' };
    }
  }

  return { isValid: true };
}
