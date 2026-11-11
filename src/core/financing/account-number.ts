/**
 * ULTRON Account Number & Check Digit System
 * 
 * Account Number Format: XXX-XX-XXXXXX-X (14 characters)
 * - XXX    : 3-digit Institute / Tenant Code (e.g. 101 for Apex Credit, 102 for Metro Micro)
 * - XX     : 2-digit Product Code (e.g. 10 for Personal Financing, 20 for Hire Purchase)
 * - XXXXXX : 6-digit Account Sequence Number (e.g. 000001)
 * - X      : 1-digit ULTRON Modulo-11 Check Digit (Algorithm ls05 from Core Banking)
 * 
 * Check Digit Algorithm (Microlink / Ultron ls05):
 * - Constant: c1 = 99 (ASCII for 'c' / Customer Loans 'CL')
 * - Weights : w3 = 3, w7 = 7, w13 = 13, w19 = 19
 * - b1, b2, b3 = 3-digit Institute Code
 * - n1..n6     = 6-digit Sequence Number
 * - SOP        = (c1 * 3) + (b1 * 7) + (b2 * 13) + (b3 * 3) + (n1 * 7) + (n2 * 13) + (n3 * 3) + (n4 * 7) + (n5 * 13) + (n6 * 19)
 * - remain     = SOP % 11
 * - checkDigit = 11 - remain
 * - if checkDigit == 11 -> 0
 * - if checkDigit == 10 -> 1
 */

export interface UltronAccountComponents {
  instituteCode: string;
  productCode: string;
  sequenceNo: string;
  checkDigit: number;
  formattedAccountNo: string;
}

/**
 * Mapping of known tenants to their dedicated 3-digit Institute Number
 */
export const TENANT_INSTITUTE_MAPPING: Record<string, string> = {
  // Tenant IDs & Tenant Codes
  'APEX_CREDIT': '101',
  '11111111-1111-1111-1111-111111111111': '101',
  'METRO_MICRO': '102',
  '22222222-2222-2222-2222-222222222222': '102',
  'MUTIARA_FIN': '103',
  'VENTURE_MICRO': '104',
};

/**
 * Product code constants
 */
export const PRODUCT_CODES = {
  PERSONAL_FINANCING: '10',
  HIRE_PURCHASE: '20',
  MICRO_FINANCING: '30',
  SME_BUSINESS: '40',
} as const;

/**
 * Resolve 3-digit institute code for a tenant.
 */
export function getTenantInstituteCode(tenantIdOrCode: string): string {
  if (TENANT_INSTITUTE_MAPPING[tenantIdOrCode]) {
    return TENANT_INSTITUTE_MAPPING[tenantIdOrCode];
  }
  // If numeric 3 digits provided directly
  if (/^\d{3}$/.test(tenantIdOrCode)) {
    return tenantIdOrCode;
  }
  // Deterministic fallback from string hash
  let hash = 0;
  for (let i = 0; i < tenantIdOrCode.length; i++) {
    hash = (hash * 31 + tenantIdOrCode.charCodeAt(i)) % 900;
  }
  return String(100 + Math.abs(hash)).padStart(3, '0');
}

/**
 * Compute the ULTRON check digit for given institute code and 6-digit sequence number.
 * Follows exact Core Banking BankingUtil / ls05 logic.
 */
export function calculateUltronCheckDigit(
  instituteCode: string | number,
  sequenceNo: string | number
): number {
  const instStr = String(instituteCode).replace(/\D/g, '').padStart(3, '0').slice(-3);
  const seqStr = String(sequenceNo).replace(/\D/g, '').padStart(6, '0').slice(-6);

  const b1 = parseInt(instStr[0], 10);
  const b2 = parseInt(instStr[1], 10);
  const b3 = parseInt(instStr[2], 10);

  const n1 = parseInt(seqStr[0], 10);
  const n2 = parseInt(seqStr[1], 10);
  const n3 = parseInt(seqStr[2], 10);
  const n4 = parseInt(seqStr[3], 10);
  const n5 = parseInt(seqStr[4], 10);
  const n6 = parseInt(seqStr[5], 10);

  const c1 = 99; // CL constant ('c')
  const w3 = 3;
  const w7 = 7;
  const w13 = 13;
  const w19 = 19;

  const sop =
    c1 * w3 +
    b1 * w7 +
    b2 * w13 +
    b3 * w3 +
    n1 * w7 +
    n2 * w13 +
    n3 * w3 +
    n4 * w7 +
    n5 * w13 +
    n6 * w19;

  const remain = sop % 11;
  let chkdgt = 11 - remain;

  if (chkdgt === 11) chkdgt = 0;
  if (chkdgt === 10) chkdgt = 1;

  return chkdgt;
}

/**
 * Generate a complete, formatted ULTRON account number: XXX-XX-XXXXXX-X
 */
export function generateUltronAccountNo(params: {
  instituteCode: string | number;
  productCode?: string | number;
  sequenceNo: string | number;
}): UltronAccountComponents {
  const instituteCode = String(params.instituteCode).replace(/\D/g, '').padStart(3, '0').slice(-3);
  const productCode = String(params.productCode ?? '10').replace(/\D/g, '').padStart(2, '0').slice(-2);
  const sequenceNo = String(params.sequenceNo).replace(/\D/g, '').padStart(6, '0').slice(-6);

  const checkDigit = calculateUltronCheckDigit(instituteCode, sequenceNo);
  const formattedAccountNo = `${instituteCode}-${productCode}-${sequenceNo}-${checkDigit}`;

  return {
    instituteCode,
    productCode,
    sequenceNo,
    checkDigit,
    formattedAccountNo,
  };
}

/**
 * Validate an account number according to the ULTRON format and check digit algorithm.
 */
export function validateUltronAccountNo(accountNo: string): {
  isValid: boolean;
  error?: string;
  parsed?: UltronAccountComponents;
} {
  const cleaned = (accountNo || '').trim();
  const match = cleaned.match(/^(\d{3})-(\d{2})-(\d{6})-(\d{1})$/);

  if (!match) {
    return {
      isValid: false,
      error: 'Account number must match the format XXX-XX-XXXXXX-X (all numbers)',
    };
  }

  const [, instituteCode, productCode, sequenceNo, checkDigitStr] = match;
  const actualCheckDigit = parseInt(checkDigitStr, 10);
  const expectedCheckDigit = calculateUltronCheckDigit(instituteCode, sequenceNo);

  if (actualCheckDigit !== expectedCheckDigit) {
    return {
      isValid: false,
      error: `Invalid ULTRON check digit: expected ${expectedCheckDigit}, but got ${actualCheckDigit}`,
    };
  }

  return {
    isValid: true,
    parsed: {
      instituteCode,
      productCode,
      sequenceNo,
      checkDigit: actualCheckDigit,
      formattedAccountNo: cleaned,
    },
  };
}
