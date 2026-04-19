const Footer = () => (
  <footer className="bg-card border-t border-border mt-4 py-3 px-4 flex items-center justify-between text-[11px] text-muted-foreground">
    <span>© {new Date().getFullYear()} DASNET</span>
    <a
      href="https://wa.me/254112628799"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-primary hover:underline"
    >
      WhatsApp Support
    </a>
  </footer>
);

export default Footer;
