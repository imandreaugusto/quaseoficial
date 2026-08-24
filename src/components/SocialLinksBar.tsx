import React from 'react';

// Official Social Links for Brazilian in Action
export const SOCIAL_LINKS = {
  youtube: 'https://www.youtube.com/@brazilianinaction',
  tiktok: 'https://www.tiktok.com/@brazilianinaction',
  instagram: 'https://www.instagram.com/brazilianinaction',
  whatsapp: 'https://whatsapp.com/channel/0029Vb8DViVLdQef42OGsV1m'
};

// Custom SVG Icons with crisp styling & colors
export const YouTubeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="YouTube"
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const TikTokIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="TikTok"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

export const InstagramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="Instagram"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="WhatsApp"
  >
    <path d="M17.472 14.382c-.301-.15-1.776-.876-2.052-.976-.275-.1-.476-.15-.676.15-.2.3-.777.976-.952 1.176-.176.2-.351.226-.652.075-.3-.15-1.267-.467-2.414-1.489-.893-.796-1.496-1.78-1.671-2.08-.175-.3-.019-.462.13-.612.136-.134.301-.35.452-.525.15-.175.2-.3.301-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.628-.927-2.23-.244-.585-.492-.505-.676-.514-.176-.008-.376-.01-.576-.01-.2 0-.526.075-.802.375-.275.3-1.052 1.028-1.052 2.507 0 1.478 1.077 2.906 1.228 3.106.15.2 2.12 3.237 5.137 4.54.717.31 1.277.495 1.713.633.72.23 1.376.197 1.895.12.578-.087 1.776-.726 2.026-1.428.25-.701.25-1.302.175-1.428-.075-.125-.276-.2-.577-.35zm-5.451 7.424h-.005a9.866 9.866 0 0 1-5.031-1.378l-.361-.214-3.741.982 1-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.887 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.02 0C5.379 0 .002 5.38.002 12.022a11.796 11.796 0 0 0 1.602 5.962L0 24l6.185-1.622a11.83 11.83 0 0 0 5.835 1.528h.005c6.64 0 12.018-5.379 12.02-12.021a11.78 11.78 0 0 0-3.612-8.484z" />
  </svg>
);

interface SocialLinksBarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SocialLinksBar: React.FC<SocialLinksBarProps> = ({
  size = 'md',
  className = ''
}) => {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;
  const buttonPadding = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-11 h-11' : 'w-10 h-10';

  const socialItems = [
    {
      id: 'youtube',
      url: SOCIAL_LINKS.youtube,
      icon: YouTubeIcon,
      hoverClass: 'hover:text-white hover:bg-red-600 hover:border-red-500 hover:shadow-[0_0_18px_rgba(239,68,68,0.6)] text-red-400 border-red-500/30 bg-black/40',
      label: 'YouTube Oficial'
    },
    {
      id: 'tiktok',
      url: SOCIAL_LINKS.tiktok,
      icon: TikTokIcon,
      hoverClass: 'hover:text-black hover:bg-cyan-400 hover:border-cyan-300 hover:shadow-[0_0_18px_rgba(34,211,238,0.6)] text-cyan-400 border-cyan-500/30 bg-black/40',
      label: 'TikTok Oficial'
    },
    {
      id: 'instagram',
      url: SOCIAL_LINKS.instagram,
      icon: InstagramIcon,
      hoverClass: 'hover:text-white hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-600 hover:to-purple-600 hover:border-pink-400 hover:shadow-[0_0_18px_rgba(244,114,182,0.6)] text-pink-400 border-pink-500/30 bg-black/40',
      label: 'Instagram Oficial'
    },
    {
      id: 'whatsapp',
      url: SOCIAL_LINKS.whatsapp,
      icon: WhatsAppIcon,
      hoverClass: 'hover:text-white hover:bg-emerald-600 hover:border-emerald-400 hover:shadow-[0_0_18px_rgba(52,211,153,0.6)] text-emerald-400 border-emerald-500/30 bg-black/40',
      label: 'Canal VIP WhatsApp'
    }
  ];

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 ${className}`}>
      {socialItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={item.label}
            aria-label={item.label}
            className={`${buttonPadding} rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-center backdrop-blur-md shadow-lg hover:scale-110 active:scale-95 ${item.hoverClass}`}
          >
            <IconComponent size={iconSize} />
          </a>
        );
      })}
    </div>
  );
};
