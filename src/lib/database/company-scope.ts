export class CompanyScopeError extends Error {
  constructor(message = "Company context is required") {
    super(message);
    this.name = "CompanyScopeError";
  }
}

export function requireCompanyId(companyId: string | null | undefined): string {
  if (!companyId) {
    throw new CompanyScopeError();
  }
  return companyId;
}