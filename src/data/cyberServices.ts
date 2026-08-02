export interface CyberService {
  name: string;
  price: string;
}

export interface CyberServiceGroup {
  id: string;
  title: string;
  emoji: string;
  services: CyberService[];
}

export const CYBER_WHATSAPP = "254756816951";

export const cyberServiceGroups: CyberServiceGroup[] = [
  {
    id: "legal",
    title: "National & Legal Documentation",
    emoji: "🌐",
    services: [
      { name: "Good Conduct Certificate", price: "Ksh 1,350" },
      { name: "EACC Clearance", price: "Ksh 1,000" },
      { name: "Passport Application", price: "Ksh 4,500" },
      { name: "Visa Application (Germany, Ireland, Dubai, etc.)", price: "Ksh 5,000" },
      { name: "Green Card & Chancenkarte", price: "Ksh 5,500" },
      { name: "Birth Certificate (New)", price: "Ksh 450" },
      { name: "Name Change (Birth/ID)", price: "Ksh 300–400" },
      { name: "Marriage Registration", price: "Ksh 3,000" },
      { name: "Death Certificate", price: "Ksh 1,500" },
      { name: "Police Abstract / P3 Form", price: "Ksh 500–600" },
      { name: "Business Registration / Profile Update", price: "Ksh 1,000" },
      { name: "Company PIN Registration", price: "Ksh 500" },
      { name: "Land Sale & Lease Agreements", price: "Ksh 2,000" },
      { name: "Legal Advice, Affidavits & Case Filing", price: "Ksh 5,000" },
      { name: "Public Service & IPOA Job Applications", price: "Ksh 500" },
    ],
  },
  {
    id: "tsc",
    title: "TSC & Education Services",
    emoji: "🎓",
    services: [
      { name: "TSC Number Application", price: "Ksh 1,500" },
      { name: "KUCCPS Placement (TVET, KMTC, University)", price: "Ksh 500" },
      { name: "Nursing Council / KASNEB Exam Booking", price: "Ksh 1,000" },
      { name: "Lost KCPE/KCSE Certificate Replacement (QMIS)", price: "Ksh 3,000" },
      { name: "TVET Number Application", price: "Ksh 1,000" },
    ],
  },
  {
    id: "academic",
    title: "Academic & Research",
    emoji: "📝",
    services: [
      { name: "CV & Cover Letter", price: "Ksh 450" },
      { name: "Job Application Letter", price: "Ksh 250" },
      { name: "Research Proposal", price: "Ksh 2,500" },
      { name: "Concept Note", price: "Ksh 200" },
      { name: "Assignment / Term Paper", price: "Ksh 3,000" },
      { name: "Report Writing", price: "Ksh 8,000" },
      { name: "Editing & Plagiarism Removal", price: "From Ksh 300" },
      { name: "Lesson Plans / Schemes of Work / Revision Materials", price: "Ksh 1,500" },
    ],
  },
  {
    id: "ntsa",
    title: "NTSA & Transport",
    emoji: "🚗",
    services: [
      { name: "New DL Application", price: "Ksh 1,250" },
      { name: "DL Renewal", price: "Ksh 850" },
      { name: "Provisional DL", price: "Ksh 700" },
      { name: "Vehicle Transfer", price: "Ksh 2,500" },
      { name: "Vehicle Inspection", price: "Ksh 1,500" },
      { name: "Duplicate Number Plate", price: "Ksh 3,000" },
      { name: "New Gen Number Plate", price: "Ksh 4,500" },
      { name: "Flight Booking", price: "Ksh 500" },
      { name: "Hotel Booking", price: "Ksh 300" },
      { name: "Bus Booking", price: "Ksh 200" },
      { name: "Vehicle Import Services", price: "Custom Pricing" },
    ],
  },
  {
    id: "kra",
    title: "KRA Services",
    emoji: "💰",
    services: [
      { name: "New PIN Registration", price: "Ksh 150" },
      { name: "PIN Recovery", price: "Ksh 100" },
      { name: "Nil Returns Filing", price: "Ksh 50" },
      { name: "Employment Returns", price: "Ksh 200" },
      { name: "Withholding Tax Returns", price: "Ksh 350" },
      { name: "Email Change / Reprint", price: "Ksh 100" },
      { name: "Tax Compliance Certificate", price: "Ksh 100" },
      { name: "Fine & Penalty Waiver", price: "Ksh 250" },
    ],
  },
  {
    id: "tech",
    title: "Tech & Digital",
    emoji: "📡",
    services: [
      { name: "Windows & Office Installation (Permanent)", price: "Ksh 1,500" },
      { name: "Verified MPESA / Airtel / Bank Statements", price: "Ksh 500" },
      { name: "CRB Status Check / Clearance", price: "Ksh 3,500" },
    ],
  },
  {
    id: "cards",
    title: "Cards & Printing",
    emoji: "🎉",
    services: [
      { name: "Harambee Cards", price: "Ksh 1,000" },
      { name: "Wedding Cards", price: "Ksh 1,500" },
      { name: "Birthday Cards", price: "Ksh 1,000" },
      { name: "Funeral (Send-Off) Cards", price: "Ksh 1,000" },
    ],
  },
];

export const buildCyberWhatsAppLink = (service: CyberService, group: string) => {
  const text = `Hello H-TECH CYBER, I need this service:\n\n• ${service.name}\nCategory: ${group}\nPrice: ${service.price}\n\nPlease assist me.`;
  return `https://wa.me/${CYBER_WHATSAPP}?text=${encodeURIComponent(text)}`;
};
