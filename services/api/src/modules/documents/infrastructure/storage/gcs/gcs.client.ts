import { Storage } from "@google-cloud/storage";
import type { Env } from "@corely/config";

export const createGcsClient = (config?: { projectId?: string; keyFilename?: string }) => {
  const projectId = config?.projectId;
  const keyFilename = config?.keyFilename;
  return new Storage({
    projectId,
    ...(keyFilename ? { keyFilename } : {}),
  });
};

export type GcsClient = Storage;
