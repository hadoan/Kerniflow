export type ContactPointType = "EMAIL" | "PHONE";

export type ContactPoint = {
  id: string;
  type: ContactPointType;
  value: string;
  isPrimary: boolean;
};
