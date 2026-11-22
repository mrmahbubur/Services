import React from 'react';
import { useApp } from '../context/AppContext';

export type BrandLogoVariant = 'full' | 'dark' | 'light' | 'icon' | 'mono';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const iconSizeMap = {
    sm: 32,
    md: 36,
    lg: 44,
    xl: 48,
  };

  const fullHeightMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
  };

  if (variant === 'icon') {
    const dim = iconSizeMap[size];
    return (
      <img
        src="/brand/icons/mrs_icon_v1.svg"
        alt="M R S"
        width={dim}
        height={dim}
        style={{ width: dim, height: dim }}
        className={`shrink-0 object-contain select-none ${className}`}
      />
    );
  }

  let src = isDark ? '/brand/logo/mrs_logo_dark_v1.svg' : '/brand/logo/mrs_logo_light_v1.svg';
  if (variant === 'dark') src = '/brand/logo/mrs_logo_dark_v1.svg';
  if (variant === 'light') src = '/brand/logo/mrs_logo_light_v1.svg';
  if (variant === 'mono') {
    src = isDark ? '/brand/logo/mrs_logo_mono_white_v1.svg' : '/brand/logo/mrs_logo_mono_black_v1.svg';
  }

  const h = fullHeightMap[size];

  return (
    <img
      src={src}
      alt="M R S — Professional Automation & Digital Services"
      height={h}
      style={{ height: h, width: 'auto' }}
      className={`shrink-0 object-contain select-none ${className}`}
    />
  );
};
