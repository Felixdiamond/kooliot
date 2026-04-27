import { createHash } from "node:crypto";

import type { ParsedToken, TokenType } from "@/lib/types";

const TOKEN_TYPE_TO_MODE: Record<TokenType, "SET_TIME" | "ADD_TIME"> = {
  SET_TIME: "SET_TIME",
  ADD_TIME: "ADD_TIME",
  DISABLE: "SET_TIME",
};

const MAX_BASE = 999;
const MAX_ACTIVATION_VALUE = 995;
const PAYG_DISABLE_VALUE = 998;
const COUNTER_SYNC_VALUE = 999;
const TOKEN_VALUE_OFFSET = 1000;
const MAX_TOKEN_JUMP = 64;
const MAX_TOKEN_JUMP_COUNTER_SYNC = 100;

function toUint64(value: bigint): bigint {
  return BigInt.asUintN(64, value);
}

function rotateLeft(value: bigint, shift: bigint): bigint {
  const s = shift % 64n;
  return toUint64((value << s) | (value >> (64n - s)));
}

function readUint64LE(buffer: Buffer, offset: number): bigint {
  let result = 0n;

  for (let i = 0; i < 8; i += 1) {
    result |= BigInt(buffer[offset + i] ?? 0) << BigInt(i * 8);
  }

  return toUint64(result);
}

function readUint32BE(buffer: Buffer, offset: number): number {
  return (
    ((buffer[offset] ?? 0) << 24) |
    ((buffer[offset + 1] ?? 0) << 16) |
    ((buffer[offset + 2] ?? 0) << 8) |
    (buffer[offset + 3] ?? 0)
  ) >>> 0;
}

function writeUint64LE(value: bigint): Buffer {
  const out = Buffer.alloc(8);
  let current = toUint64(value);

  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(current & 0xffn);
    current >>= 8n;
  }

  return out;
}

function sipRound(state: [bigint, bigint, bigint, bigint]): void {
  state[0] = toUint64(state[0] + state[1]);
  state[1] = rotateLeft(state[1], 13n);
  state[1] ^= state[0];
  state[0] = rotateLeft(state[0], 32n);

  state[2] = toUint64(state[2] + state[3]);
  state[3] = rotateLeft(state[3], 16n);
  state[3] ^= state[2];

  state[0] = toUint64(state[0] + state[3]);
  state[3] = rotateLeft(state[3], 21n);
  state[3] ^= state[0];

  state[2] = toUint64(state[2] + state[1]);
  state[1] = rotateLeft(state[1], 17n);
  state[1] ^= state[2];
  state[2] = rotateLeft(state[2], 32n);
}

function deriveSipHashKey(secretKey: string): Buffer {
  if (!/^[0-9a-fA-F]{32}([0-9a-fA-F]{32})?$/.test(secretKey)) {
    throw new Error("Invalid secret key format");
  }

  // OpenPAYGO uses a 16-byte key. Device secrets vary by board model, so we deterministically
  // derive the 16-byte working key by hashing the provided hex bytes.
  return createHash("sha256")
    .update(Buffer.from(secretKey, "hex"))
    .digest()
    .subarray(0, 16);
}

function deriveStartingCode(secretKey: string): number {
  const digest = createHash("sha256").update(Buffer.from(secretKey, "hex")).digest();
  const seed = readUint32BE(digest, 0);
  return (seed % 999_999_999) + 1;
}

function parseStartingCode(startingCode: string | number | null | undefined): number | null {
  if (startingCode === null || startingCode === undefined) {
    return null;
  }

  const asNumber =
    typeof startingCode === "number"
      ? startingCode
      : Number(String(startingCode).replace(/[^0-9]/g, ""));

  if (!Number.isInteger(asNumber) || asNumber <= 0 || asNumber > 999_999_999) {
    return null;
  }

  return asNumber;
}

function resolveStartingCode(
  secretKey: string,
  startingCodeOverride?: string | number | null
): number {
  return parseStartingCode(startingCodeOverride) ?? deriveStartingCode(secretKey);
}

