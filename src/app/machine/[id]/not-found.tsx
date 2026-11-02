import Link from 'next/link';
import { QrCode } from 'lucide-react';

export default function MachineNotFound() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#dadada]/70 p-8 w-full max-w-md text-center">
        <QrCode size={40} className="text-[#dadada] mx-auto mb-4" />
        <h1 className="text-[#282828] font-bold text-xl mb-2">Machine not found</h1>
        <p className="text-[#6b6969] text-sm mb-6">
          We could not find a machine with this serial number. Check the number and try again, or choose your machine from the catalogue.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/scan" className="flex-1 py-3 bg-[#282828] text-white font-bold rounded-xl hover:bg-[#444] transition-colors text-sm">
            Scan again
          </Link>
          <Link href="/" className="flex-1 py-3 border border-[#dadada] text-[#6b6969] font-medium rounded-xl hover:bg-[#f9f9f9] transition-colors text-sm">
            Machine catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}
