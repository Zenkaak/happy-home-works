const Footer = () => (
  <footer className="mt-6 border-t border-border bg-card px-4 py-4">
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground sm:flex-row">
      <span>© {new Date().getFullYear()} DASNET — Dasnet Ventures</span>
      <div className="flex items-center gap-4">
        <a
          href="https://wa.me/254112628799"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:underline"
        >
          WhatsApp Support
        </a>
        <span className="text-muted-foreground/50">•</span>
        <a href="tel:+254112628799" className="font-semibold hover:text-foreground">
          +254 112 628 799
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
