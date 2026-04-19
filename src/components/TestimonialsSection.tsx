import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Brian K.",
    location: "Nairobi",
    text: "Best data prices in Kenya. I save over KES 500 every month buying from DataVend.",
    rating: 5,
  },
  {
    name: "Mary W.",
    location: "Mombasa",
    text: "KPLC tokens delivered in seconds. No more queuing at the shop. Highly recommended!",
    rating: 5,
  },
  {
    name: "James O.",
    location: "Kisumu",
    text: "My Fuliza limit went from 3K to 25K after using their upgrade service. Legit vendor.",
    rating: 5,
  },
];

const TestimonialsSection = () => (
  <section className="px-4 py-6">
    <div className="flex items-center gap-2 mb-4">
      <Quote className="w-4 h-4 text-primary" />
      <h2 className="font-display text-sm font-bold text-foreground">What Customers Say</h2>
    </div>

    <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4">
      {testimonials.map((t) => (
        <div
          key={t.name}
          className="gradient-card rounded-2xl p-4 min-w-[260px] max-w-[280px] shrink-0"
        >
          <div className="flex items-center gap-0.5 mb-2">
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-warning text-warning" />
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">"{t.text}"</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              {t.name[0]}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground">{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.location}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default TestimonialsSection;
