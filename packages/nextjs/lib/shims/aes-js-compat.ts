import { AES } from "../../../../node_modules/ethers-v6/node_modules/aes-js/lib.esm/aes.js";
import { CBC } from "../../../../node_modules/ethers-v6/node_modules/aes-js/lib.esm/mode-cbc.js";
import { CFB } from "../../../../node_modules/ethers-v6/node_modules/aes-js/lib.esm/mode-cfb.js";
import { CTR as ModernCTR } from "../../../../node_modules/ethers-v6/node_modules/aes-js/lib.esm/mode-ctr.js";
import { ECB } from "../../../../node_modules/ethers-v6/node_modules/aes-js/lib.esm/mode-ecb.js";
import { ModeOfOperation as ModernModeOfOperation } from "../../../../node_modules/ethers-v6/node_modules/aes-js/lib.esm/mode.js";
import { OFB } from "../../../../node_modules/ethers-v6/node_modules/aes-js/lib.esm/mode-ofb.js";
import {
  pkcs7Pad,
  pkcs7Strip,
} from "../../../../node_modules/ethers-v6/node_modules/aes-js/lib.esm/padding.js";

class Counter {
  private readonly counterBytes: Uint8Array;

  constructor(initialValue?: number | Uint8Array) {
    if (initialValue == null) {
      this.counterBytes = new Uint8Array(16);
      this.setValue(1);
      return;
    }

    if (typeof initialValue === "number") {
      this.counterBytes = new Uint8Array(16);
      this.setValue(initialValue);
      return;
    }

    if (initialValue.length !== 16) {
      throw new TypeError("invalid counter initial Uint8Array value length");
    }

    this.counterBytes = new Uint8Array(initialValue);
  }

  get bytes() {
    return new Uint8Array(this.counterBytes);
  }

  setValue(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
      throw new TypeError("invalid counter value (must be an integer)");
    }

    this.counterBytes.fill(0);

    for (let index = 15; index >= 0; index -= 1) {
      this.counterBytes[index] = value % 256;
      value = Math.floor(value / 256);
    }
  }

  setBytes(value: Uint8Array) {
    if (value.length !== 16) {
      throw new TypeError("invalid counter bytes size (must be 16 bytes)");
    }

    this.counterBytes.set(value);
  }

  increment() {
    for (let index = 15; index >= 0; index -= 1) {
      if (this.counterBytes[index] === 255) {
        this.counterBytes[index] = 0;
        continue;
      }

      this.counterBytes[index] += 1;
      break;
    }
  }
}

class CTR extends ModernCTR {
  constructor(key: Uint8Array, initialValue?: number | Uint8Array | Counter) {
    super(key, initialValue instanceof Counter ? initialValue.bytes : initialValue);
  }
}

const ModeOfOperation = Object.assign(ModernModeOfOperation, {
  cbc: CBC,
  cfb: CFB,
  ctr: CTR,
  ecb: ECB,
  ofb: OFB,
});

const aesJs = {
  AES,
  CBC,
  CFB,
  CTR,
  Counter,
  ECB,
  ModeOfOperation,
  OFB,
  padding: {
    pkcs7: {
      pad: pkcs7Pad,
      strip: pkcs7Strip,
    },
  },
  pkcs7Pad,
  pkcs7Strip,
};

export { AES, CBC, CFB, CTR, ECB, ModeOfOperation, OFB, pkcs7Pad, pkcs7Strip };

export default aesJs;
