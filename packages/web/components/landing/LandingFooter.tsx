import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const footerLinks = [
  { label: "Stores", href: "/store" },
  { label: "Venues", href: "/venues" },
  { label: "Splits", href: "/splits" },
];

export function LandingFooter() {
  return (
    <footer className="px-5 sm:px-8 pt-20 sm:pt-28 pb-28 border-t border-base-content/10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10"
        >
          <div>
            <h2 className="font-wide text-5xl sm:text-7xl lg:text-8xl font-extrabold uppercase tracking-[-0.03em] leading-[0.9] m-0">
              Ready
              <br />
              to <span className="text-primary">tap?</span>
            </h2>
            <p className="font-[family-name:var(--font-outfit)] mt-6 mb-0 max-w-md text-base-content/55 font-light leading-relaxed">
              Sign in with X, Google, or email, then pair your chip. No seed phrase to write down.
            </p>
          </div>

          <Link
            to="/register"
            className="self-start lg:self-auto font-[family-name:var(--font-archivo)] h-14 px-8 inline-flex items-center gap-3 rounded-full bg-primary text-primary-content font-bold text-base transition-[transform,background-color] duration-200 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Create account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        <div className="mt-20 pt-8 border-t border-base-content/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <span className="font-[family-name:var(--font-archivo)] text-xl font-black tracking-tight">
            Split<span className="text-primary">Hub</span>
          </span>

          <nav aria-label="Products" className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className="font-[family-name:var(--font-outfit)] text-sm text-base-content/55 hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary rounded"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="m-0 font-jetbrains text-[11px] uppercase tracking-[0.14em] text-base-content/35">
            Base · Privy · Arx
          </p>
        </div>
      </div>
    </footer>
  );
}
