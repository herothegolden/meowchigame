export type TelegramUserRaw = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type AppUser = {
  tgId: string;
  isBot: boolean;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  isPremium: boolean;
  photoUrl: string | null;
};

export function parseUser(input: unknown): { user: AppUser } {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid Telegram user payload");
  }

  const u = input as TelegramUserRaw;

  if (typeof u.id !== "number" || !Number.isFinite(u.id)) {
    throw new Error("Telegram user id missing or invalid");
  }

  const user: AppUser = {
    tgId: String(u.id),
    isBot: Boolean(u.is_bot),
    firstName: u.first_name ?? null,
    lastName: u.last_name ?? null,
    username: u.username ?? null,
    languageCode: u.language_code ?? null,
    isPremium: Boolean(u.is_premium),
    photoUrl: u.photo_url ?? null
  };

  return { user };
}
