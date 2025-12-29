export const allocateUniqueNumber = async (params: {
  next: () => string;
  isTaken: (number: string) => Promise<boolean>;
  maxAttempts?: number;
}): Promise<string> => {
  const maxAttempts = params.maxAttempts ?? 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = params.next();
    const taken = await params.isTaken(candidate);
    if (!taken) {
      return candidate;
    }
  }
  throw new Error("Unable to allocate unique number");
};
