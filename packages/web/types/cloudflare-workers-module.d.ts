// Ambient declaration for the Workers runtime module (kept in a script file so it declares, not augments).
declare module "cloudflare:workers" {
  import { CloudflareWorkersModule } from "@cloudflare/workers-types";
  export = CloudflareWorkersModule;
}
