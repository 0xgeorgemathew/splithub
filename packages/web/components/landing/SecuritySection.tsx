import { motion, useReducedMotion } from "framer-motion";

const specs = [
  { term: "Private key", detail: "Generated on the chip. It never leaves it." },
  { term: "Signs", detail: "Each payment, at the moment you tap." },
  { term: "Holds funds", detail: "No. The chip authorizes; your wallet pays." },
  { term: "Sign-in", detail: "X, Google, or email through Privy. Your wallet is created for you." },
  { term: "Hardware", detail: "Arx HaLo NFC chip, registered onchain to your account." },
];

function ChipIllustration() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto" aria-hidden>
      {/* Field rings */}
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-primary/30"
          initial={{ scale: 0.55, opacity: 0 }}
          animate={
            reduceMotion ? { scale: 0.75 + i * 0.12, opacity: 0.35 } : { scale: [0.55, 1.05], opacity: [0.6, 0] }
          }
          transition={reduceMotion ? undefined : { duration: 3, repeat: Infinity, delay: i, ease: "easeOut" }}
        />
      ))}

      {/* Tag body */}
      <div className="absolute inset-[22%] rounded-full bg-gradient-to-br from-[#3a3936] to-[#1f1e1c] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_60px_-20px_rgba(0,0,0,0.9)] flex items-center justify-center">
        {/* Antenna coil */}
        <div className="absolute inset-[10%] rounded-full border border-primary/25" />
        <div className="absolute inset-[18%] rounded-full border border-primary/20" />
        <div className="absolute inset-[26%] rounded-full border border-primary/15" />
        {/* Secure element */}
        <div className="relative w-8 h-8 rounded-[6px] bg-gradient-to-br from-[#f7c548] to-[#c98a00] shadow-[0_0_24px_rgba(242,169,0,0.35)]">
          <div className="absolute inset-[5px] rounded-[3px] border border-black/25" />
        </div>
      </div>
    </div>
  );
}

export function SecuritySection() {
  return (
    <section className="px-5 sm:px-8 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="order-2 lg:order-1"
        >
          <ChipIllustration />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="order-1 lg:order-2"
        >
          <h2 className="font-wide text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-[-0.02em] leading-[0.95] m-0">
            The chip signs.
            <br />
            <span className="text-base-content/45">It doesn&apos;t hold your money.</span>
          </h2>

          <dl className="mt-10 mb-0 border-t border-base-content/10">
            {specs.map(spec => (
              <div
                key={spec.term}
                className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-x-6 gap-y-1 py-4 border-b border-base-content/10"
              >
                <dt className="font-jetbrains text-[11px] uppercase tracking-[0.16em] text-base-content/45 sm:pt-[3px]">
                  {spec.term}
                </dt>
                <dd className="m-0 font-[family-name:var(--font-outfit)] text-base-content/80 leading-relaxed">
                  {spec.detail}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  );
}