function getTokenBase(code: number): number {
  return code % TOKEN_VALUE_OFFSET;
}

function putBaseInToken(token: number, tokenBase: number): number {
  if (tokenBase > MAX_BASE) {
    throw new Error("INVALID_VALUE");
  }
  return token - getTokenBase(token) + tokenBase;
}

function convertTo29_5Bits(source: number): number {
  const mask = (((1 << 31) - 1) << 2) >>> 0;
  let temp = (source & mask) >>> 2;
  if (temp > 999_999_999) {
    temp -= 73_741_825;
  }
  return temp;
}

function convertHashToToken(hash: bigint): number {
  const hashBytes = Buffer.alloc(8);
  hashBytes.writeBigUInt64BE(toUint64(hash), 0);
  const hi = readUint32BE(hashBytes, 0);
  const lo = readUint32BE(hashBytes, 4);
  return convertTo29_5Bits((hi ^ lo) >>> 0);
}

function generateNextToken(lastCode: number, key: Buffer): number {
  const conformedToken = Buffer.alloc(8);
  conformedToken.writeUInt32BE(lastCode >>> 0, 0);
  conformedToken.writeUInt32BE(lastCode >>> 0, 4);
  const tokenHash = readUint64LE(siphash24(key, conformedToken), 0);
  return convertHashToToken(tokenHash);
}

function encodeBase(base: number, value: number): number {
  const encodedValue = base + value;
  if (encodedValue >= TOKEN_VALUE_OFFSET) {
    return encodedValue - TOKEN_VALUE_OFFSET;
  }
  return encodedValue;
}

function decodeBase(startingCodeBase: number, tokenBase: number): number {
  const decodedValue = tokenBase - startingCodeBase;
  if (decodedValue < 0) {
    return decodedValue + TOKEN_VALUE_OFFSET;
  }
  return decodedValue;
}

function countIsValid(count: number, lastCount: number, value: number, tokenType: TokenType): boolean {
  if (value === COUNTER_SYNC_VALUE) {
    return count > lastCount - 30;
  }

  if (count > lastCount) {
    return true;
  }

  // Without device-used-count context, only accept older ADD_TIME matches if count is not too old.
  if (tokenType === "ADD_TIME") {
    return count > lastCount - 16;
  }

  return false;
}

function determineTypeFromCount(count: number): TokenType {
  return count % 2 ? "SET_TIME" : "ADD_TIME";
}

function normalizeValueForType(tokenType: TokenType, value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 1000) {
    throw new Error("Value must be an integer between 0 and 1000");
  }

  if (tokenType === "DISABLE") {
    return PAYG_DISABLE_VALUE;
  }

  if (value > MAX_ACTIVATION_VALUE) {
    throw new Error(`Activation value must be <= ${MAX_ACTIVATION_VALUE}`);
  }

  return value;
}

function parseCore(
  token: string,
  secretKey: string,
  lastCountHint = 0,
  startingCodeOverride?: string | number | null
): ParsedToken | null {
  if (!/^\d{9}$/.test(token)) {
    return null;
  }

  const tokenInt = Number(token);
  const key = deriveSipHashKey(secretKey);
  const startingCode = resolveStartingCode(secretKey, startingCodeOverride);

  const tokenBase = getTokenBase(tokenInt);
  let currentCode = putBaseInToken(startingCode, tokenBase);
  const startingCodeBase = getTokenBase(startingCode);
  const value = decodeBase(startingCodeBase, tokenBase);

  const maxCountTry =
    (value === COUNTER_SYNC_VALUE ? MAX_TOKEN_JUMP_COUNTER_SYNC : MAX_TOKEN_JUMP) +
    Math.max(0, lastCountHint) +
    1;

  for (let count = 0; count <= maxCountTry; count += 1) {
    const maskedToken = putBaseInToken(currentCode, tokenBase);
    const rawType = determineTypeFromCount(count);

    if (maskedToken === tokenInt) {
      const effectiveType = value === PAYG_DISABLE_VALUE ? "DISABLE" : rawType;
      if (countIsValid(count, lastCountHint, value, rawType)) {
        return {
          tokenType: effectiveType,
          value,
          count,
        };
      }
    }

    currentCode = generateNextToken(currentCode, key);
  }

  return null;
}

