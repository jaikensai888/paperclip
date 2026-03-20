import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const cycleLanguage = () => {
    const currentIndex = languages.findIndex((l) => l.code === i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex].code);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycleLanguage}
      className="w-full justify-center gap-2 font-medium"
    >
      <Globe className="h-4 w-4 shrink-0" />
      <span>{currentLang.name}</span>
    </Button>
  );
}
