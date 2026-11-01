
const CLOUDINARY_CLOUD_NAME = "uxofrccq";
const CLOUDINARY_UPLOAD_PRESET = "vehicle_registration_demo";

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
};

export async function uploadDocumentToCloudinary(
  file: {
    name: string;
    uri: string;
    size: number;
  },
  applicationId: string
): Promise<CloudinaryUploadResult> {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  const mimeType =
    extension === "pdf"
      ? "application/pdf"
      : extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
      ? "image/jpeg"
      : "";

  if (!mimeType) {
    throw new Error(
      `Unsupported document format: ${file.name}`
    );
  }

  // 10 MB limit for this school-project test.
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(
      `${file.name} exceeds the 10 MB limit.`
    );
  }

  const body = new FormData();

  body.append("file", {
    uri: file.uri,
    name: file.name,
    type: mimeType,
  } as any);

  body.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );

  body.append(
    "folder",
    `vehicle-registration/${applicationId}`
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error(
      "Cloudinary upload failed:",
      result
    );

    throw new Error(
      result?.error?.message ||
        `Upload failed for ${file.name}`
    );
  }

  if (!result.secure_url || !result.public_id) {
    throw new Error(
      `Cloudinary did not return a valid file reference for ${file.name}.`
    );
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format || extension || "",
  };
}