export function siphash24(key: Buffer, message: Buffer): Buffer {
  if (key.length !== 16) {
    throw new Error("SIPHASH key must be 16 bytes");
  }

  const k0 = readUint64LE(key, 0);
  const k1 = readUint64LE(key, 8);

  const state: [bigint, bigint, bigint, bigint] = [
    0x736f6d6570736575n ^ k0,
    0x646f72616e646f6dn ^ k1,
    0x6c7967656e657261n ^ k0,
    0x7465646279746573n ^ k1,
  ];

  const fullBlocks = Math.floor(message.length / 8);

  for (let i = 0; i < fullBlocks; i += 1) {
    const m = readUint64LE(message, i * 8);
    state[3] ^= m;
    sipRound(state);
    sipRound(state);
    state[0] ^= m;
  }

  let b = BigInt(message.length) << 56n;
  const remainingStart = fullBlocks * 8;

  for (let i = 0; i < message.length - remainingStart; i += 1) {
    b |= BigInt(message[remainingStart + i] ?? 0) << BigInt(i * 8);
  }

  state[3] ^= b;
  sipRound(state);
  sipRound(state);
  state[0] ^= b;

  state[2] ^= 0xffn;
  sipRound(state);
  sipRound(state);
  sipRound(state);
  sipRound(state);

  const digest = toUint64(state[0] ^ state[1] ^ state[2] ^ state[3]);
  return writeUint64LE(digest);
}

export function generateToken(
  secretKey: string,
  tokenType: TokenType,
  value: number,
  count: number,
  startingCodeOverride?: string | number | null
): string {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Count must be a non-negative integer");
  }

  const key = deriveSipHashKey(secretKey);
  const startingCode = resolveStartingCode(secretKey, startingCodeOverride);

  const normalizedValue = normalizeValueForType(tokenType, value);
  const mode = TOKEN_TYPE_TO_MODE[tokenType];

  const startingCodeBase = getTokenBase(startingCode);
  const tokenBase = encodeBase(startingCodeBase, normalizedValue);

  let currentToken = putBaseInToken(startingCode, tokenBase);
  const currentCountOdd = count % 2;

  let newCount: number;
  if (mode === "SET_TIME") {
    newCount = currentCountOdd ? count + 2 : count + 1;
  } else {
    newCount = currentCountOdd ? count + 1 : count + 2;
  }

  for (let i = 0; i < newCount; i += 1) {
    currentToken = generateNextToken(currentToken, key);
  }

  const finalToken = putBaseInToken(currentToken, tokenBase);
  const token = `${finalToken}`.padStart(9, "0");

  if (!/^\d{9,15}$/.test(token)) {
    throw new Error("Generated token is outside OpenPAYGO length constraints");
  }

  return token;
}

export function parseToken(
  token: string,
  secretKey: string,
  startingCodeOverride?: string | number | null
): ParsedToken | null {
  return parseCore(token, secretKey, 0, startingCodeOverride);
}

export function formatTokenParams(params: ParsedToken): string {
  return `Token Type: ${params.tokenType}, Value: ${params.value} days, Count: ${params.count}`;
}

export function verifyToken(
  token: string,
  secretKey: string,
  expectedType: TokenType,
  expectedValue: number,
  expectedCount: number,
  startingCodeOverride?: string | number | null
): boolean {
  const parsed = parseCore(token, secretKey, expectedCount - 2, startingCodeOverride);

  if (!parsed) {
    return false;
  }

  return (
    parsed.tokenType === expectedType &&
    parsed.value === expectedValue &&
    parsed.count === expectedCount
  );
}
