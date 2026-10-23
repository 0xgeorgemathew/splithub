import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const products = [
  {
    name: "Stores",
    href: "/store",
    description:
      "Open a store, add your catalog and stock, and take payments with a tap. Buyers pay straight from their wallet; each sale is recorded with its manager and admin split.",
    details: ["Catalog & inventory", "Tap checkout", "Sales analytics"],
  },
  {
    name: "Venues",
    href: "/events",
    description:
      "Set up a venue or event, add stalls, and assign operators. Guests tap to pay at any stall and revenue splits between the venue and each operator.",
    details: ["Stalls & operators", "Revenue splits", "Live dashboard"],
  },
  {
    name: "Splits",
    href: "/splits",
    description:
      "Track shared expenses with friends, send payment requests, and settle what you owe with a tap, one person or the whole group at once.",
    details: ["Circles", "Payment requests", "Multi-settle"],
  },
];

export function ProductIndex() {
  return (
    <section id="features" className="px-5 sm:px-8 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 sm:mb-14"
        >
          <h2 className="font-wide text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-[-0.02em] leading-[0.95] m-0">
            One chip.
            <br />
            Three ways to use it.
          </h2>
          <p className="font-[family-name:var(--font-outfit)] m-0 max-w-sm text-base-content/55 font-light leading-relaxed">
            The same tap pays a store, a stall at a venue, or settles a dinner split with friends.
          </p>
        </motion.div>

        <ul className="m-0 p-0 list-none border-t border-base-content/10">
          {products.map((product, i) => (
            <motion.li
              key={product.href}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="border-b border-base-content/10"
            >
              <Link
                to={product.href}
                className="group relative grid grid-cols-1 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] gap-x-10 gap-y-3 py-8 sm:py-10 md:px-4 md:-mx-4 rounded-xl transition-colors duration-300 hover:bg-base-200/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                {/* Gold rule slides in on hover */}
                <span
                  aria-hidden
                  className="absolute left-0 top-8 bottom-8 w-[3px] rounded-full bg-primary origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-300 hidden md:block"
                />

                <h3 className="font-wide text-2xl sm:text-3xl font-extrabold uppercase tracking-[-0.01em] m-0 leading-none group-hover:text-primary transition-colors duration-300">
                  {product.name}
                </h3>

                <div>
                  <p className="font-[family-name:var(--font-outfit)] m-0 text-base-content/70 font-light leading-relaxed max-w-xl">
                    {product.description}
                  </p>
                  <ul className="m-0 mt-4 p-0 list-none flex flex-wrap gap-x-4 gap-y-1 font-jetbrains text-[11px] uppercase tracking-[0.14em] text-base-content/40">
                    {product.details.map(detail => (
                      <li key={detail} className="whitespace-nowrap">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>

                <span className="font-jetbrains text-xs text-base-content/45 group-hover:text-primary transition-colors duration-300 flex items-start gap-1.5 md:pt-1">
                  {product.href}
                  <ArrowUpRight className="w-4 h-4 -mt-px transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
