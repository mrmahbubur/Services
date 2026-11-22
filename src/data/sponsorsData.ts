export interface SponsorAdItem {
  id: string;
  title: string;
  category: string;
  description: string;
  ctaLabel: string;
  url: string;
  placement: 'free_tools' | 'about' | 'footer';
}

export const SPONSOR_SUPPORT_LINKS: SponsorAdItem[] = [
  {
    id: 'SP-01',
    title: 'Developer Cloud & Hosting Offers',
    category: 'Infrastructure Sponsor',
    description: 'Featured partner offers that fund free community DNS & TLS diagnostics.',
    ctaLabel: 'Visit Sponsor',
    url: 'https://uplcm.com/4/11226634',
    placement: 'free_tools',
  },
  {
    id: 'SP-02',
    title: 'Career & Resume Partner Portal',
    category: 'Career Support',
    description: 'Partner career resources supporting our free ATS CV keyword scanner.',
    ctaLabel: 'Explore Offer',
    url: 'https://uplcm.com/4/11683565',
    placement: 'free_tools',
  },
  {
    id: 'SP-03',
    title: 'AI Workflow & SaaS Directory',
    category: 'Productivity Partner',
    description: 'Recommended productivity utilities helping sustain free AI proofreading runs.',
    ctaLabel: 'Open Partner',
    url: 'https://uplcm.com/4/11242745',
    placement: 'free_tools',
  },
  {
    id: 'SP-04',
    title: 'Community Free Support Spotlight',
    category: 'Community Support',
    description: 'Official M R S Free Support link verified on our Gravatar hub.',
    ctaLabel: 'Support Free Tools',
    url: 'https://uplcm.com/4/11242069',
    placement: 'about',
  },
  {
    id: 'SP-05',
    title: 'Technical Writing & Learning Support',
    category: 'Community Support',
    description: 'Verified community support link sustaining free M R S guides & checkers.',
    ctaLabel: 'Support Free Guides',
    url: 'https://uplcm.com/4/11242067',
    placement: 'about',
  },
  {
    id: 'SP-06',
    title: 'Remote IT & Admin Toolkit',
    category: 'IT Utilities',
    description: 'Sponsored software & remote troubleshooting partner resources.',
    ctaLabel: 'View Partner',
    url: 'https://uplcm.com/4/11242742',
    placement: 'free_tools',
  },
  {
    id: 'SP-07',
    title: 'Digital Creator & Media Partner',
    category: 'Media Support',
    description: 'Recommended creator & streaming setup utilities.',
    ctaLabel: 'Check Partner',
    url: 'https://uplcm.com/4/11230440',
    placement: 'about',
  },
  {
    id: 'SP-08',
    title: 'Domain & Web Operations Partner',
    category: 'Web Hosting',
    description: 'Partner domain & WordPress maintenance offers.',
    ctaLabel: 'Visit Offer',
    url: 'https://uplcm.com/4/11683560',
    placement: 'footer',
  },
  {
    id: 'SP-09',
    title: 'Global Remote Productivity Sponsor',
    category: 'Partner Network',
    description: 'Featured sponsor supporting free developer and admin tools.',
    ctaLabel: 'Explore Sponsor',
    url: 'https://uplcm.com/4/9912130',
    placement: 'footer',
  },
  {
    id: 'SP-10',
    title: 'M R S Open Utilities Supporter',
    category: 'Sponsor Link',
    description: 'Keep M R S public diagnostics 100% free with partner visits.',
    ctaLabel: 'Support M R S',
    url: 'https://uplcm.com/4/11242744',
    placement: 'footer',
  },
];
