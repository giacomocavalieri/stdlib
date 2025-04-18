import { Ok, Error, List, NonEmpty, BitArray } from "./gleam.mjs";
import { default as Dict } from "./dict.mjs";
import { Some, None } from "./gleam/option.mjs";
import { classify } from "./gleam/dynamic.mjs";
import { DecodeError } from "./gleam/dynamic/decode.mjs";

export function index(data, key) {
  // Dictionaries and dictionary-like objects can be indexed
  if (data instanceof Dict || data instanceof WeakMap || data instanceof Map) {
    const token = {};
    const entry = data.get(key, token);
    if (entry === token) return new Ok(new None());
    return new Ok(new Some(entry));
  }

  const key_is_int = Number.isInteger(key);

  // Only elements 0-7 of lists can be indexed, negative indices are not allowed
  if (key_is_int && key >= 0 && key < 8 && data instanceof List) {
    let i = 0;
    for (const value of data) {
      if (i === key) return new Ok(new Some(value));
      i++;
    }
    return new Error("Indexable");
  }

  // Arrays and objects can be indexed
  if (
    (key_is_int && Array.isArray(data)) ||
    (data && typeof data === "object") ||
    (data && Object.getPrototypeOf(data) === Object.prototype)
  ) {
    if (key in data) return new Ok(new Some(data[key]));
    return new Ok(new None());
  }

  return new Error(key_is_int ? "Indexable" : "Dict");
}

export function list(data, decode, pushPath, index, emptyList) {
  if (!(data instanceof List || Array.isArray(data))) {
    const error = new DecodeError("List", classify(data), emptyList);
    return [emptyList, List.fromArray([error])];
  }

  const decoded = [];

  for (const element of data) {
    const layer = decode(element);
    const [out, errors] = layer;

    if (errors instanceof NonEmpty) {
      const [_, errors] = pushPath(layer, index.toString());
      return [emptyList, errors];
    }
    decoded.push(out);
    index++;
  }

  return [List.fromArray(decoded), emptyList];
}

export function dict(data) {
  if (data instanceof Dict) {
    return new Ok(data);
  }
  if (data instanceof Map || data instanceof WeakMap) {
    return new Ok(Dict.fromMap(data));
  }
  if (data == null) {
    return new Error("Dict");
  }
  if (typeof data !== "object") {
    return new Error("Dict");
  }
  const proto = Object.getPrototypeOf(data);
  if (proto === Object.prototype || proto === null) {
    return new Ok(Dict.fromObject(data));
  }
  return new Error("Dict");
}

export function bit_array(data) {
  if (data instanceof BitArray) return new Ok(data);
  if (data instanceof Uint8Array) return new Ok(new BitArray(data));
  return new Error(new BitArray(new Uint8Array()));
}

export function float(data) {
  if (typeof data === "number") return new Ok(data);
  return new Error(0.0);
}

export function int(data) {
  if (Number.isInteger(data)) return new Ok(data);
  return new Error(0);
}

export function string(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error("");
}

export function is_null(data) {
  return data === null || data === undefined;
}
