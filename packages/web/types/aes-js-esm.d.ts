declare module "aes-js/lib.esm/index.js" {
  export const AES: any;
  export const ModeOfOperation: any;
  export const CBC: any;
  export const CFB: any;
  export const CTR: any;
  export const ECB: any;
  export const OFB: any;
  export const pkcs7Pad: any;
  export const pkcs7Strip: any;

  const aesJs: {
    AES: typeof AES;
    ModeOfOperation: typeof ModeOfOperation;
    CBC: typeof CBC;
    CFB: typeof CFB;
    CTR: typeof CTR;
    ECB: typeof ECB;
    OFB: typeof OFB;
    pkcs7Pad: typeof pkcs7Pad;
    pkcs7Strip: typeof pkcs7Strip;
  };

  export default aesJs;
}
