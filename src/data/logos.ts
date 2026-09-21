import type {
  BrandKey,
  LogoVariant,
} from '../types/studio'

export const LOGO_LIBRARY: Record<
  BrandKey,
  {
    name: string
    variants: LogoVariant[]
  }
> = {
  nikon: {
    name: 'Nikon',
    variants: [
      {
        id: 'standard',
        name: 'Standard',
        primary: 'Nikon',
        assetPath:
          '/logos/nikon/standard.svg',
        baseWidth: 82,
      },
      {
        id: '100th',
        name: '100th Anniversary',
        primary: 'Nikon',
        secondary: '100th ANNIVERSARY',
        assetPath:
          '/logos/nikon/100th.svg',
        baseWidth: 118,
        invertOnDark: true,
        filmTintable: true,
      },
      {
        id: 'z',
        name: 'Z Series',
        primary: 'Z',
        assetPath: '/logos/nikon/z.svg',
        baseWidth: 88,
        invertOnDark: true,
        filmTintable: true,
      },
    ],
  },

  canon: {
    name: 'Canon',
    variants: [
      {
        id: 'standard',
        name: 'Standard',
        primary: 'Canon',
      },
      {
        id: 'eos',
        name: 'EOS',
        primary: 'EOS',
      },
    ],
  },

  sony: {
    name: 'Sony',
    variants: [
      {
        id: 'standard',
        name: 'Standard',
        primary: 'SONY',
      },
      {
        id: 'alpha',
        name: 'Alpha',
        primary: 'α',
      },
    ],
  },

  fujifilm: {
    name: 'Fujifilm',
    variants: [
      {
        id: 'standard',
        name: 'Standard',
        primary: 'FUJIFILM',
      },
      {
        id: 'x',
        name: 'X Series',
        primary: 'X',
      },
    ],
  },
}
