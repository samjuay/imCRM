import React from 'react';

interface ImCrmLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export default function ImCrmLogo({ 
  className = '', 
  size = 'md', 
  showText = true,
  layout = 'vertical' 
}: ImCrmLogoProps) {
  const getDimensions = () => {
    switch (size) {
      case 'xs': return { width: '24px', height: '24px' };
      case 'sm': return { width: '36px', height: '36px' };
      case 'md': return { width: '48px', height: '48px' };
      case 'lg': return { width: '80px', height: '80px' };
      case 'xl': return { width: '130px', height: '130px' };
      default: return { width: '48px', height: '48px' };
    }
  };

  const { width, height } = getDimensions();

  // If layout is horizontal, we render the SVG showing only the icon, and next to it, we put beautiful HTML/CSS typography
  if (layout === 'horizontal') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Vector Icon */}
        <svg 
          viewBox="0 0 300 300" 
          style={{ width, height }}
          className="select-none filter drop-shadow-md shrink-0"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Buildings Skyline */}
          <path d="M110,210 L110,165 L135,135 L135,210 Z" fill="#D4AF37" />
          <path d="M142,210 L142,100 L167,75 L167,210 Z" fill="#E2E8F0" />
          <path d="M174,210 L174,40 L226,105 L226,210 Z" fill="#D4AF37" />
          <path d="M233,210 L233,120 L258,150 L258,210 Z" fill="#E2E8F0" />
          <path d="M265,210 L265,150 L283,165 L283,210 Z" fill="#D4AF37" />

          {/* Sloped Roof Overlay */}
          <path 
            d="M135,210 L200,160 L290,250" 
            stroke="#D4AF37" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Window in the roof */}
          <rect x="189" y="180" width="10" height="10" fill="#E2E8F0" />
          <rect x="201" y="180" width="10" height="10" fill="#E2E8F0" />
          <rect x="189" y="192" width="10" height="10" fill="#E2E8F0" />
          <rect x="201" y="192" width="10" height="10" fill="#E2E8F0" />

          {/* Lowercase gold "i" letters */}
          <circle cx="125" cy="202" r="11" fill="#D4AF37" />
          <rect x="114" y="222" width="22" height="66" rx="4" fill="#D4AF37" />

          {/* Large white uppercase "M" */}
          <path 
            d="M145,288 L145,222 L165,222 L188,257 L211,222 L231,222 L231,288 L211,288 L211,245 L188,279 L165,245 L165,288 Z" 
            fill="#E2E8F0" 
          />
        </svg>

        {showText && (
          <div className="flex flex-col text-left select-none">
            <h2 className="text-base font-display font-black tracking-tight text-white uppercase leading-none">
              <span className="text-premium-gold">IM</span>CRM
            </h2>
            <span className="text-[8px] text-premium-gold tracking-widest block uppercase font-bold leading-none mt-1">
              REAL ESTATE CRM
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <svg 
        viewBox="0 0 400 400" 
        style={{ width, height }}
        className="select-none filter drop-shadow-md"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Buildings Skyline */}
        <path d="M110,210 L110,165 L135,135 L135,210 Z" fill="#D4AF37" />
        <path d="M142,210 L142,100 L167,75 L167,210 Z" fill="#E2E8F0" />
        <path d="M174,210 L174,40 L226,105 L226,210 Z" fill="#D4AF37" />
        <path d="M233,210 L233,120 L258,150 L258,210 Z" fill="#E2E8F0" />
        <path d="M265,210 L265,150 L283,165 L283,210 Z" fill="#D4AF37" />

        {/* Sloped Roof Overlay */}
        <path 
          d="M135,210 L200,160 L290,250" 
          stroke="#D4AF37" 
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Window in the roof */}
        <rect x="189" y="180" width="10" height="10" fill="#E2E8F0" />
        <rect x="201" y="180" width="10" height="10" fill="#E2E8F0" />
        <rect x="189" y="192" width="10" height="10" fill="#E2E8F0" />
        <rect x="201" y="192" width="10" height="10" fill="#E2E8F0" />

        {/* Lowercase gold "i" letters */}
        <circle cx="125" cy="202" r="11" fill="#D4AF37" />
        <rect x="114" y="222" width="22" height="66" rx="4" fill="#D4AF37" />

        {/* Large white uppercase "M" */}
        <path 
          d="M145,288 L145,222 L165,222 L188,257 L211,222 L231,222 L231,288 L211,288 L211,245 L188,279 L165,245 L165,288 Z" 
          fill="#E2E8F0" 
        />

        {showText && (
          <>
            {/* Text "IMCRM" */}
            <text x="200" y="336" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="38" letterSpacing="4" textAnchor="middle">
              <tspan fill="#D4AF37">IM</tspan>
              <tspan fill="#E2E8F0">CRM</tspan>
            </text>

            {/* Separator Line with Circle */}
            <line x1="90" y1="348" x2="310" y2="348" stroke="#D4AF37" strokeWidth="2" />
            <circle cx="200" cy="348" r="4.5" fill="#D4AF37" />

            {/* Subtitle "REAL ESTATE CRM" */}
            <text x="200" y="372" fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="12.5" fill="#E2E8F0" letterSpacing="3.5" textAnchor="middle">
              REAL ESTATE CRM
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
