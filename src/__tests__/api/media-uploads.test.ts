// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FakeSupabase } from "@/test-utils/fake-supabase";
import { mockApiCall } from "@/test-utils/api";
import { resetRateLimits } from "@/lib/security/rate-limit";
import { buildMediaStoragePath, isIssuedMediaPath, MEDIA_BUCKET } from "@/services/media/uploads";

const db = vi.hoisted(() => ({ current: null as unknown as FakeSupabase }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => db.current.client,
  createSupabaseAuthClient: () => db.current.authClient,
}));

import uploadUrlHandler from "@/pages/api/v1/media/upload-url";
import mediaHandler from "@/pages/api/v1/media/index";
import mediaItemHandler from "@/pages/api/v1/media/[id]";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const NOT_AN_IMAGE = new TextEncoder().encode("MZ this is not an image at all");

function seedStaff(role: "content_manager" | "guest") {
  const id =
    role === "guest"
      ? "44444444-4444-4444-4444-444444444401"
      : "22222222-2222-2222-2222-222222222201";
  db.current.authUsers.push({
    id,
    email: `${role}@example.com`,
    password: "Password123!",
    user_metadata: {},
    email_confirmed_at: new Date().toISOString(),
  });
  db.current.seed("users", [
    {
      id,
      email: `${role}@example.com`,
      full_name: role,
      role,
      is_email_verified: true,
      is_locked: false,
    },
  ]);
  return db.current.issueSession(id).access_token;
}

async function call(handler: any, method: string, body: unknown, token: string) {
  const c = mockApiCall({ method, body, headers: { authorization: `Bearer ${token}` } });
  await handler(c.req, c.res);
  return c;
}

