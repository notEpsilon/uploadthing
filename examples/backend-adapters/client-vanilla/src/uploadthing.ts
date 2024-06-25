import {
  generateMimeTypes,
  generatePermittedFileTypes,
  genUploader,
} from "uploadthing/client";
import { EndpointMetadata } from "uploadthing/types";

import type { OurFileRouter } from "../../server/src/router";

const BASE_URL = "http://localhost:3003";

export const { uploadFiles, createUpload } = genUploader<OurFileRouter>({
  url: BASE_URL,
  package: "vanilla",
});

export const getInputProps = (endpoint: keyof OurFileRouter) =>
  fetch(new URL("/api/uploadthing", BASE_URL))
    .then((res) => res.json() as Promise<EndpointMetadata>)
    .then((json) => json.find(({ slug }) => slug === endpoint)?.config)
    .then((config) => {
      const { fileTypes, multiple } = generatePermittedFileTypes(config);
      const mimes = generateMimeTypes(fileTypes);
      return { accept: mimes.join(", "), multiple };
    });
