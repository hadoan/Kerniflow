import { Storage } from "@google-cloud/storage";

export const createGcsClient = () => {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return new Storage({
    projectId,
    ...(keyFilename ? { keyFilename } : {}),
  });
};

export type GcsClient = Storage;
