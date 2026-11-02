import { ExternalLink, Mail, Phone } from 'lucide-react';
import { GROSS_CONTACT } from '@/data/gross-contact';

export default function GrossContact() {
  return (
    <footer className="bg-[#282828] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-sm">
        <span className="font-bold text-lg tracking-tight">GROSS</span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[#c1c1c1]">
          <a href={GROSS_CONTACT.phoneHref} className="flex items-center gap-2 hover:text-white transition-colors">
            <Phone size={14} /> {GROSS_CONTACT.phone}
          </a>
          <a href={`mailto:${GROSS_CONTACT.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
            <Mail size={14} /> {GROSS_CONTACT.email}
          </a>
          <a href={GROSS_CONTACT.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
            <ExternalLink size={14} /> gross-zerkleinerer.de
          </a>
        </div>
      </div>
    </footer>
  );
}
