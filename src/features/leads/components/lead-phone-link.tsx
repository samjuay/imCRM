import { getTelLink, getWhatsAppLink } from "@/utils/phone";

type LeadPhoneLinkProps = {
  phone: string;
  className?: string;
};

export function LeadPhoneLink({ phone, className }: LeadPhoneLinkProps) {
  return (
    <a
      href={getTelLink(phone)}
      className={className ?? "text-sm font-medium text-primary hover:underline"}
    >
      {phone}
    </a>
  );
}

export function LeadWhatsAppButton({
  phone,
  className,
}: LeadPhoneLinkProps) {
  return (
    <a
      href={getWhatsAppLink(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      WhatsApp
    </a>
  );
}