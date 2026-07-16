import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface CardToolProps {
  title: string;
  description: string;
  href: string;
  icon?: React.ReactNode;
  premium?: boolean;
  active?: boolean;
  comingSoon?: boolean;
  changelog?: string;
}

export default function CardTool({ title, description, href, icon, premium, active, comingSoon, changelog }: CardToolProps) {
  const { t } = useTranslation();
  const Wrapper = comingSoon ? 'div' : Link;

  return (
    <Wrapper href={comingSoon ? '#' : href} className={`block group ${comingSoon ? 'cursor-default' : ''}`}>
      <div className={`premium-card h-full flex flex-col relative overflow-hidden ${premium && !comingSoon ? 'border-drapera-gold/20' : ''} ${comingSoon ? 'opacity-50' : ''}`}>
        {premium && !comingSoon && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-drapera-gold bg-drapera-gold/10 px-2 py-1 rounded-md">{t('cardtool.premium')}</span>
          </div>
        )}
        {comingSoon && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-drapera-steel-light bg-drapera-border/50 px-2 py-1 rounded-md">{t('cardtool.coming_soon')}</span>
          </div>
        )}

        {!comingSoon && active && (
          <div className="absolute top-3 left-3">
            <span className="w-2 h-2 rounded-full bg-green-500 block shadow-lg shadow-green-500/50" />
          </div>
        )}

        <div className="flex items-start gap-4 mb-4">
          {icon && (
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
              comingSoon ? 'bg-drapera-border/20 border-drapera-border/30' : 'bg-drapera-gold/10 border-drapera-gold/20 group-hover:bg-drapera-gold/20'
            }`}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className={`font-display font-bold text-lg truncate transition-colors ${comingSoon ? 'text-gray-600' : 'text-white group-hover:text-drapera-gold'}`}>
              {title}
            </h3>
            <p className="text-sm text-drapera-steel-light mt-1 line-clamp-2">{description}</p>
          </div>
        </div>

        {!comingSoon && (
          <div className="mt-auto pt-4 flex items-center gap-3">
            <span className="flex items-center text-sm text-drapera-gold font-medium group/link">
              <span>{t('cardtool.start')}</span>
              <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
            {changelog && (
              <Link href={changelog} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors underline decoration-dotted underline-offset-2">
                Changelog
              </Link>
            )}
          </div>
        )}

        {comingSoon && (
          <div className="mt-auto pt-4 flex items-center text-sm text-gray-600 font-medium">
            <span>{t('cardtool.coming_soon')}</span>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
