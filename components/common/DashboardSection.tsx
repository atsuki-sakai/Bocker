import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
interface SectionContainerProps {
  children: React.ReactNode;
  title: string;
  backLink: string;
  backLinkTitle: string;
  infoBtn?: {
    text: string;
    link: string;
  };
}

export default function DashboardSection({
  children,
  title,
  backLink,
  backLinkTitle,
  infoBtn,
}: SectionContainerProps) {
  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center">
        <div className=" flex flex-col gap-2 py-4 z-10">
          <div className="flex justify-between items-center">
            <Link href={backLink} className="group">
              <span className="text-xs md:text-sm text-slate-600 flex items-center gap-2 hover:text-slate-800">
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>{backLinkTitle}</span>
              </span>
            </Link>
          </div>
          <h1 className="text-xl md:text-3xl font-bold">{title}</h1>
        </div>
        {infoBtn && (
          <Button asChild className="text-xs md:text-base">
            <Link href={infoBtn.link}>{infoBtn.text}</Link>
          </Button>
        )}
      </div>

      {children}
    </div>
  );
}