describe("media direct uploads", () => {
  let staff: string;
  let guest: string;

  beforeEach(() => {
    resetRateLimits();
    db.current = new FakeSupabase();
    staff = seedStaff("content_manager");
    guest = seedStaff("guest");
    vi.stubGlobal("fetch", db.current.storageFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("storage paths", () => {
    it("issues category-scoped paths with a sanitised name", () => {
      const path = buildMediaStoragePath("room", "../../etc/pass wd?.png");
      expect(path).toMatch(/^room\/\d{13}-[0-9a-f]{12}-[A-Za-z0-9._-]+$/);
      expect(path).not.toContain("..");
      expect(isIssuedMediaPath(path, "room")).toBe(true);
      expect(path.endsWith("-etc_pass_wd_.png")).toBe(true);
      expect(buildMediaStoragePath("gallery", "Sunset Pool.JPG").endsWith("-Sunset_Pool.JPG")).toBe(
        true
      );
      expect(buildMediaStoragePath("gallery", "my..photo.png").endsWith("-my.photo.png")).toBe(
        true
      );
      expect(isIssuedMediaPath(path, "gallery")).toBe(false);
      expect(isIssuedMediaPath("room/../secrets.png", "room")).toBe(false);
    });
  });

  describe("POST /api/v1/media/upload-url", () => {
    const request = (overrides: Record<string, unknown> = {}) => ({
      fileName: "pool.png",
      mimeType: "image/png",
      sizeBytes: 2_000_000,
      category: "facility",
      ...overrides,
    });

    it("returns a signed upload URL for staff", async () => {
      const res = await call(uploadUrlHandler, "POST", request(), staff);
      expect(res.status()).toBe(200);
      const data = res.body().data;
      expect(isIssuedMediaPath(data.path, "facility")).toBe(true);
      expect(data.signedUrl).toContain(`/object/upload/sign/${MEDIA_BUCKET}/${data.path}`);
      expect(data.maxBytes).toBe(10 * 1024 * 1024);
    });

    it("allows videos up to 50 MB but images only up to 10 MB", async () => {
      const video = await call(
        uploadUrlHandler,
        "POST",
        request({ mimeType: "video/mp4", sizeBytes: 50 * 1024 * 1024 }),
        staff
      );
      expect(video.status()).toBe(200);
      const bigVideo = await call(
        uploadUrlHandler,
        "POST",
        request({ mimeType: "video/mp4", sizeBytes: 50 * 1024 * 1024 + 1 }),
        staff
      );
      expect(bigVideo.body().error.code).toBe("FILE_TOO_LARGE");
      const bigImage = await call(
        uploadUrlHandler,
        "POST",
        request({ sizeBytes: 11 * 1024 * 1024 }),
        staff
      );
      expect(bigImage.body().error.code).toBe("FILE_TOO_LARGE");
    });

    it("rejects disallowed types (SVG) and non-staff", async () => {
      const svg = await call(
        uploadUrlHandler,
        "POST",
        request({ mimeType: "image/svg+xml" }),
        staff
      );
      expect(svg.status()).toBe(400);
      const forbidden = await call(uploadUrlHandler, "POST", request(), guest);
      expect(forbidden.status()).toBe(403);
    });
  });

  describe("POST /api/v1/media (register an upload)", () => {
    const register = (path: string, overrides: Record<string, unknown> = {}) => ({
      fileName: "pool.png",
      mimeType: "image/png",
      category: "facility",
      altText: "Olympic pool at sunset",
      storagePath: path,
      ...overrides,
    });

    it("registers a verified upload with its real size and public URL", async () => {
      const path = buildMediaStoragePath("facility", "pool.png");
      db.current.putStorageObject(MEDIA_BUCKET, path, PNG);

      const res = await call(mediaHandler, "POST", register(path, { sizeBytes: 999 }), staff);

      expect(res.status()).toBe(201);
      const asset = res.body().data;
      expect(asset.mime_type).toBe("image/png");
      expect(asset.size_bytes).toBe(PNG.length);
      expect(asset.url).toContain(`/object/public/${MEDIA_BUCKET}/${path}`);
    });

    it("rejects and deletes content that is not an allowed image or video", async () => {
      const path = buildMediaStoragePath("facility", "pool.png");
      db.current.putStorageObject(MEDIA_BUCKET, path, NOT_AN_IMAGE);

      const res = await call(mediaHandler, "POST", register(path), staff);

      expect(res.body().error.code).toBe("INVALID_FILE_CONTENT");
      expect(db.current.storageObjects.size).toBe(0);
      expect(db.current.rows("media_assets")).toHaveLength(0);
    });

    it("rejects and deletes a file whose bytes differ from the declared type", async () => {
      const path = buildMediaStoragePath("facility", "pool.jpg");
      db.current.putStorageObject(MEDIA_BUCKET, path, PNG);

      const res = await call(
        mediaHandler,
        "POST",
        register(path, { mimeType: "image/jpeg" }),
        staff
      );

      expect(res.body().error.code).toBe("MIME_TYPE_MISMATCH");
      expect(db.current.storageObjects.size).toBe(0);
    });

    it("rejects and deletes an image over 10 MB even if a smaller size was declared", async () => {
      const path = buildMediaStoragePath("facility", "huge.png");
      const huge = new Uint8Array(10 * 1024 * 1024 + 1);
      huge.set(PNG);
      db.current.putStorageObject(MEDIA_BUCKET, path, huge);

      const res = await call(mediaHandler, "POST", register(path), staff);

      expect(res.body().error.code).toBe("FILE_TOO_LARGE");
      expect(db.current.storageObjects.size).toBe(0);
    });

    it("rejects paths it did not issue for the category, missing uploads and duplicates", async () => {
      const elsewhere = buildMediaStoragePath("room", "pool.png");
      db.current.putStorageObject(MEDIA_BUCKET, elsewhere, PNG);
      const wrongCategory = await call(mediaHandler, "POST", register(elsewhere), staff);
      expect(wrongCategory.body().error.code).toBe("INVALID_STORAGE_PATH");

      const missing = await call(
        mediaHandler,
        "POST",
        register(buildMediaStoragePath("facility", "x.png")),
        staff
      );
      expect(missing.body().error.code).toBe("UPLOAD_NOT_FOUND");

      const path = buildMediaStoragePath("facility", "pool.png");
      db.current.putStorageObject(MEDIA_BUCKET, path, PNG);
      expect((await call(mediaHandler, "POST", register(path), staff)).status()).toBe(201);
      const again = await call(mediaHandler, "POST", register(path), staff);
      expect(again.status()).toBe(409);
    });

    it("deleting an uploaded asset also removes its stored file", async () => {
      const path = buildMediaStoragePath("facility", "pool.png");
      db.current.putStorageObject(MEDIA_BUCKET, path, PNG);
      const created = await call(mediaHandler, "POST", register(path), staff);
      const id = created.body().data.id;

      const del = mockApiCall({
        method: "DELETE",
        query: { id },
        headers: { authorization: `Bearer ${staff}` },
      });
      await mediaItemHandler(del.req, del.res);

      expect(del.status()).toBe(200);
      expect(db.current.rows("media_assets")).toHaveLength(0);
      expect(db.current.storageObjects.size).toBe(0);
    });

    it("requires exactly one of storagePath or url", async () => {
      const neither = await call(
        mediaHandler,
        "POST",
        register("", { storagePath: undefined }),
        staff
      );
      expect(neither.status()).toBe(400);
      const urlWithoutSize = await call(
        mediaHandler,
        "POST",
        register("", { storagePath: undefined, url: "https://cdn.example.com/pool.png" }),
        staff
      );
      expect(urlWithoutSize.status()).toBe(400);
    });
  });
});
