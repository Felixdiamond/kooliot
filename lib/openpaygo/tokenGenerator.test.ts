import { describe, expect, test } from "bun:test";

import { generateToken, parseToken, siphash24, verifyToken } from "@/lib/openpaygo/tokenGenerator";

function messageOfLength(length: number): Buffer {
  const bytes = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = i;
  }
  return bytes;
}

describe("siphash24 vectors", () => {
  const key = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");

  // Official SipHash-2-4 test vectors for message lengths 0..4.
  const vectors = [
    { length: 0, expectedHexBE: "726fdb47dd0e0e31" },
    { length: 1, expectedHexBE: "74f839c593dc67fd" },
    { length: 2, expectedHexBE: "0d6c8009d9a94f5a" },
    { length: 3, expectedHexBE: "85676696d7fb7e2d" },
    { length: 4, expectedHexBE: "cf2794e0277187b7" },
  ];

  for (const vector of vectors) {
    test(`matches vector length ${vector.length}`, () => {
      const digestLE = siphash24(key, messageOfLength(vector.length));
      const expectedLE = Buffer.from(vector.expectedHexBE, "hex").reverse();
      expect(digestLE.equals(expectedLE)).toBe(true);
    });
  }
});

describe("OpenPAYGO token flow", () => {
  const secretKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  test("generate -> parse round-trip", () => {
    const token = generateToken(secretKey, "SET_TIME", 30, 10);
    const parsed = parseToken(token, secretKey);

    expect(parsed).not.toBeNull();
    expect(parsed?.tokenType).toBe("SET_TIME");
    expect(parsed?.value).toBe(30);
    expect(parsed?.count).toBeGreaterThanOrEqual(10);
  });

  test("verifyToken validates generated token", () => {
    const token = generateToken(secretKey, "ADD_TIME", 5, 20);
    const parsed = parseToken(token, secretKey);
    expect(parsed).not.toBeNull();

    const ok = verifyToken(
      token,
      secretKey,
      parsed!.tokenType,
      parsed!.value,
      parsed!.count
    );
    expect(ok).toBe(true);
  });
});
