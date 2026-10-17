import { describe, it, expect } from "vitest";
import { buildIlikeOrFilter, idOrSlugFilter, quoteFilterValue } from "@/lib/supabase/filters";
import { sniffMimeType } from "@/lib/security/file-signature";
import { isInRefundQueue } from "@/services/payments/refund-queue";

describe("PostgREST filter builders", () => {
  it("quotes values so reserved characters stay literal", () => {
    expect(quoteFilterValue("a,b)")).toBe('"a,b)"');
    expect(quoteFilterValue('say "hi" \\ bye')).toBe('"say \\"hi\\" \\\\ bye"');
  });

  it("builds an ilike OR filter with the term quoted once per column", () => {
    expect(buildIlikeOrFilter(["name", "email"], "Doe, J")).toBe(
      'name.ilike."%Doe, J%",email.ilike."%Doe, J%"'
    );
  });

  it("matches GUIDs by id or slug, and anything else by slug only", () => {
    const guid = "33333333-3333-3333-3333-333333333301";
    expect(idOrSlugFilter(guid)).toBe(`id.eq."${guid}",slug.eq."${guid}"`);
    expect(idOrSlugFilter("pool,id.neq.x")).toBe('slug.eq."pool,id.neq.x"');
  });
});

describe("sniffMimeType", () => {
  const bytes = (...values: number[]) => Uint8Array.from(values);
  const withAscii = (prefix: number[], text: string) =>
    Uint8Array.from([...prefix, ...Array.from(text, (c) => c.charCodeAt(0))]);

  it("recognises allowed image and video signatures", () => {
    expect(sniffMimeType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMimeType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffMimeType(withAscii([], "RIFF\0\0\0\0WEBP"))).toBe("image/webp");
    expect(sniffMimeType(withAscii([0, 0, 0, 0x1c], "ftypavif"))).toBe("image/avif");
    expect(sniffMimeType(withAscii([0, 0, 0, 0x18], "ftypisom"))).toBe("video/mp4");
  });

  it("rejects content that only claims to be an image", () => {
    expect(sniffMimeType(withAscii([], "MZ this is not an image"))).toBeNull();
    expect(sniffMimeType(withAscii([], "<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffMimeType(bytes())).toBeNull();
  });
});

describe("isInRefundQueue", () => {
  it("includes manual pending refunds and every failed refund", () => {
    expect(isInRefundQueue({ status: "refund_pending", refund_method: "bank_transfer" })).toBe(
      true
    );
    expect(isInRefundQueue({ status: "refund_pending", refund_method: "cash" })).toBe(true);
    expect(isInRefundQueue({ status: "refund_failed", refund_method: "paystack" })).toBe(true);
  });

  it("excludes Paystack refunds in flight and settled payments", () => {
    expect(isInRefundQueue({ status: "refund_pending", refund_method: "paystack" })).toBe(false);
    expect(isInRefundQueue({ status: "refund_pending", refund_method: null })).toBe(false);
    expect(isInRefundQueue({ status: "refunded", refund_method: "cash" })).toBe(false);
    expect(isInRefundQueue({ status: "success" })).toBe(false);
  });
});
