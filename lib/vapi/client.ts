import Vapi from "@vapi-ai/web";

let vapi: Vapi | null = null;

export function getVapiClient(): Vapi {
  if (!vapi) {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set");
    }
    vapi = new Vapi(publicKey);
  }
  return vapi;
}
