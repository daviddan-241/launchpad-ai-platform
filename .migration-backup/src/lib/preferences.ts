import { readStore, updateStore, type UserPreference } from "@/lib/store";

const defaultPreference = (userId: string): UserPreference => ({
  userId,
  currency: "USD",
  starterPrice: 120,
  businessPrice: 350,
  premiumPrice: 900,
  paymentInstructions: "When a client agrees, ask me which payment method to use for that person or business before sharing checkout details.",
  waitIfInactive: true,
  autoPreparePaymentAfterMinutes: 30,
  autoPreparePaymentEnabled: true,
});

export async function getUserPreference(userId: string) {
  const store = await readStore();
  return store.userPreferences.find((item) => item.userId === userId) ?? defaultPreference(userId);
}

export async function saveUserPreference(input: UserPreference) {
  await updateStore((store) => {
    const existing = store.userPreferences.find((item) => item.userId === input.userId);
    if (existing) {
      existing.currency = input.currency;
      existing.starterPrice = input.starterPrice;
      existing.businessPrice = input.businessPrice;
      existing.premiumPrice = input.premiumPrice;
      existing.paymentInstructions = input.paymentInstructions;
      existing.waitIfInactive = input.waitIfInactive;
      existing.autoPreparePaymentAfterMinutes = input.autoPreparePaymentAfterMinutes;
      existing.autoPreparePaymentEnabled = input.autoPreparePaymentEnabled;
      return store;
    }

    store.userPreferences.push(input);
    return store;
  });

  return input;
}
