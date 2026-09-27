import { describe, expect, it } from "vitest";
import {
  PRODUCT_SECRET_PREFIX,
  generateProductSecret,
  requireActiveRows,
  validateProductId,
} from "./productLogic";
import { sha256Hex } from "./auditChain";

describe("validateProductId", () => {
  it("menerima slug valid apa adanya", () => {
    expect(validateProductId("abelink")).toBe("abelink");
  });

  it("menormalisasi spasi dan huruf besar", () => {
    expect(validateProductId("  Abelink-Web ")).toBe("abelink-web");
  });

  it("menolak nama terlalu pendek, diawali dash, atau berisi spasi", () => {
    expect(() => validateProductId("a")).toThrow();
    expect(() => validateProductId("-bad")).toThrow();
    expect(() => validateProductId("ada spasi")).toThrow();
    expect(() => validateProductId("")).toThrow();
  });

  it("menolak nama melebihi 32 karakter", () => {
    expect(() => validateProductId("a".repeat(33))).toThrow();
  });
});

describe("generateProductSecret", () => {
  it("berformat prefix + base64url 32 byte", async () => {
    const secret = await generateProductSecret();
    expect(secret.startsWith(PRODUCT_SECRET_PREFIX)).toBe(true);
    // 4 char prefix + 43 char base64url dari 32 byte
    expect(secret.length).toBe(47);
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("menghasilkan secret berbeda tiap pemanggilan", async () => {
    const a = await generateProductSecret();
    const b = await generateProductSecret();
    expect(a).not.toBe(b);
  });

  it("hash sha256 deterministik dan membedakan secret", async () => {
    const a = await generateProductSecret();
    const b = await generateProductSecret();
    expect(await sha256Hex(a)).toBe(await sha256Hex(a));
    expect(await sha256Hex(a)).not.toBe(await sha256Hex(b));
  });
});

describe("requireActiveRows", () => {
  const row = (over: Partial<Parameters<typeof requireActiveRows>[0][number]>) => ({
    _id: "x",
    productId: "abelink",
    type: "local" as const,
    status: "active" as const,
    allowlist: [],
    ...over,
  });

  it("mengembalikan hanya baris aktif", () => {
    const actives = requireActiveRows([row({ status: "archived" }), row({ _id: "y" })], "abelink");
    expect(actives.map((r) => r._id)).toEqual(["y"]);
  });

  it("melempar error jelas saat tidak ada baris aktif", () => {
    expect(() => requireActiveRows([row({ status: "archived" })], "abelink")).toThrow(/Tidak ada produk aktif/);
    expect(() => requireActiveRows([], "kosong")).toThrow(/Tidak ada produk aktif/);
  });

  it("melempar error dengan slug yang diminta", () => {
    expect(() => requireActiveRows([], "lain")).toThrow(/"lain"/);
  });
});
