export type AddressType = "BILLING";

export type Address = {
  id?: string;
  type?: AddressType;
  line1: string;
  line2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
};
